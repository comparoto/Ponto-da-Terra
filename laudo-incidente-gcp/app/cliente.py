"""Container "cliente": os clientes da API do Google + o operador do experimento.

1. Espera todas as réplicas do service-control ficarem prontas.
2. Manda TAXA_RPS requisições por segundo, distribuídas entre as réplicas.
3. Linha do tempo:
   t = AQUECIMENTO_S                     -> insere a política com campo em branco
   t = AQUECIMENTO_S + ATE_RED_BUTTON_S  -> aciona o red-button
   t = ... + OBSERVAR_S                  -> encerra e calcula as métricas (analisar.py)
"""

import json
import os
import socket
import threading
import time
import urllib.error
import urllib.request

import analisar
from comum import PASTA_LOG, Log

BANCO = os.environ.get("BANCO_URL", "http://banco:8000")
REPLICAS_ESPERADAS = int(os.environ.get("REPLICAS", "12"))
TAXA_RPS = float(os.environ.get("TAXA_RPS", "40"))
TIMEOUT_S = float(os.environ.get("TIMEOUT_CLIENTE_S", "1"))
AQUECIMENTO_S = float(os.environ.get("AQUECIMENTO_S", "10"))
ATE_RED_BUTTON_S = float(os.environ.get("ATE_RED_BUTTON_S", "15"))
OBSERVAR_S = float(os.environ.get("OBSERVAR_S", "60"))

log = Log("cliente")


def descobrir_replicas() -> list[str]:
    """O DNS do Docker devolve um IP por réplica do serviço service-control."""
    return sorted({info[4][0] for info in socket.getaddrinfo("service-control", 8080, proto=socket.IPPROTO_TCP)})


def checar(ip: str) -> tuple[str, float]:
    inicio = time.time()
    try:
        with urllib.request.urlopen(f"http://{ip}:8080/check", timeout=TIMEOUT_S) as resposta:
            status = str(resposta.status)
    except urllib.error.HTTPError as erro:
        status = str(erro.code)
    except (ConnectionRefusedError, ConnectionResetError):
        status = "conexao_recusada"
    except urllib.error.URLError as erro:
        status = "conexao_recusada" if isinstance(erro.reason, ConnectionRefusedError) else "timeout"
    except (TimeoutError, socket.timeout):
        status = "timeout"
    return status, round((time.time() - inicio) * 1000, 1)


def esperar_replicas() -> list[str]:
    limite = time.time() + 120
    while time.time() < limite:
        try:
            ips = descobrir_replicas()
        except socket.gaierror:
            ips = []
        prontas = [ip for ip in ips if checar(ip)[0] == "200"]
        if len(prontas) >= REPLICAS_ESPERADAS:
            return prontas
        time.sleep(1)
    raise SystemExit(f"só {len(prontas)} de {REPLICAS_ESPERADAS} réplicas ficaram prontas")


def requisicao(ip: str) -> None:
    inicio = time.time()
    status, ms = checar(ip)
    log("req", t_envio=round(inicio, 4), replica=ip, status=status, ms=ms)


def admin(rota: str, nome: str) -> None:
    """Ação do operador. Roda em thread própria para NÃO parar o tráfego enquanto espera
    (numa versão anterior ela bloqueava o laço de envio por vários segundos)."""
    inicio = time.time()
    try:
        urllib.request.urlopen(urllib.request.Request(BANCO + rota, method="POST"), timeout=30).read()
        log(f"{nome}_confirmado", espera_s=round(time.time() - inicio, 3))
    except Exception as erro:
        log(f"{nome}_falhou", erro=f"{type(erro).__name__}: {erro}")


def main() -> None:
    replicas = esperar_replicas()
    log("experimento_iniciado", replicas=len(replicas), taxa_rps=TAXA_RPS,
        estrategia=os.environ.get("ESTRATEGIA"),
        duracao_planejada_s=AQUECIMENTO_S + ATE_RED_BUTTON_S + OBSERVAR_S)

    marcos = [
        (AQUECIMENTO_S, "/admin/politica-com-campo-vazio", "falha_injetada"),
        (AQUECIMENTO_S + ATE_RED_BUTTON_S, "/admin/red-button", "red_button"),
    ]
    inicio = time.time()
    fim = inicio + AQUECIMENTO_S + ATE_RED_BUTTON_S + OBSERVAR_S
    intervalo, n = 1 / TAXA_RPS, 0
    while time.time() < fim:
        agora = time.time() - inicio
        while marcos and agora >= marcos[0][0]:
            _, rota, nome = marcos.pop(0)
            log(nome)
            threading.Thread(target=admin, args=(rota, nome), daemon=True).start()
        threading.Thread(target=requisicao, args=(replicas[n % len(replicas)],), daemon=True).start()
        n += 1
        time.sleep(max(0.0, inicio + n * intervalo - time.time()))

    time.sleep(TIMEOUT_S + 0.5)  # deixa as últimas requisições terminarem
    log("experimento_encerrado", requisicoes=n)
    log.fechar()  # o log é assíncrono: grava tudo antes de analisar
    esperar_log_do_banco(ate=fim + 1)
    analisar.analisar(PASTA_LOG)


def esperar_log_do_banco(ate: float, limite_s: float = 30) -> None:
    """O banco também grava o log de forma assíncrona; espera ele cobrir o fim do experimento."""
    arquivo, prazo = PASTA_LOG / "banco.jsonl", time.time() + limite_s
    while time.time() < prazo:
        try:
            with arquivo.open("rb") as entrada:
                entrada.seek(max(0, arquivo.stat().st_size - 400))
                ultima = entrada.read().decode("utf-8", "ignore").strip().splitlines()[-1]
            if json.loads(ultima)["t"] >= ate:
                return
        except (OSError, ValueError, IndexError, KeyError):
            pass
        time.sleep(0.5)


if __name__ == "__main__":
    main()
