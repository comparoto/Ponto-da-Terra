import json
import shutil
import sys
from pathlib import Path

import pytest

PASTA_MODULO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PASTA_MODULO))


@pytest.fixture(autouse=True)
def ambiente_isolado(tmp_path, monkeypatch):
    """Cada teste usa uma cópia dos dados e um log próprio, em pasta temporária."""
    pasta_dados = tmp_path / "dados"
    shutil.copytree(PASTA_MODULO / "dados", pasta_dados,
                    ignore=shutil.ignore_patterns("eventos.jsonl"))
    monkeypatch.setenv("PDT_DADOS_DIR", str(pasta_dados))
    monkeypatch.setenv("PDT_LOG_ARQUIVO", str(tmp_path / "uso_dados.jsonl"))
    return tmp_path


@pytest.fixture
def linhas_do_log(ambiente_isolado):
    def ler():
        arquivo = ambiente_isolado / "uso_dados.jsonl"
        if not arquivo.exists():
            return []
        return [json.loads(l) for l in arquivo.read_text(encoding="utf-8").splitlines()]
    return ler
