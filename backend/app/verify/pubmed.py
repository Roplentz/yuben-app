"""PubMed evidence lookup (Corpo Explicado fork).

The agent proposes a claim and a PubMed query; this module runs the query
against NCBI E-utilities and returns the real hit count and top PMIDs. Same
trust rule as the YouTube side: the model supplies words, the backend supplies
every number and identifier.

Unauthenticated E-utilities allow ~3 requests/second, so calls are spaced.
Every failure degrades to ``(None, [])`` — evidence checks never sink a run.
"""
from __future__ import annotations

import logging
import time
from typing import Callable, List, Optional, Tuple
from urllib.parse import quote_plus

logger = logging.getLogger("yuben.pubmed")

ESEARCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
_MIN_INTERVAL = 0.35  # seconds between calls (NCBI: 3 req/s without a key)
_MAX_PMIDS = 3

#: (query) -> (hit count or None, pmids)
PubMedLookup = Callable[[str], Tuple[Optional[int], List[str]]]


def search_url(query: str) -> str:
    """Human PubMed search page for ``query`` (no network)."""
    return "https://pubmed.ncbi.nlm.nih.gov/?term=" + quote_plus(query or "")


class EutilsLookup:
    """Callable PubMed lookup over httpx, rate-limited, never raising."""

    def __init__(self, timeout: float = 8.0) -> None:
        self._timeout = timeout
        self._last = 0.0
        self._client = None

    def _http(self):
        if self._client is None:
            import httpx

            self._client = httpx.Client(timeout=self._timeout)
        return self._client

    def __call__(self, query: str) -> Tuple[Optional[int], List[str]]:
        query = (query or "").strip()
        if not query:
            return None, []
        wait = _MIN_INTERVAL - (time.monotonic() - self._last)
        if wait > 0:
            time.sleep(wait)
        self._last = time.monotonic()
        try:
            resp = self._http().get(
                ESEARCH_URL,
                params={
                    "db": "pubmed",
                    "term": query,
                    "retmode": "json",
                    "retmax": _MAX_PMIDS,
                    "sort": "relevance",
                    "tool": "yuben-corpo-explicado",
                },
            )
            resp.raise_for_status()
            data = (resp.json() or {}).get("esearchresult") or {}
            count = int(data.get("count"))
            pmids = [str(p) for p in (data.get("idlist") or []) if str(p).isdigit()]
            return count, pmids[:_MAX_PMIDS]
        except Exception as exc:
            logger.info("PubMed lookup failed for %r: %s", query, type(exc).__name__)
            return None, []

    def close(self) -> None:
        if self._client is not None:
            self._client.close()
            self._client = None
