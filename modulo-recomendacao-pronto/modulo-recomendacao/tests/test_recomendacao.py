from app import recomendar_produtos, recomendar_fallback


def test_recomenda_produtos_similares():
    resultado = recomendar_produtos(1)

    assert resultado
    assert resultado[0]["produto_id"] in [2, 7]
    assert resultado[0]["score"] >= 5


def test_fallback_retorna_produtos():
    resultado = recomendar_fallback()

    assert len(resultado) >= 5
    assert all("produto_id" in produto for produto in resultado)


def test_produto_inexistente():
    resultado = recomendar_produtos(999)

    assert resultado is None
