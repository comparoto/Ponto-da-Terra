import json
import os
from pathlib import Path

import pytest

import acesso_dados as dados
import recomendador

C = "teste"  # chamador usado nos testes


# ------------------------------------------------------------ funções de acesso

def test_buscar_produto_existente():
    assert dados.buscar_produto(1, chamador=C)["nome"] == "Vaso de Barro Decorativo"


def test_produto_inexistente_da_erro_claro():
    with pytest.raises(dados.RegistroNaoEncontrado, match="produto 999 não existe"):
        dados.buscar_produto(999, chamador=C)


def test_produto_sem_semelhantes_devolve_lista_vazia():
    assert dados.listar_produtos_relacionados(10, chamador=C) == []


def test_relacionados_nao_incluem_produto_inativo():
    ids = [p["id"] for p in dados.listar_produtos_relacionados(4, chamador=C)]
    assert 5 in ids and 14 not in ids


def test_usuario_sem_historico():
    assert dados.buscar_usuario(103, chamador=C)["historico"] == []


def test_usuario_inexistente_da_erro_claro():
    with pytest.raises(dados.RegistroNaoEncontrado):
        dados.buscar_usuario(999, chamador=C)


def test_destaques_so_ativos_e_marcados():
    destaques = dados.listar_destaques(10, chamador=C)
    assert destaques and all(p["ativo"] and p["destaque"] for p in destaques)


def test_registrar_evento_grava_e_listar_le():
    assert dados.listar_eventos(chamador=C) == []
    dados.registrar_evento("compra", 101, 2, chamador=C)
    eventos = dados.listar_eventos(chamador=C)
    assert len(eventos) == 1 and eventos[0]["produto_id"] == 2


def test_evento_de_tipo_invalido_e_recusado():
    with pytest.raises(dados.DadoInvalido):
        dados.registrar_evento("curtida", 101, 2, chamador=C)


def test_mudar_o_dado_muda_a_resposta():
    """Experiência do README: editar o arquivo muda a próxima resposta."""
    assert dados.listar_produtos_relacionados(10, chamador=C) == []
    arquivo = Path(os.environ["PDT_DADOS_DIR"]) / "produtos.json"
    produtos = json.loads(arquivo.read_text(encoding="utf-8"))
    produtos[9]["regiao"] = "Recife"  # Colar de Renda passa a ser de Recife
    arquivo.write_text(json.dumps(produtos, ensure_ascii=False), encoding="utf-8")
    ids = [p["id"] for p in dados.listar_produtos_relacionados(10, chamador=C)]
    assert ids == [3, 9, 12]


# ------------------------------------------------------------------------ log

def test_cada_chamada_acrescenta_uma_linha_no_log(linhas_do_log):
    dados.buscar_produto(1, chamador="rota:/recomendar_produto")
    dados.listar_produtos_relacionados(1, chamador="rota:/recomendar_produto")
    linhas = linhas_do_log()
    assert [l["funcao"] for l in linhas] == ["buscar_produto", "listar_produtos_relacionados"]
    primeira = linhas[0]
    assert primeira["chamador"] == "rota:/recomendar_produto"
    assert primeira["parametros"] == {"produto_id": 1}
    assert primeira["registros"] == 1 and primeira["ids_retornados"] == [1]
    assert primeira["sucesso"] is True and primeira["erro"] is None
    assert {"data_hora", "tabela", "duracao_ms"} <= primeira.keys()


def test_erro_tambem_vai_para_o_log(linhas_do_log):
    with pytest.raises(dados.RegistroNaoEncontrado):
        dados.buscar_produto(999, chamador=C)
    linha = linhas_do_log()[-1]
    assert linha["sucesso"] is False and linha["registros"] == 0
    assert "produto 999 não existe" in linha["erro"]


def test_log_nao_e_apagado_entre_chamadas(linhas_do_log):
    for _ in range(3):
        dados.buscar_usuario(101, chamador=C)
    assert len(linhas_do_log()) == 3


# --------------------------------------------------------------- recomendador

def test_ranking_prioriza_mesma_categoria_tecnica_e_regiao():
    base = dados.buscar_produto(1, chamador=C)
    candidatos = dados.listar_produtos_relacionados(1, chamador=C)
    ranking = recomendador.ranquear(base, candidatos, limite=3)
    assert [r["produto_id"] for r in ranking] == [2, 7, 13]
    assert ranking[0]["score"] == 6


def test_combinar_soma_pontuacoes_do_historico():
    a = [{"produto_id": 5, "score": 6}, {"produto_id": 11, "score": 1}]
    b = [{"produto_id": 11, "score": 5}]
    assert [r["produto_id"] for r in recomendador.combinar([a, b], limite=5)] == [5, 11]
    assert recomendador.combinar([a, b], limite=5)[1]["score"] == 6
