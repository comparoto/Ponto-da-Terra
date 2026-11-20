"""Funções de acesso aos dados do módulo "Descubra Mais".

Este é o ÚNICO arquivo que abre os arquivos da pasta dados/. As rotas do
serviço (app.py) chegam aos dados só por estas funções, e cada chamada fica
registrada em logs/uso_dados.jsonl (ver log_uso.py).

Quando não há nada para devolver, cada função faz uma de duas coisas:
- busca por identificador (produto, usuário) -> lança RegistroNaoEncontrado;
- listagem -> devolve lista vazia, que é uma resposta válida.
"""

import json
import os
from datetime import datetime
from pathlib import Path

from log_uso import PASTA_MODULO, registrar_uso

TIPOS_DE_EVENTO = {"visualizacao", "clique_recomendacao", "compra"}


class RegistroNaoEncontrado(LookupError):
    """O identificador pedido não existe na base."""


class DadoInvalido(ValueError):
    """A entrada não pode ser gravada (ex.: tipo de evento desconhecido)."""


# ---------------------------------------------------------------- leitura bruta
# Funções internas (começam com _): não são chamadas pelas rotas, só pelas
# funções de acesso abaixo e pelo script de resumo do log.

def _pasta_dados() -> Path:
    return Path(os.environ.get("PDT_DADOS_DIR", PASTA_MODULO / "dados"))


def _ler_json(nome: str) -> list:
    # Lido a cada chamada, de propósito: editar o arquivo muda a próxima resposta
    # sem precisar reiniciar o serviço.
    with (_pasta_dados() / nome).open(encoding="utf-8") as arquivo:
        return json.load(arquivo)


def _ler_eventos() -> list:
    arquivo = _pasta_dados() / "eventos.jsonl"
    if not arquivo.exists():
        return []
    with arquivo.open(encoding="utf-8") as entrada:
        return [json.loads(linha) for linha in entrada if linha.strip()]


def ids_cadastrados(tabela: str) -> dict:
    """{id: rótulo} de todos os registros de uma tabela.

    Usado só pelo resumo do log (resumo_log.py), que é uma análise feita depois
    e não faz parte do módulo de IA; por isso não gera linha no log.
    """
    if tabela == "produtos":
        return {
            p["id"]: p["nome"] + ("" if p["ativo"] else " [inativo]")
            for p in _ler_json("produtos.json")
        }
    if tabela == "usuarios":
        return {
            u["id"]: f"{len(u['historico'])} produto(s) no histórico"
            for u in _ler_json("usuarios.json")
        }
    return {}


# ------------------------------------------------------------ funções de acesso

@registrar_uso(tabela="produtos")
def buscar_produto(produto_id: int) -> dict:
    """Devolve o produto com esse id (ativo ou não)."""
    for produto in _ler_json("produtos.json"):
        if produto["id"] == produto_id:
            return produto
    raise RegistroNaoEncontrado(f"produto {produto_id} não existe")


@registrar_uso(tabela="produtos")
def listar_produtos_relacionados(produto_id: int) -> list:
    """Produtos ATIVOS que têm algo em comum com o produto informado:
    mesma categoria, mesma técnica ou mesma região. O próprio produto fica de fora.

    Lista vazia = nenhum semelhante (caso do Colar de Renda, id 10).
    """
    produtos = _ler_json("produtos.json")
    base = next((p for p in produtos if p["id"] == produto_id), None)
    if base is None:
        raise RegistroNaoEncontrado(f"produto {produto_id} não existe")
    return [
        p for p in produtos
        if p["id"] != produto_id and p["ativo"] and (
            p["categoria"] == base["categoria"]
            or p["tecnica"] == base["tecnica"]
            or p["regiao"] == base["regiao"]
        )
    ]


@registrar_uso(tabela="produtos")
def listar_destaques(limite: int) -> list:
    """Produtos ativos marcados como destaque, usados para quem não tem histórico."""
    destaques = [p for p in _ler_json("produtos.json") if p["ativo"] and p["destaque"]]
    return destaques[:limite]


@registrar_uso(tabela="usuarios")
def buscar_usuario(usuario_id: int) -> dict:
    """Devolve o usuário com o histórico de produtos visualizados.
    Um usuário que existe mas nunca viu nada vem com "historico": [].
    """
    for usuario in _ler_json("usuarios.json"):
        if usuario["id"] == usuario_id:
            return usuario
    raise RegistroNaoEncontrado(f"usuário {usuario_id} não existe")


@registrar_uso(tabela="eventos")
def registrar_evento(tipo_evento: str, usuario_id: int, produto_id: int) -> dict:
    """GRAVA um evento (visualização, clique ou compra) em dados/eventos.jsonl."""
    if tipo_evento not in TIPOS_DE_EVENTO:
        raise DadoInvalido(
            f"tipo_evento '{tipo_evento}' inválido; use um de {sorted(TIPOS_DE_EVENTO)}"
        )
    evento = {
        "id": len(_ler_eventos()) + 1,
        "tipo_evento": tipo_evento,
        "usuario_id": usuario_id,
        "produto_id": produto_id,
        "registrado_em": datetime.now().astimezone().isoformat(timespec="seconds"),
    }
    arquivo = _pasta_dados() / "eventos.jsonl"
    with arquivo.open("a", encoding="utf-8") as saida:
        saida.write(json.dumps(evento, ensure_ascii=False) + "\n")
    return evento


@registrar_uso(tabela="eventos")
def listar_eventos() -> list:
    """Todos os eventos gravados (lista vazia se ainda não houver nenhum)."""
    return _ler_eventos()
