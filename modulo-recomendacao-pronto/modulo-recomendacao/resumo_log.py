"""Resumo do uso dos dados a partir do log (logs/uso_dados.jsonl).

Uso:
    python resumo_log.py                       # resume logs/uso_dados.jsonl
    python resumo_log.py logs/exemplo_uso_dados.jsonl

Mostra: quantas vezes cada função foi chamada, quantos erros (e quais),
quais registros foram mais consultados e quais nunca foram.
"""

import json
import sys
from collections import Counter
from pathlib import Path

import acesso_dados
from log_uso import caminho_log

TABELAS_COM_IDS = ("produtos", "usuarios")
# Funções cujos resultados viram candidatos a recomendação para o cliente.
FUNCOES_QUE_OFERECEM = {"listar_produtos_relacionados", "listar_destaques"}


def ler_log(arquivo: Path) -> list[dict]:
    if not arquivo.exists():
        sys.exit(f"Log não encontrado: {arquivo}\nRode o serviço e faça algumas chamadas antes (ver README).")
    with arquivo.open(encoding="utf-8") as entrada:
        return [json.loads(linha) for linha in entrada if linha.strip()]


def titulo(texto: str) -> None:
    print(f"\n{texto}\n{'-' * len(texto)}")


def resumir(linhas: list[dict]) -> None:
    print(f"{len(linhas)} chamadas registradas, de {linhas[0]['data_hora']} a {linhas[-1]['data_hora']}")

    titulo("1. Chamadas por função de acesso")
    por_funcao = Counter(l["funcao"] for l in linhas)
    erros_funcao = Counter(l["funcao"] for l in linhas if not l["sucesso"])
    print(f"{'função':32} {'chamadas':>8} {'erros':>6}")
    for funcao, total in por_funcao.most_common():
        print(f"{funcao:32} {total:>8} {erros_funcao[funcao]:>6}")

    titulo("2. Quem chamou")
    for chamador, total in Counter(l["chamador"] for l in linhas).most_common():
        print(f"{chamador:32} {total:>8}")

    erros = [l for l in linhas if not l["sucesso"]]
    titulo(f"3. Erros: {len(erros)}")
    for motivo, total in Counter((l["funcao"], l["erro"]) for l in erros).most_common():
        print(f"{total}x {motivo[0]} -> {motivo[1]}")

    for numero, tabela in enumerate(TABELAS_COM_IDS, start=4):
        cadastrados = acesso_dados.ids_cadastrados(tabela)
        consultas = Counter(
            id_ for l in linhas if l["tabela"] == tabela for id_ in l["ids_retornados"]
        )
        titulo(f"{numero}. Registros de {tabela}: mais consultados e nunca consultados")
        for id_, total in consultas.most_common(5):
            print(f"id {id_:>4} {cadastrados.get(id_, '(fora da base)'):34} {total:>4}x")
        nunca = [id_ for id_ in cadastrados if id_ not in consultas]
        print("Nunca consultados:", ", ".join(f"{i} ({cadastrados[i]})" for i in nunca) or "nenhum")

        if tabela == "produtos":
            # Um produto pode ser lido por id (ex.: está no histórico de alguém)
            # e ainda assim nunca ser oferecido ao cliente como recomendação.
            oferecidos = {
                id_ for l in linhas if l["funcao"] in FUNCOES_QUE_OFERECEM
                for id_ in l["ids_retornados"]
            }
            nunca_oferecidos = [id_ for id_ in cadastrados if id_ not in oferecidos]
            print("Nunca oferecidos como recomendação:",
                  ", ".join(f"{i} ({cadastrados[i]})" for i in nunca_oferecidos) or "nenhum")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")  # acentos corretos no terminal do Windows
    arquivo = Path(sys.argv[1]) if len(sys.argv) > 1 else caminho_log()
    resumir(ler_log(arquivo))
