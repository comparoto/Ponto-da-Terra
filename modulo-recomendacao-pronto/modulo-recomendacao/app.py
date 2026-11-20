"""Serviço HTTP (BentoML) do módulo de recomendação "Descubra Mais".

As rotas NÃO abrem arquivos: chegam aos dados só pelas funções de
acesso_dados.py, informando quem está chamando (`chamador`), e isso fica
registrado em logs/uso_dados.jsonl. A regra de pontuação está em recomendador.py.
"""

import bentoml

import acesso_dados as dados
import recomendador

LIMITE_MAXIMO = 20


def _erro(ctx: bentoml.Context, status: int, mensagem: str) -> dict:
    ctx.response.status_code = status
    return {"sucesso": False, "erro": mensagem}


def _limite_invalido(limite: int) -> bool:
    return not 1 <= limite <= LIMITE_MAXIMO


def _destaques(limite: int, chamador: str) -> list[dict]:
    return [
        recomendador.formatar(p, motivo="produto em destaque no catálogo")
        for p in dados.listar_destaques(limite, chamador=chamador)
    ]


@bentoml.service
class RecomendacaoService:

    @bentoml.api
    def health(self) -> dict:
        return {
            "status": "ok",
            "servico": "Descubra Mais",
            "mensagem": "Módulo de recomendação funcionando",
        }

    @bentoml.api
    def recomendar_produto(self, produto_id: int, ctx: bentoml.Context, limite: int = 5) -> dict:
        """RF-01/RF-02: produtos (e artesãos) semelhantes a um produto."""
        chamador = "rota:/recomendar_produto"
        if _limite_invalido(limite):
            return _erro(ctx, 400, f"limite deve estar entre 1 e {LIMITE_MAXIMO}")
        try:
            base = dados.buscar_produto(produto_id, chamador=chamador)
        except dados.RegistroNaoEncontrado:
            return _erro(ctx, 404, f"Produto {produto_id} não encontrado")

        candidatos = dados.listar_produtos_relacionados(produto_id, chamador=chamador)
        recomendacoes = recomendador.ranquear(base, candidatos, limite)
        if recomendacoes:
            tipo = "similares"
        else:
            # Produto sem nenhum semelhante (ex.: id 10): mostra os destaques.
            tipo = "sem_similares_fallback"
            recomendacoes = _destaques(limite, chamador)

        return {
            "sucesso": True,
            "produto_id": produto_id,
            "tipo": tipo,
            "recomendacoes": recomendacoes,
        }

    @bentoml.api
    def recomendar_usuario(self, usuario_id: int, ctx: bentoml.Context, limite: int = 5) -> dict:
        """Recomendação pelo histórico salvo do usuário; RF-04 se ele não tiver histórico."""
        chamador = "rota:/recomendar_usuario"
        if _limite_invalido(limite):
            return _erro(ctx, 400, f"limite deve estar entre 1 e {LIMITE_MAXIMO}")
        try:
            usuario = dados.buscar_usuario(usuario_id, chamador=chamador)
        except dados.RegistroNaoEncontrado:
            return _erro(ctx, 404, f"Usuário {usuario_id} não encontrado")

        historico = usuario["historico"]
        rankings = []
        for produto_id in historico:
            try:
                base = dados.buscar_produto(produto_id, chamador=chamador)
            except dados.RegistroNaoEncontrado:
                continue  # produto removido do catálogo: o log registra o erro
            candidatos = dados.listar_produtos_relacionados(produto_id, chamador=chamador)
            rankings.append(recomendador.ranquear(base, candidatos, LIMITE_MAXIMO, excluir=set(historico)))

        recomendacoes = recomendador.combinar(rankings, limite)
        if recomendacoes:
            tipo = "personalizado"
        else:
            tipo = "fallback"  # RF-04: cold start
            recomendacoes = _destaques(limite, chamador)

        return {
            "sucesso": True,
            "usuario_id": usuario_id,
            "tipo": tipo,
            "historico_considerado": historico,
            "recomendacoes": recomendacoes,
        }

    @bentoml.api
    def registrar_evento(self, tipo_evento: str, usuario_id: int, produto_id: int,
                         ctx: bentoml.Context) -> dict:
        """RF-06: grava visualização, clique em recomendação ou compra."""
        chamador = "rota:/registrar_evento"
        try:
            dados.buscar_produto(produto_id, chamador=chamador)
            evento = dados.registrar_evento(tipo_evento, usuario_id, produto_id, chamador=chamador)
        except dados.RegistroNaoEncontrado:
            return _erro(ctx, 404, f"Produto {produto_id} não encontrado")
        except dados.DadoInvalido as erro:
            return _erro(ctx, 400, str(erro))
        return {"sucesso": True, "mensagem": "Evento registrado com sucesso", "evento": evento}

    @bentoml.api
    def metricas(self) -> dict:
        eventos = dados.listar_eventos(chamador="rota:/metricas")
        por_tipo = {tipo: 0 for tipo in sorted(dados.TIPOS_DE_EVENTO)}
        for evento in eventos:
            por_tipo[evento["tipo_evento"]] += 1
        return {
            "total_eventos": len(eventos),
            "visualizacoes": por_tipo["visualizacao"],
            "cliques": por_tipo["clique_recomendacao"],
            "conversoes": por_tipo["compra"],
        }
