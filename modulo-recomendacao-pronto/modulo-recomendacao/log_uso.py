"""Registro do uso dos dados pelo módulo de recomendação.

Cada chamada a uma função de acesso (acesso_dados.py) acrescenta UMA linha
JSON ao arquivo de log, sem apagar as anteriores (formato .jsonl).

O log guarda só identificadores e números: nenhum nome, e-mail ou outro dado
pessoal passa por aqui.
"""

import functools
import json
import os
import time
from datetime import datetime
from pathlib import Path

PASTA_MODULO = Path(__file__).resolve().parent


def caminho_log() -> Path:
    """Arquivo de log. Pode ser trocado pela variável PDT_LOG_ARQUIVO."""
    return Path(os.environ.get("PDT_LOG_ARQUIVO", PASTA_MODULO / "logs" / "uso_dados.jsonl"))


def escrever_linha(registro: dict) -> None:
    arquivo = caminho_log()
    arquivo.parent.mkdir(parents=True, exist_ok=True)
    with arquivo.open("a", encoding="utf-8") as saida:  # "a" = acrescenta, nunca sobrescreve
        saida.write(json.dumps(registro, ensure_ascii=False) + "\n")


def _ids_do_resultado(resultado) -> list:
    """Extrai os ids dos registros devolvidos (um dict ou uma lista de dicts)."""
    if isinstance(resultado, dict):
        return [resultado["id"]] if "id" in resultado else []
    if isinstance(resultado, list):
        return [item["id"] for item in resultado if isinstance(item, dict) and "id" in item]
    return []


def registrar_uso(tabela: str):
    """Decorador: registra no log cada chamada da função de acesso decorada.

    A função decorada recebe obrigatoriamente o argumento nomeado `chamador`
    (ex.: "rota:/recomendar_produto"). Os demais argumentos são identificadores
    e vão para o campo `parametros` do log.
    """

    def decorador(funcao):
        @functools.wraps(funcao)
        def envoltorio(*args, chamador: str, **kwargs):
            parametros = dict(zip(funcao.__code__.co_varnames, args))
            parametros.update(kwargs)
            inicio = time.perf_counter()
            linha = {
                "data_hora": datetime.now().astimezone().isoformat(timespec="seconds"),
                "funcao": funcao.__name__,
                "chamador": chamador,
                "tabela": tabela,
                "parametros": parametros,
            }
            try:
                resultado = funcao(*args, **kwargs)
            except Exception as erro:
                linha.update(registros=0, ids_retornados=[], sucesso=False,
                             erro=f"{type(erro).__name__}: {erro}")
                raise
            else:
                ids = _ids_do_resultado(resultado)
                quantidade = len(resultado) if isinstance(resultado, list) else 1
                linha.update(registros=quantidade, ids_retornados=ids, sucesso=True, erro=None)
                return resultado
            finally:
                linha["duracao_ms"] = round((time.perf_counter() - inicio) * 1000, 2)
                escrever_linha(linha)

        return envoltorio

    return decorador
