"""Reinicia o service_control.py sempre que ele morre, sem esperar nada.

Faz o papel do orquestrador que, no incidente, recolocava de pé as tarefas do
Service Control que entravam em crash loop.
"""

import os
import random
import socket
import subprocess
import sys
import time

from comum import Log

log = Log(f"service-control-{socket.gethostname()}")

# Só a PRIMEIRA partida é escalonada (deploy gradual), para o sistema estar
# estável antes do experimento. Os reinícios depois do crash são imediatos.
time.sleep(random.uniform(0, float(os.environ.get("ESCALONAR_PARTIDA_S", "8"))))

while True:
    processo = subprocess.run([sys.executable, "-u", "/app/service_control.py"])
    log("processo_reiniciado", codigo_saida=processo.returncode)
