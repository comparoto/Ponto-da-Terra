"""Container "banco": faz o papel da tabela de políticas no Spanner regional.

- Capacidade limitada: VAGAS consultas em paralelo; cada carga de políticas
  custa CUSTO_CARGA_S segundos. O excesso espera numa fila de até FILA_MAX.
- Fila cheia -> 503 imediato ("sobrecarregado").
- Cada pedido traz X-Prazo (epoch em que o cliente desiste). Se o banco só
  termina depois do prazo, o trabalho foi DESPERDIÇADO: ninguém mais espera
  a resposta. É esse desperdício que prende o sistema no efeito manada.
- Rotas /admin/* são o caminho do operador e não passam pela fila.
"""

import json
import os
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from comum import Log

VAGAS = int(os.environ.get("BANCO_VAGAS", "2"))
CUSTO_CARGA_S = float(os.environ.get("BANCO_CUSTO_CARGA_S", "0.1"))
CUSTO_VERSAO_S = float(os.environ.get("BANCO_CUSTO_VERSAO_S", "0.005"))
FILA_MAX = int(os.environ.get("BANCO_FILA_MAX", "100"))

log = Log("banco")
vagas = threading.BoundedSemaphore(VAGAS)
trava = threading.Lock()
estado = {
    "versao": 1,
    "politica": {"id": "quota-padrao", "quota": {"por_minuto": 600}, "verificacao_quota_ativa": True},
}
contadores = {"recebidas": 0, "atendidas": 0, "desperdicadas": 0, "rejeitadas": 0, "fila_max": 0}
em_fila = 0


def somar(chave: str, valor: int = 1) -> None:
    with trava:
        contadores[chave] += valor


def consultar(custo_s: float, prazo: float) -> str:
    """Passa pela fila e pelas vagas. Devolve 'ok', 'desperdicada' ou 'rejeitada'."""
    global em_fila
    with trava:
        contadores["recebidas"] += 1
        if em_fila >= FILA_MAX:
            contadores["rejeitadas"] += 1
            return "rejeitada"
        em_fila += 1
        contadores["fila_max"] = max(contadores["fila_max"], em_fila)
    with vagas:
        with trava:
            em_fila -= 1
        time.sleep(custo_s)  # o trabalho é feito mesmo que o cliente já tenha ido embora
    if time.time() > prazo:
        somar("desperdicadas")
        return "desperdicada"
    somar("atendidas")
    return "ok"


class Banco(BaseHTTPRequestHandler):
    def log_message(self, *args):  # silencia o log padrão do http.server
        pass

    def responder(self, status: int, corpo: dict) -> None:
        dados = json.dumps(corpo).encode()
        try:
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(dados)))
            self.end_headers()
            self.wfile.write(dados)
        except (BrokenPipeError, ConnectionResetError):
            pass  # o cliente desistiu antes: nada a fazer

    def operacao(self, custo_s: float, corpo_ok) -> None:
        prazo = float(self.headers.get("X-Prazo", time.time() + 60))
        resultado = consultar(custo_s, prazo)
        if resultado == "rejeitada":
            self.responder(503, {"erro": "banco sobrecarregado"})
        else:
            self.responder(200, corpo_ok())

    def do_GET(self):
        if self.path == "/versao":
            self.operacao(CUSTO_VERSAO_S, lambda: {"versao": estado["versao"]})
        elif self.path == "/saude":
            self.responder(200, {"ok": True})
        else:
            self.responder(404, {"erro": "rota inexistente"})

    def do_POST(self):
        if self.path == "/carregar":
            self.operacao(CUSTO_CARGA_S, lambda: dict(estado))
        elif self.path == "/admin/politica-com-campo-vazio":
            # Replica para todas as "regiões" uma política com o campo de quota em branco.
            with trava:
                estado["versao"] += 1
                estado["politica"] = {"id": "quota-nova", "quota": None, "verificacao_quota_ativa": True}
            log("politica_com_campo_vazio_inserida", versao=estado["versao"])
            self.responder(200, {"versao": estado["versao"]})
        elif self.path == "/admin/red-button":
            # Desliga o caminho de código que lê a quota (o "red-button" do Google).
            with trava:
                estado["versao"] += 1
                estado["politica"] = dict(estado["politica"], verificacao_quota_ativa=False)
            log("red_button_acionado", versao=estado["versao"])
            self.responder(200, {"versao": estado["versao"]})
        else:
            self.responder(404, {"erro": "rota inexistente"})


def medir_por_segundo() -> None:
    while True:
        time.sleep(1)
        with trava:
            retrato = dict(contadores, em_fila=em_fila)
            for chave in contadores:
                contadores[chave] = 0
        log("segundo", **retrato)


if __name__ == "__main__":
    ThreadingHTTPServer.request_queue_size = 1024
    ThreadingHTTPServer.daemon_threads = True
    servidor = ThreadingHTTPServer(("0.0.0.0", 8000), Banco)
    threading.Thread(target=medir_por_segundo, daemon=True).start()
    log("banco_iniciado", vagas=VAGAS, custo_carga_s=CUSTO_CARGA_S, fila_max=FILA_MAX)
    servidor.serve_forever()
