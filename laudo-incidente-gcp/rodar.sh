#!/usr/bin/env bash
# Roda os 3 cenários (REPETICOES vezes cada) e gera logs/comparacao.md.
# Uso: ./rodar.sh                 (3 repetições, ~20 min)
#      ./rodar.sh 1               (1 repetição, ~7 min)
#      ./rodar.sh 1 sem_backoff   (só um cenário)
# Rodada inválida (cliente parado por > 1 s ou menos de 97% das requisições planejadas) é movida
# para logs/_invalidas/ e refeita (até 3 tentativas).
set -uo pipefail
cd "$(dirname "$0")"

REPETICOES="${1:-3}"
CENARIOS="${2:-sem_backoff exponencial exponencial_jitter}"

rodada() {
  local nome="$1" estrategia="$2"
  for tentativa in 1 2 3; do
    echo "=== rodada ${nome} (tentativa ${tentativa}) ==="
    rm -rf "logs/${nome}"
    RODADA="$nome" ESTRATEGIA="$estrategia" \
      docker compose up --abort-on-container-exit --exit-code-from cliente --no-log-prefix cliente banco service-control 2>/dev/null \
      | grep -E "Rodada|tempo|de erro|plicas prontas|crashes|banco ap" || true
    docker compose down -t 1 > /dev/null 2>&1
    grep -q '"valida": true' "logs/${nome}/resumo.json" 2>/dev/null && return
    mkdir -p logs/_invalidas
    rm -rf "logs/_invalidas/${nome}-tentativa${tentativa}"
    mv "logs/${nome}" "logs/_invalidas/${nome}-tentativa${tentativa}"
    echo "    rodada inválida: movida para logs/_invalidas/ e refeita"
  done
}

for estrategia in $CENARIOS; do
  for rep in $(seq 1 "$REPETICOES"); do
    rodada "${estrategia}-r${rep}" "$estrategia"
  done
done

docker compose run --rm --no-deps cliente python comparar.py
docker compose down -t 1 > /dev/null 2>&1
