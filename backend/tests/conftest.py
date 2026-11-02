"""Put the repo root on sys.path so the backend can import the shared
`contracts` package (Pydantic models) and, later, the research scripts.

pyproject's `pythonpath=["."]` adds backend/ (for `app`); this adds the repo
root (for `contracts`). B1/B3 reuse the same bootstrap at app startup.
"""
import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[2]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

import pytest  # noqa: E402


@pytest.fixture(autouse=True)
def _fresh_adapter_detection():
    """Detection is cached for a few seconds; no test may see another's."""
    from app.adapters import forget_detection

    forget_detection()
    yield
    forget_detection()


@pytest.fixture(autouse=True)
def _upstream_market(monkeypatch, request):
    """Upstream tests assert the US/Europe ("global") market; this fork defaults
    to Brazil. Tests that exercise the Brazilian market opt out by setting
    ``YUBEN_MARKET`` themselves (see test_corpo_explicado.py)."""
    if "corpo_explicado" not in request.node.nodeid:
        monkeypatch.setenv("YUBEN_MARKET", "global")
        monkeypatch.setenv("YUBEN_COMMENTS", "0")
    yield
