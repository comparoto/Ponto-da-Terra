"""Peças compartilhadas pelos três containers: log em JSON Lines e estratégias de nova tentativa."""

import atexit
import json
import os
import queue
import random
import threading
import time
from pathlib import Path

RODADA = os.environ.get("RODADA", "manual")
PASTA_LOG = Path("/logs") / RODADA
PASTA_LOG.mkdir(parents=True, exist_ok=True)


class Log:
    """Arquivo .jsonl só de acréscimo; cada linha leva o horário em epoch (segundos).

    A escrita é ASSÍNCRONA: quem registra só põe a linha numa fila e segue em frente;
    uma thread separada grava no disco. Numa versão anterior a escrita era síncrona e,
    como /logs é uma pasta do Windows compartilhada com o Docker (lenta em rajadas),
    o cliente chegava a ficar 9 s parado esperando o disco, sem enviar requisições.
    """

    def __init__(self, nome: str):
        self.caminho = PASTA_LOG / f"{nome}.jsonl"
        self._fila: queue.Queue = queue.Queue()
        self._escritor = threading.Thread(target=self._escrever, daemon=True)
        self._escritor.start()
        atexit.register(self.fechar)

    def __call__(self, evento: str, **campos) -> None:
        self._fila.put(json.dumps({"t": round(time.time(), 4), "evento": evento, **campos}, ensure_ascii=False))

    def _escrever(self) -> None:
        while True:
            linhas = [self._fila.get()]
            while not self._fila.empty():
                linhas.append(self._fila.get_nowait())
            fim = None in linhas
            linhas = [l for l in linhas if l is not None]
            if linhas:
                with self.caminho.open("a", encoding="utf-8") as saida:
                    saida.write("\n".join(linhas) + "\n")
            if fim:
                return

    def fechar(self) -> None:
        """Grava o que ainda está na fila (chamado na saída do processo)."""
        if self._escritor.is_alive():
            self._fila.put(None)
            self._escritor.join(timeout=10)


# ---------------------------------------------------------------- nova tentativa
# sem_backoff         -> tenta de novo na hora (o que o Service Control fazia)
# exponencial         -> 0,1 s, 0,2 s, 0,4 s... igual para todas as réplicas
#                        (mesma forma do backend/src/worker.ts do Ponto da Terra)
# exponencial_jitter  -> sorteia entre 0 e o valor exponencial ("full jitter"),
#                        a mitigação recomendada pelo próprio Google

BASE_S = float(os.environ.get("BACKOFF_BASE_S", "0.1"))
TETO_S = float(os.environ.get("BACKOFF_TETO_S", "5"))


def espera_antes_de_tentar(estrategia: str, tentativa: int) -> float:
    if estrategia == "sem_backoff":
        return 0.0
    atraso = min(TETO_S, BASE_S * 2 ** tentativa)
    if estrategia == "exponencial":
        return atraso
    if estrategia == "exponencial_jitter":
        return random.uniform(0, atraso)
    raise ValueError(f"estratégia desconhecida: {estrategia}")
