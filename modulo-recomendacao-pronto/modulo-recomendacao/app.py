import bentoml
from bentoml.io import JSON

from produtos import PRODUTOS


# Eventos recebidos pelo módulo durante a execução.
EVENTOS = []


def recomendar_produtos(produto_id: int, limite: int = 5):
    """Recomenda produtos usando um ranking simples e explicável.

    Pontuação do mock:
    +3 mesma categoria
    +2 mesma técnica
    +1 mesma região
    """
    produto_atual = next(
        (produto for produto in PRODUTOS if produto["id"] == produto_id),
        None,
    )

    if produto_atual is None:
        return None

    resultados = []

    for produto in PRODUTOS:
        if produto["id"] == produto_id:
            continue

        score = 0
        motivos = []

        if produto["categoria"] == produto_atual["categoria"]:
            score += 3
            motivos.append("mesma categoria")

        if produto["tecnica"] == produto_atual["tecnica"]:
            score += 2
            motivos.append("mesma técnica artesanal")

        if produto["regiao"] == produto_atual["regiao"]:
            score += 1
            motivos.append("mesma região")

        if score > 0:
            resultados.append(
                {
                    "produto_id": produto["id"],
                    "nome": produto["nome"],
                    "categoria": produto["categoria"],
                    "tecnica": produto["tecnica"],
                    "regiao": produto["regiao"],
                    "artesao": produto["artesao"],
                    "score": score,
                    "motivo": ", ".join(motivos),
                }
            )

    resultados.sort(key=lambda item: item["score"], reverse=True)

    return resultados[:limite]


def recomendar_fallback(limite: int = 5):
    """Fallback simples para visitante sem histórico."""
    return [
        {
            "produto_id": produto["id"],
            "nome": produto["nome"],
            "categoria": produto["categoria"],
            "regiao": produto["regiao"],
            "motivo": "produto em destaque para visitante sem histórico",
        }
        for produto in PRODUTOS[:limite]
    ]


@bentoml.service
class RecomendacaoService:

    @bentoml.api
    def health(self):
        return {
            "status": "ok",
            "servico": "Descubra Mais",
            "mensagem": "Módulo de recomendação funcionando",
        }

    @bentoml.api(input=JSON, output=JSON)
    def recomendar_produto(self, dados: dict):
        produto_id = dados.get("produto_id")
        limite = dados.get("limite", 5)

        if not isinstance(produto_id, int):
            return {
                "sucesso": False,
                "erro": "produto_id deve ser um número inteiro",
            }

        resultado = recomendar_produtos(produto_id, limite)

        if resultado is None:
            return {
                "sucesso": False,
                "erro": "Produto não encontrado",
            }

        return {
            "sucesso": True,
            "produto_id": produto_id,
            "recomendacoes": resultado,
        }

    @bentoml.api(input=JSON, output=JSON)
    def recomendar_usuario(self, dados: dict):
        usuario_id = dados.get("usuario_id")
        historico = dados.get("historico", [])

        # Mock: sem histórico suficiente, usa RF-04 (fallback/cold start).
        if not historico:
            return {
                "sucesso": True,
                "usuario_id": usuario_id,
                "tipo": "fallback",
                "recomendacoes": recomendar_fallback(),
            }

        # Mock de personalização: usa o último produto visualizado.
        ultimo_produto = historico[-1]

        if not isinstance(ultimo_produto, int):
            return {
                "sucesso": False,
                "erro": "Os itens do historico devem ser IDs inteiros",
            }

        resultado = recomendar_produtos(ultimo_produto)

        if resultado is None:
            return {
                "sucesso": False,
                "erro": "Produto do histórico não encontrado",
            }

        return {
            "sucesso": True,
            "usuario_id": usuario_id,
            "tipo": "personalizado_mock",
            "recomendacoes": resultado,
        }

    @bentoml.api(input=JSON, output=JSON)
    def registrar_evento(self, dados: dict):
        evento = {
            "tipo_evento": dados.get("tipo_evento"),
            "usuario_id": dados.get("usuario_id"),
            "produto_id": dados.get("produto_id"),
        }

        EVENTOS.append(evento)

        return {
            "sucesso": True,
            "mensagem": "Evento registrado com sucesso",
            "evento": evento,
            "total_eventos": len(EVENTOS),
        }

    @bentoml.api
    def metricas(self):
        cliques = sum(
            1 for evento in EVENTOS
            if evento.get("tipo_evento") == "clique_recomendacao"
        )
        compras = sum(
            1 for evento in EVENTOS
            if evento.get("tipo_evento") == "compra"
        )

        return {
            "total_eventos": len(EVENTOS),
            "cliques": cliques,
            "conversoes": compras,
        }
