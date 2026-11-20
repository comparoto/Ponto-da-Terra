"""Regra de recomendação do "Descubra Mais": ranking simples e explicável.

Funções puras: recebem os produtos já carregados e não abrem arquivo nenhum.
Quem busca os dados são as rotas, sempre pelas funções de acesso_dados.py.

Pontuação:
  +3 mesma categoria
  +2 mesma técnica artesanal
  +1 mesma região
"""

PESOS = [
    ("categoria", 3, "mesma categoria"),
    ("tecnica", 2, "mesma técnica artesanal"),
    ("regiao", 1, "mesma região"),
]


def pontuar(base: dict, candidato: dict) -> tuple[int, list[str]]:
    score, motivos = 0, []
    for campo, peso, motivo in PESOS:
        if candidato[campo] == base[campo]:
            score += peso
            motivos.append(motivo)
    return score, motivos


def ranquear(base: dict, candidatos: list[dict], limite: int, excluir: set[int] = frozenset()) -> list[dict]:
    """Ordena os candidatos pela pontuação em relação ao produto base."""
    resultado = []
    for candidato in candidatos:
        if candidato["id"] in excluir:
            continue
        score, motivos = pontuar(base, candidato)
        if score > 0:
            resultado.append(formatar(candidato, score=score, motivo=", ".join(motivos)))
    resultado.sort(key=lambda item: (-item["score"], item["produto_id"]))
    return resultado[:limite]


def combinar(rankings: list[list[dict]], limite: int) -> list[dict]:
    """Junta os rankings de vários produtos do histórico somando as pontuações."""
    somados: dict[int, dict] = {}
    for ranking in rankings:
        for item in ranking:
            atual = somados.get(item["produto_id"])
            if atual is None:
                somados[item["produto_id"]] = dict(item)
            else:
                atual["score"] += item["score"]
    resultado = sorted(somados.values(), key=lambda item: (-item["score"], item["produto_id"]))
    return resultado[:limite]


def formatar(produto: dict, score: int | None = None, motivo: str = "") -> dict:
    item = {
        "produto_id": produto["id"],
        "nome": produto["nome"],
        "categoria": produto["categoria"],
        "tecnica": produto["tecnica"],
        "regiao": produto["regiao"],
        "artesao": produto["artesao"],
        "preco": produto["preco"],
        "motivo": motivo,
    }
    if score is not None:
        item["score"] = score
    return item
