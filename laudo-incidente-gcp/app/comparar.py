"""Junta os resumo.json de todas as rodadas em logs/comparacao.md.

Uso: docker compose run --rm --no-deps cliente python comparar.py
"""

import json
from collections import defaultdict
from pathlib import Path
from statistics import mean

PASTA = Path("/logs")
ORDEM = ["sem_backoff", "exponencial", "exponencial_jitter"]


def fmt(valor, sufixo=""):
    return "—" if valor is None else f"{valor}{sufixo}"


def recuperacao(r):
    if r["recuperou"]:
        return f"{r['tempo_ate_recuperacao_s']} s"
    return f"não recuperou (> {r['janela_observada_apos_red_button_s']} s)"


def main():
    rodadas = [json.loads(p.read_text(encoding="utf-8")) for p in sorted(PASTA.glob("*/resumo.json"))]
    rodadas.sort(key=lambda r: (ORDEM.index(r["estrategia"]) if r["estrategia"] in ORDEM else 99, r["rodada"]))

    linhas = [
        "# Comparação das rodadas",
        "",
        "Gerado por `app/comparar.py` a partir de `logs/<rodada>/resumo.json`; cada resumo é calculado",
        "por `app/analisar.py` sobre `cliente.jsonl`, `banco.jsonl` e `service-control-*.jsonl` da mesma pasta.",
        "",
        "## Por rodada",
        "",
        "Rodadas marcadas como inválidas (o cliente ficou mais de 1 s sem enviar requisições) aparecem",
        "na tabela, mas ficam fora das médias. As que os scripts refizeram estão em `logs/_invalidas/`.",
        "",
        "| Rodada | Válida | Estratégia | Tempo até a falha | Tempo até a recuperação | % erro total | % erro após o red-button | Banco: pedidos desperdiçados após o botão | Banco: rejeitados (503) após o botão |",
        "|---|---|---|---|---|---|---|---|---|",
    ]
    for r in rodadas:
        b = r["banco_apos_red_button"]
        linhas.append(
            f"| `{r['rodada']}` | {'sim' if r.get('valida', True) else 'NÃO (pausa de ' + str(r['maior_pausa_no_envio_s']) + ' s)'} | {r['estrategia']} | {fmt(r['tempo_ate_falha_s'], ' s')} | {recuperacao(r)} | "
            f"{fmt(r['erro_pct_total'], '%')} | {fmt(r['erro_pct_por_fase'].get('pos_red_button'), '%')} | "
            f"{b['desperdicadas']} | {b['rejeitadas_503']} |"
        )

    # Rodadas com custo de carga diferente (ex.: calibração) ficam em grupos separados.
    grupos = defaultdict(list)
    for r in rodadas:
        if r.get("valida", True):
            grupos[(r["estrategia"], r.get("banco_custo_carga_s"))].append(r)
    linhas += [
        "",
        "## Média por estratégia (e custo de carga do banco), só rodadas válidas",
        "",
        "| Estratégia | Custo da carga no banco | Rodadas | Recuperou | Tempo até a recuperação (média das que recuperaram) | % erro após o red-button (média) | % erro total (média) |",
        "|---|---|---|---|---|---|---|",
    ]
    for (estrategia, custo), grupo in grupos.items():
        recuperaram = [r["tempo_ate_recuperacao_s"] for r in grupo if r["recuperou"]]
        linhas.append(
            f"| {estrategia} | {fmt(custo, ' s')} | {len(grupo)} | {len(recuperaram)} de {len(grupo)} | "
            f"{fmt(round(mean(recuperaram), 1) if recuperaram else None, ' s')} | "
            f"{round(mean(r['erro_pct_por_fase']['pos_red_button'] for r in grupo), 2)}% | "
            f"{round(mean(r['erro_pct_total'] for r in grupo), 2)}% |"
        )

    texto = "\n".join(linhas) + "\n"
    (PASTA / "comparacao.md").write_text(texto, encoding="utf-8")
    print(texto)


if __name__ == "__main__":
    main()
