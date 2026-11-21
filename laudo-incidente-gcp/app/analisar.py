"""Calcula as métricas de uma rodada a partir dos logs brutos da pasta logs/<rodada>/.

Gera, na mesma pasta:
  resumo.json / resumo.txt   -> métricas (cada uma diz de qual arquivo saiu)
  serie_por_segundo.csv      -> série usada no gráfico do laudo

Definições:
  tempo até a falha        = do momento em que o banco aplica a política com
                             campo em branco até o fim do primeiro segundo com
                             >= 50% de requisições com erro
  tempo até a recuperação  = do momento em que o banco aplica o red-button até o
                             início do primeiro trecho de 5 segundos seguidos com
                             <= 5% de erro
  (os dois instantes vêm do banco.jsonl; o atraso entre o pedido do operador
   e a aplicação no banco fica registrado em "atraso_do_operador")
  % de erro                = requisições sem HTTP 200 / total (timeout, 503 e
                             conexão recusada contam como erro)

Uso avulso: python analisar.py /logs/<rodada>
"""

import json
import math
import sys
from collections import defaultdict
from pathlib import Path

LIMIAR_FALHA = 0.50
LIMIAR_RECUPERADO = 0.05
JANELA_ESTAVEL_S = 5
# Rodada válida só se o cliente nunca ficou mais que isso sem enviar requisições
# e enviou pelo menos 97% das requisições planejadas.
# Pausas maiores vêm do ambiente (notebook suspenso, máquina sem memória) e
# distorcem a % de erro e os tempos; a rodada é marcada e fica fora das médias.
PAUSA_MAXIMA_S = 1.0


def ler(arquivo: Path) -> list[dict]:
    if not arquivo.exists():
        return []
    with arquivo.open(encoding="utf-8") as entrada:
        return [json.loads(linha) for linha in entrada if linha.strip()]


def pct(parte: int, total: int) -> float | None:
    return round(100 * parte / total, 2) if total else None


def analisar(pasta: Path) -> dict:
    pasta = Path(pasta)
    cliente = ler(pasta / "cliente.jsonl")
    banco = ler(pasta / "banco.jsonl")
    replicas = {arq.name: ler(arq) for arq in sorted(pasta.glob("service-control-*.jsonl"))}

    marco = {l["evento"]: l["t"] for l in cliente if l["evento"] in
             ("experimento_iniciado", "falha_injetada", "red_button", "experimento_encerrado")}
    # Horários EFETIVOS: quando o banco aplicou a política e o red-button (banco.jsonl),
    # e não quando o operador pediu (o pedido pode demorar a chegar).
    efetivo = {l["evento"]: l["t"] for l in banco if l["evento"] in
               ("politica_com_campo_vazio_inserida", "red_button_acionado")}
    t_inj = efetivo.get("politica_com_campo_vazio_inserida", marco["falha_injetada"])
    t_red = efetivo.get("red_button_acionado", marco["red_button"])
    atraso_operador = {"injecao_s": round(t_inj - marco["falha_injetada"], 3),
                       "red_button_s": round(t_red - marco["red_button"], 3)}
    reqs = [l for l in cliente if l["evento"] == "req"]

    # série por segundo, com o segundo 0 = instante da injeção
    por_seg = defaultdict(lambda: {"req": 0, "erros": 0})
    for r in reqs:
        seg = math.floor(r["t_envio"] - t_inj)
        por_seg[seg]["req"] += 1
        por_seg[seg]["erros"] += r["status"] != "200"
    taxa = {s: v["erros"] / v["req"] for s, v in por_seg.items()}
    segundos = sorted(por_seg)

    seg_falha = next((s for s in segundos if s >= 0 and taxa[s] >= LIMIAR_FALHA), None)
    primeiro_erro = next((r["t_envio"] for r in sorted(reqs, key=lambda r: r["t_envio"])
                          if r["t_envio"] >= t_inj and r["status"] != "200"), None)

    seg_red = math.floor(t_red - t_inj)
    seg_rec = None
    for s in segundos:
        if s < seg_red:
            continue
        janela = [s + i for i in range(JANELA_ESTAVEL_S)]
        if all(j in taxa and taxa[j] <= LIMIAR_RECUPERADO for j in janela):
            seg_rec = s
            break
    observado_s = round(max(r["t_envio"] for r in reqs) - t_red, 1)

    def fase(r):
        return "antes" if r["t_envio"] < t_inj else ("falha" if r["t_envio"] < t_red else "pos_red_button")

    fases = defaultdict(lambda: [0, 0])
    status = defaultdict(int)
    for r in reqs:
        fases[fase(r)][0] += 1
        fases[fase(r)][1] += r["status"] != "200"
        status[r["status"]] += 1

    # Janela da análise: até a última requisição enviada. O banco e as réplicas
    # continuam gravando log até o `docker compose down`; sem esse corte, o
    # resultado mudaria conforme o momento em que a análise roda.
    t_fim = max(r["t_envio"] for r in reqs)
    banco_seg = [l for l in banco if l["evento"] == "segundo" and l["t"] - 1 < t_fim]

    def soma_banco(chave, desde, ate=t_fim):
        return sum(l[chave] for l in banco_seg if desde <= l["t"] - 1 < ate)

    crashes = sum(1 for linhas in replicas.values() for l in linhas
                  if l["evento"] == "crash" and l["t"] <= t_fim)
    tentativas_carga = sum(l.get("carga_tentada", 0) for linhas in replicas.values()
                           for l in linhas if l["evento"] == "tentativas_no_segundo" and l["t"] <= t_fim)
    ultima_pronta = [max((l["t"] for l in linhas if l["evento"] in ("pronta", "politica_aplicada")
                          and t_red <= l["t"] <= t_fim), default=None) for linhas in replicas.values()]

    # Primeiro crash de cada réplica, em segundos desde a aplicação da política (mostra se
    # as réplicas falharam juntas ou espalhadas no tempo).
    primeiros_crashes = [min(l["t"] for l in linhas if l["evento"] == "crash") - t_inj
                         for linhas in replicas.values() if any(l["evento"] == "crash" for l in linhas)]
    # Cargas atendidas depois do botão em segundos com a fila do banco >= 90: só acontecem
    # se pedidos novos passam à frente da fila.
    atendidas_fila_cheia = sum(l["atendidas"] for l in banco_seg if l["t"] - 1 >= t_red and l["em_fila"] >= 90)

    envios = sorted(r["t_envio"] for r in reqs)
    maior_pausa = round(max(b - a for a, b in zip(envios, envios[1:])), 3)
    inicio = next(l for l in cliente if l["evento"] == "experimento_iniciado")
    esperadas = round(inicio["taxa_rps"] * inicio.get("duracao_planejada_s", 85))
    valida = maior_pausa <= PAUSA_MAXIMA_S and len(reqs) >= 0.97 * esperadas

    resumo = {
        "rodada": pasta.name,
        "estrategia": next((l.get("estrategia") for l in cliente if l["evento"] == "experimento_iniciado"), None),
        "banco_custo_carga_s": next((l["custo_carga_s"] for l in banco if l["evento"] == "banco_iniciado"), None),
        "arquivos": {
            "requisicoes": "cliente.jsonl",
            "banco": "banco.jsonl",
            "replicas": list(replicas),
        },
        "tempo_ate_falha_s": round(seg_falha + 1, 1) if seg_falha is not None else None,
        "tempo_ate_primeiro_erro_s": round(primeiro_erro - t_inj, 3) if primeiro_erro else None,
        "tempo_ate_recuperacao_s": (seg_rec - seg_red) if seg_rec is not None else None,
        "recuperou": seg_rec is not None,
        "janela_observada_apos_red_button_s": observado_s,
        "atraso_do_operador": atraso_operador,
        # controle de qualidade: o cliente deve enviar ~1 requisição a cada 25 ms, sem pausas
        "maior_pausa_no_envio_s": maior_pausa,
        "requisicoes_esperadas": esperadas,
        "valida": valida,
        "requisicoes_total": len(reqs),
        "erro_pct_total": pct(sum(v[1] for v in fases.values()), len(reqs)),
        "erro_pct_por_fase": {f: pct(e, t) for f, (t, e) in fases.items()},
        "requisicoes_por_fase": {f: t for f, (t, e) in fases.items()},
        "status_das_requisicoes": dict(status),
        "replicas_prontas_apos_red_button": sum(1 for t in ultima_pronta if t),
        "replicas_total": len(replicas),
        "crashes_das_replicas": crashes,
        "tentativas_de_carga": tentativas_carga,
        "primeiro_crash_das_replicas_s": {
            "replicas_que_quebraram": len(primeiros_crashes),
            "mais_cedo": round(min(primeiros_crashes), 2) if primeiros_crashes else None,
            "mais_tarde": round(max(primeiros_crashes), 2) if primeiros_crashes else None,
        },
        "banco_atendidas_com_fila_cheia_apos_red_button": atendidas_fila_cheia,
        "banco_apos_red_button": {
            "recebidas": soma_banco("recebidas", t_red),
            "atendidas": soma_banco("atendidas", t_red),
            "desperdicadas": soma_banco("desperdicadas", t_red),
            "rejeitadas_503": soma_banco("rejeitadas", t_red),
            "fila_max": max((l["fila_max"] for l in banco_seg if l["t"] - 1 >= t_red), default=0),
        },
        "banco_durante_falha": {
            "desperdicadas": soma_banco("desperdicadas", t_inj, t_red),
            "rejeitadas_503": soma_banco("rejeitadas", t_inj, t_red),
            "fila_max": max((l["fila_max"] for l in banco_seg if t_inj <= l["t"] - 1 < t_red), default=0),
        },
    }

    (pasta / "resumo.json").write_text(json.dumps(resumo, ensure_ascii=False, indent=2), encoding="utf-8")

    banco_por_seg = {math.floor(l["t"] - 1 - t_inj): l for l in banco_seg}
    with (pasta / "serie_por_segundo.csv").open("w", encoding="utf-8") as csv:
        csv.write("segundo_desde_injecao,requisicoes,erros,erro_pct,banco_atendidas,banco_desperdicadas,"
                  "banco_rejeitadas,banco_em_fila\n")
        for s in segundos:
            b = banco_por_seg.get(s, {})
            csv.write(f"{s},{por_seg[s]['req']},{por_seg[s]['erros']},{round(100 * taxa[s], 1)},"
                      f"{b.get('atendidas', '')},{b.get('desperdicadas', '')},{b.get('rejeitadas', '')},"
                      f"{b.get('em_fila', '')}\n")

    texto = [
        f"Rodada {resumo['rodada']}  (estratégia: {resumo['estrategia']})  "
        f"{'VALIDA' if valida else f'INVALIDA (maior pausa no envio {maior_pausa} s; {len(reqs)} de {esperadas} requisicoes)'}",
        f"  tempo até a falha ............ {resumo['tempo_ate_falha_s']} s   [cliente.jsonl]",
        f"  tempo até a recuperação ...... {str(resumo['tempo_ate_recuperacao_s']) + ' s' if resumo['recuperou'] else 'não recuperou em ' + str(observado_s) + ' s'}   [cliente.jsonl]",
        f"  % de erro (total) ............ {resumo['erro_pct_total']}% de {len(reqs)} requisições   [cliente.jsonl]",
        f"  % de erro por fase ........... {resumo['erro_pct_por_fase']}   [cliente.jsonl]",
        f"  réplicas prontas após o botão  {resumo['replicas_prontas_apos_red_button']}/{len(replicas)}   [service-control-*.jsonl]",
        f"  crashes das réplicas ......... {crashes}   [service-control-*.jsonl]",
        f"  banco após o red-button ...... {resumo['banco_apos_red_button']}   [banco.jsonl]",
    ]
    (pasta / "resumo.txt").write_text("\n".join(texto) + "\n", encoding="utf-8")
    print("\n".join(texto))
    return resumo


if __name__ == "__main__":
    analisar(Path(sys.argv[1]))
