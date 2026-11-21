"""Container "service-control" (várias réplicas): o Service Control do Google.

Ao iniciar, carrega as políticas do banco (com a estratégia de nova tentativa
da variável ESTRATEGIA). Depois responde /check para o cliente e confere a
versão das políticas a cada segundo; se mudou, recarrega e aplica.

A política com o campo de quota em branco faz `politica["quota"]["por_minuto"]`
estourar um TypeError, o equivalente em Python ao null pointer do incidente.
O processo morre e o supervisor.py o reinicia imediatamente.
"""

import json
import os
import socket
import threading
import time
import urllib.request
from collections import Counter
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from comum import Log, espera_antes_de_tentar

BANCO = os.environ.get("BANCO_URL", "http://banco:8000")
ESTRATEGIA = os.environ.get("ESTRATEGIA", "sem_backoff")
TIMEOUT_CARGA_S = float(os.environ.get("TIMEOUT_CARGA_S", "0.5"))
REPLICA = socket.gethostname()

log = Log(f"service-control-{REPLICA}")
estado = {"pronta": False, "versao": None, "limite_por_minuto": None}
tentativas = Counter()  # resumido por segundo para não gerar milhares de linhas de log
trava = threading.Lock()


def pedir(metodo: str, rota: str, timeout_s: float) -> dict:
    requisicao = urllib.request.Request(
        BANCO + rota, method=metodo, headers={"X-Prazo": str(time.time() + timeout_s)}
    )
    with urllib.request.urlopen(requisicao, timeout=timeout_s) as resposta:
        return json.load(resposta)


def contar(chave: str) -> None:
    with trava:
        tentativas[chave] += 1


def carregar_politicas() -> dict:
    """Insiste até conseguir carregar, esperando conforme a ESTRATEGIA."""
    inicio, tentativa = time.time(), 0
    while True:
        contar("carga_tentada")
        try:
            dados = pedir("POST", "/carregar", TIMEOUT_CARGA_S)
            log("carga_ok", tentativas=tentativa + 1, duracao_s=round(time.time() - inicio, 3),
                versao=dados["versao"])
            return dados
        except Exception as erro:  # timeout, 503 do banco, conexão recusada
            contar(f"carga_falhou:{type(erro).__name__}")
            time.sleep(espera_antes_de_tentar(ESTRATEGIA, tentativa))
            tentativa += 1


def aplicar(dados: dict) -> None:
    politica = dados["politica"]
    if politica["verificacao_quota_ativa"]:
        limite = politica["quota"]["por_minuto"]  # quota em branco (None) -> TypeError
    else:
        limite = None  # red-button: caminho de código desligado
    estado.update(pronta=True, versao=dados["versao"], limite_por_minuto=limite)


class Check(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def do_GET(self):
        status = 200 if estado["pronta"] else 503
        corpo = json.dumps({"replica": REPLICA, "pronta": estado["pronta"]}).encode()
        try:
            self.send_response(status)
            self.send_header("Content-Length", str(len(corpo)))
            self.end_headers()
            self.wfile.write(corpo)
        except (BrokenPipeError, ConnectionResetError):
            pass


def resumir_tentativas() -> None:
    while True:
        time.sleep(1)
        with trava:
            retrato = dict(tentativas)
            tentativas.clear()
        if retrato:
            log("tentativas_no_segundo", **retrato)


def principal() -> None:
    ThreadingHTTPServer.daemon_threads = True
    servidor = ThreadingHTTPServer(("0.0.0.0", 8080), Check)
    threading.Thread(target=servidor.serve_forever, daemon=True).start()
    threading.Thread(target=resumir_tentativas, daemon=True).start()
    log("processo_iniciado", estrategia=ESTRATEGIA)

    aplicar(carregar_politicas())
    log("pronta", versao=estado["versao"])
    while True:
        time.sleep(1)
        try:
            versao = pedir("GET", "/versao", TIMEOUT_CARGA_S)["versao"]
        except Exception as erro:
            contar(f"versao_falhou:{type(erro).__name__}")
            continue
        if versao != estado["versao"]:
            aplicar(carregar_politicas())
            log("politica_aplicada", versao=estado["versao"])


if __name__ == "__main__":
    try:
        principal()
    except Exception as erro:
        log("crash", erro=f"{type(erro).__name__}: {erro}")
        raise
