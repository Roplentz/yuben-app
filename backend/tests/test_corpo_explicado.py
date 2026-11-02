"""Corpo Explicado fork: Brazil market, comment-grounded ideas, PubMed checks.

The node id contains "corpo_explicado", so conftest leaves YUBEN_MARKET and
YUBEN_COMMENTS alone here and each test sets what it needs.
"""
from __future__ import annotations

from contracts.python.models import AgentClaim, AudienceDemand
from app.orchestrator.prompts import build_narrative_prompt
from app.pipeline import params as P
from app.verify import assemble_and_verify
from app.verify.pubmed import search_url

from tests.test_verify import FAB, StubVerifier, build_case


# --- market -------------------------------------------------------------------
def test_brazil_is_the_default_market(monkeypatch):
    monkeypatch.delenv("YUBEN_MARKET", raising=False)
    m = P.active_market()
    assert (m.id, m.region_code, m.relevance_language) == ("br", "BR", "pt")
    assert m.transcript_languages[0] == "pt"


def test_brazil_market_tiers(monkeypatch):
    monkeypatch.setenv("YUBEN_MARKET", "br")
    assert P.region_tier("BR") == P.REGION_CORE
    assert P.region_tier("pt") == P.REGION_EUROPE  # secondary: Lusophone
    assert P.region_tier("US") == P.REGION_EUROPE  # secondary: core English
    assert P.region_tier("") == P.REGION_UNKNOWN
    assert P.region_tier("IN") == P.REGION_OTHER


def test_request_mapping_uses_market_hints(monkeypatch):
    monkeypatch.setenv("YUBEN_MARKET", "br")
    p = P.map_request_to_params({"query": "dor nas costas", "format": "shorts"})
    assert (p.region_code, p.relevance_language) == ("BR", "pt")
    assert "Brazilian channels first" in p.ranking_label


def test_global_market_keeps_upstream_behaviour(monkeypatch):
    monkeypatch.setenv("YUBEN_MARKET", "global")
    p = P.map_request_to_params({"query": "x"})
    assert (p.region_code, p.relevance_language) == ("US", "en")
    assert P.region_tier("BR") == P.REGION_OTHER


# --- prompt -----------------------------------------------------------------------
def test_prompt_carries_comments_and_portuguese(monkeypatch):
    monkeypatch.setenv("YUBEN_MARKET", "br")
    request, _agent, videos, _ = build_case()
    vid = videos[0].video_id
    meta = {"pipeline": {"comments": {vid: [{"text": "Por que meu joelho estala?", "likes": 12}]}}}
    prompt = build_narrative_prompt(request, videos, meta)
    assert "VIEWER COMMENTS" in prompt
    assert "Por que meu joelho estala?" in prompt
    assert "pt-BR" in prompt
    assert '"audience_demand"' in prompt and '"claims_to_check"' in prompt


# --- assembly: trust rules for the new sections --------------------------------------
class FakePubMed:
    def __init__(self):
        self.queries = []

    def __call__(self, query):
        self.queries.append(query)
        return 42, ["111", "222"]


def _agent_with_extras(agent, vid):
    return agent.model_copy(
        update={
            "audience_demand": [
                AudienceDemand(video_id=vid, comment="joelho estala quando", question="q", pauta="p"),
                AudienceDemand(video_id=vid, comment="frase que ninguém escreveu", question="q", pauta="p"),
                AudienceDemand(video_id=FAB, comment="joelho estala quando", question="q", pauta="p"),
            ],
            "claims_to_check": [
                AgentClaim(video_id=vid, claim="estalar dedos causa artrose", pubmed_query="knuckle cracking osteoarthritis"),
                AgentClaim(video_id=FAB, claim="inventada", pubmed_query="x"),
            ],
        }
    )


def test_demand_needs_a_real_comment_and_claims_get_backend_numbers():
    request, agent, videos, _ = build_case()
    vid = videos[0].video_id
    agent = _agent_with_extras(agent, vid)
    meta = {
        "run_id": "r_ce",
        "pipeline": {"comments": {vid: [{"text": "Meu JOELHO   estala quando agacho, é normal?", "likes": 3}]}},
    }
    pubmed = FakePubMed()
    result = assemble_and_verify(
        request, agent, videos, meta,
        verifier=StubVerifier(), write_history=False, pubmed_lookup=pubmed,
    )

    # Only the entry whose excerpt really appears under that real video survives.
    assert [d.comment for d in result.audience_demand] == ["joelho estala quando"]

    # Fabricated video dropped; numbers come from the lookup, not the agent.
    assert len(result.evidence_checks) == 1
    check = result.evidence_checks[0]
    assert (check.pubmed_hits, check.pmids) == (42, ["111", "222"])
    assert check.search_url == search_url("knuckle cracking osteoarthritis")
    assert pubmed.queries == ["knuckle cracking osteoarthritis"]


def test_no_pubmed_when_verification_is_off():
    request, agent, videos, _ = build_case()
    vid = videos[0].video_id
    agent = _agent_with_extras(agent, vid)
    result = assemble_and_verify(
        request, agent, videos, {"run_id": "r_ce2"},
        verify_links=False, write_history=False,
    )
    # No comments fetched -> no grounded ideas; claims kept without numbers.
    assert result.audience_demand == []
    assert result.evidence_checks[0].pubmed_hits is None
    assert result.evidence_checks[0].pmids == []


def test_sections_stay_null_when_agent_omits_them():
    request, agent, videos, _ = build_case()
    result = assemble_and_verify(
        request, agent, videos, {"run_id": "r_ce3"},
        verify_links=False, write_history=False,
    )
    assert result.audience_demand is None
    assert result.evidence_checks is None
