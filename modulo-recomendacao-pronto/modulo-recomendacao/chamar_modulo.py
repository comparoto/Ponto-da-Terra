"""Cliente mínimo para chamar o serviço sem depender do curl (funciona igual
em Windows, macOS e Linux). Usa só a biblioteca padrão do Python.

Uso (com o serviço rodando em outro terminal):
    python chamar_modulo.py demo
        -> faz as três chamadas de demonstração do README

    python chamar_modulo.py <rota> campo=valor ...
    python chamar_modulo.py recomendar_produto produto_id=1 limite=3
    python chamar_modulo.py recomendar_usuario usuario_id=103
    python chamar_modulo.py registrar_evento tipo_evento=compra usuario_id=101 produto_id=2
    python chamar_modulo.py metricas
"""

import json
import os
import sys
import urllib.error
import urllib.request

URL_BASE = os.environ.get("PDT_URL", "http://localhost:3000")

DEMO = [
    ("recomendar_produto", {"produto_id": 1, "limite": 3}),
    ("recomendar_usuario", {"usuario_id": 103}),
    ("recomendar_produto", {"produto_id": 999}),
]


def chamar(rota: str, corpo: dict) -> None:
    requisicao = urllib.request.Request(
        f"{URL_BASE}/{rota}",
        data=json.dumps(corpo).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(requisicao) as resposta:
            status, texto = resposta.status, resposta.read()
    except urllib.error.HTTPError as erro:
        status, texto = erro.code, erro.read()
    except urllib.error.URLError as erro:
        sys.exit(f"Não consegui falar com {URL_BASE} ({erro.reason}). O serviço está rodando?")

    print(f"\n>>> POST /{rota} {json.dumps(corpo, ensure_ascii=False)}  ->  HTTP {status}")
    try:
        print(json.dumps(json.loads(texto), ensure_ascii=False, indent=2))
    except json.JSONDecodeError:
        print(texto.decode("utf-8", errors="replace"))


def _valor(texto: str):
    return int(texto) if texto.lstrip("-").isdigit() else texto


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")  # acentos corretos no terminal do Windows
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    if sys.argv[1] == "demo":
        for rota, corpo in DEMO:
            chamar(rota, corpo)
    else:
        campos = dict(par.split("=", 1) for par in sys.argv[2:])
        chamar(sys.argv[1], {chave: _valor(valor) for chave, valor in campos.items()})
