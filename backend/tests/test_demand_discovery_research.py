from __future__ import annotations

import unittest
from unittest.mock import Mock, patch

from backend.core.config import Settings
from backend.services.demand.connectors.connector_registry import DemandConnectorRegistry
from backend.services.demand.connectors.firecrawl_connector import FirecrawlDemandConnector
from backend.services.demand.connectors.firecrawl_search_connector import FirecrawlSearchDemandConnector
from backend.services.demand.connectors.google_search_connector import GoogleSearchDemandConnector
from backend.services.demand.connectors.synthetic_connector import SyntheticDemandConnector
from backend.services.demand.demand_intelligence_service import DemandIntelligenceService, _unique_urls
from backend.services.demand.demand_models import DemandConnectorRequest, DemandConnectorResponse, DemandRawSignal
from backend.services.demand.search_demand_layer import SearchDemandLayer
from backend.services.demand.signal_validation_engine import SignalValidationEngine
from backend.services.demand.solution_fit_engine import SolutionFitEngine
from backend.services.demand.source_query_builder import SourceQueryBuilder
from backend.services.product.demand_discovery_service import (
    _brief_from_text,
    _missing_fields,
    _research_context,
    _research_fingerprint,
)


class DemandDiscoveryResearchTests(unittest.TestCase):
    def test_brief_requires_target_segment(self) -> None:
        brief = _brief_from_text("広告レポートを自動化するアプリを考えています")
        self.assertIn("target_segment", _missing_fields(brief))

    def test_brief_detects_japanese_target_segment(self) -> None:
        brief = _brief_from_text("小規模広告代理店向けの広告レポート自動化アプリを考えています")
        self.assertNotIn("target_segment", _missing_fields(brief))

    def test_brief_detects_english_target_segment(self) -> None:
        brief = _brief_from_text("I am building an ad reporting assistant for small marketing agencies.")
        self.assertEqual(brief["target_segment"], "small marketing agencies")

    def test_fingerprint_changes_with_source_urls(self) -> None:
        brief = _brief_from_text("小規模広告代理店向けの広告レポート自動化アプリ")
        self.assertNotEqual(
            _research_fingerprint(brief, []),
            _research_fingerprint(brief, ["https://example.com"]),
        )

    def test_research_context_marks_mixed_sources_and_counts_sources(self) -> None:
        context = _research_context(
            {
                "id": "run-1",
                "summary": {},
                "signals": [
                    {"connector_key": "google_custom_search", "source_name": "example.com", "title": "Real"},
                    {"connector_key": "firecrawl", "source_name": "example.com", "title": "Crawled"},
                    {"connector_key": "synthetic", "source_name": "Synthetic", "title": "Fallback"},
                ],
                "clusters": [],
            },
        )
        self.assertEqual(context["source_kind"], "mixed")
        self.assertEqual(context["real_signal_count"], 2)
        self.assertEqual(context["synthetic_signal_count"], 1)
        self.assertEqual(context["source_count"], 1)

    def test_source_query_builder_uses_google_for_x_and_reddit_discovery(self) -> None:
        result = SourceQueryBuilder().build(
            query="広告レポート",
            source_urls=["https://example.com/reviews"],
        )
        google_queries = " ".join(result["google_custom_search"])
        firecrawl_queries = " ".join(result["firecrawl_search"])
        self.assertIn("site:reddit.com", google_queries)
        self.assertIn("site:x.com", google_queries)
        self.assertIn("広告レポート 不満", firecrawl_queries)
        self.assertEqual(result["firecrawl"], ["https://example.com/reviews"])
        self.assertNotIn("reddit", result)
        self.assertNotIn("x", result)

    def test_source_query_builder_generates_language_specific_queries(self) -> None:
        ja = " ".join(SourceQueryBuilder().build(query="広告レポート", locale="ja")["google_custom_search"])
        en = " ".join(SourceQueryBuilder().build(query="ad reporting", locale="en")["google_custom_search"])
        self.assertIn("不満", ja)
        self.assertNotIn("complaints", ja)
        self.assertIn("complaints", en)
        self.assertNotIn("不満", en)

    def test_connector_registry_uses_google_firecrawl_search_and_scrape_as_real_sources(self) -> None:
        connectors = DemandConnectorRegistry(Settings(demand_real_sources_enabled=True)).real_connectors
        self.assertEqual(
            [connector.connector_key for connector in connectors],
            ["google_custom_search", "firecrawl_search", "firecrawl"],
        )

    @patch("backend.services.demand.connectors.google_search_connector.requests.get")
    def test_google_connector_returns_discovered_urls(self, get: Mock) -> None:
        get.return_value.raise_for_status.return_value = None
        get.return_value.json.return_value = {
            "items": [
                {
                    "cacheId": "abc",
                    "link": "https://example.com/reviews",
                    "title": "Product reviews",
                    "snippet": "Users say reporting takes too long.",
                    "displayLink": "example.com",
                },
            ],
        }
        connector = GoogleSearchDemandConnector(
            Settings(google_custom_search_api_key="key", google_custom_search_engine_id="cx"),
        )
        response = connector.collect(DemandConnectorRequest(query="ad reporting", expanded_queries=["ad reporting reviews"], max_results=10))
        self.assertEqual(response.status, "completed")
        self.assertEqual(response.signals[0].url, "https://example.com/reviews")

    def test_firecrawl_missing_key_is_skipped(self) -> None:
        response = FirecrawlDemandConnector(Settings()).collect(
            DemandConnectorRequest(query="test", expanded_queries=["https://example.com"]),
        )
        self.assertEqual(response.status, "skipped")

    @patch("backend.services.demand.connectors.firecrawl_search_connector.validate_public_http_url")
    @patch("backend.services.demand.connectors.firecrawl_search_connector.requests.post")
    def test_firecrawl_search_discovers_and_classifies_web_results(self, post: Mock, validate: Mock) -> None:
        validate.return_value = "https://example.com/reviews"
        post.return_value.raise_for_status.return_value = None
        post.return_value.json.return_value = {
            "success": True,
            "data": {
                "web": [
                    {
                        "url": "https://example.com/reviews",
                        "title": "Product reviews",
                        "description": "Users report that setup is difficult.",
                        "position": 1,
                    },
                ],
            },
        }
        connector = FirecrawlSearchDemandConnector(
            Settings(
                firecrawl_api_key="key",
                firecrawl_search_max_queries=1,
                firecrawl_search_max_results_per_run=10,
            ),
        )
        response = connector.collect(
            DemandConnectorRequest(query="ad reporting", expanded_queries=["ad reporting reviews"], max_results=10),
        )
        self.assertEqual(response.status, "completed")
        self.assertEqual(response.signals[0].connector_key, "firecrawl_search")
        self.assertEqual(response.signals[0].source_type, "review_site")
        self.assertEqual(response.signals[0].url, "https://example.com/reviews")

    def test_firecrawl_search_can_be_disabled(self) -> None:
        response = FirecrawlSearchDemandConnector(
            Settings(firecrawl_api_key="key", firecrawl_search_enabled=False),
        ).collect(DemandConnectorRequest(query="test"))
        self.assertEqual(response.status, "skipped")
        self.assertEqual(response.metadata["reason"], "disabled")

    def test_discovered_urls_remove_fragments_and_tracking_duplicates(self) -> None:
        urls = _unique_urls(
            [
                "https://example.com/reviews?utm_source=google#top",
                "https://example.com/reviews/",
                "https://example.com/reviews?category=saas",
            ],
        )
        self.assertEqual(
            urls,
            [
                "https://example.com/reviews?utm_source=google#top",
                "https://example.com/reviews?category=saas",
            ],
        )

    @patch("backend.services.demand.connectors.firecrawl_connector.requests.post")
    def test_firecrawl_returns_real_classified_content(self, post: Mock) -> None:
        post.return_value.raise_for_status.return_value = None
        post.return_value.json.return_value = {
            "success": True,
            "data": {
                "markdown": "Users report that setup is difficult and support is slow.",
                "metadata": {"title": "Product reviews", "sourceURL": "https://example.com/reviews", "statusCode": 200},
            },
        }
        connector = FirecrawlDemandConnector(Settings(firecrawl_api_key="key"))
        response = connector.collect(
            DemandConnectorRequest(query="test", expanded_queries=["https://example.com/reviews"]),
        )
        self.assertEqual(response.status, "completed")
        self.assertEqual(response.signals[0].connector_key, "firecrawl")
        self.assertEqual(response.signals[0].source_type, "review_site")

    def test_synthetic_release_signals_create_readable_japanese_clusters(self) -> None:
        response = SyntheticDemandConnector().collect(DemandConnectorRequest(query="広告レポート", language="ja"))
        service = DemandIntelligenceService(repository=None, settings=Settings())  # type: ignore[arg-type]
        normalized = service._normalize_signals(response.signals)
        pains = service._extract_pains(normalized)
        self.assertIn("手作業に時間がかかる", [item.name for item in pains])

    def test_synthetic_release_signals_create_readable_english_clusters(self) -> None:
        response = SyntheticDemandConnector().collect(DemandConnectorRequest(query="ad reporting", language="en"))
        service = DemandIntelligenceService(repository=None, settings=Settings())  # type: ignore[arg-type]
        normalized = service._normalize_signals(response.signals)
        pains = service._extract_pains(normalized, locale="en")
        desires = service._extract_desires(normalized, locale="en")
        self.assertIn("Manual work takes too long", [item.name for item in pains])
        self.assertIn("Automate repetitive work", [item.name for item in desires])
        self.assertTrue(all(signal.language == "en" for signal in response.signals))
        self.assertTrue(all("対象案" not in signal.body for signal in response.signals))

    def test_english_analysis_artifacts_are_english(self) -> None:
        service = DemandIntelligenceService(repository=None, settings=Settings())  # type: ignore[arg-type]
        normalized = service._normalize_signals(
            SyntheticDemandConnector().collect(DemandConnectorRequest(query="ad reporting", language="en")).signals,
        )
        pains = service._extract_pains(normalized, locale="en")
        desires = service._extract_desires(normalized, locale="en")
        clusters = service._cluster(normalized=normalized, pains=pains, desires=desires, locale="en")
        competitors = service._analyze_competitors(
            query="ad reporting",
            normalized=normalized,
            churn_reasons=service._extract_churn_reasons(normalized, locale="en"),
            locale="en",
        )
        gaps = service._market_gaps(clusters=clusters, competitors=competitors, locale="en")
        opportunities = service._opportunities(gaps=gaps, locale="en")
        positioning = service._positioning(query="ad reporting", gaps=gaps, competitors=competitors, locale="en")
        self.assertTrue(clusters)
        self.assertTrue(all(cluster.trend in {"spike", "growing", "stable"} for cluster in clusters))
        self.assertIn("evidence-backed", positioning.recommended_position.lower())
        self.assertTrue(all("変換する" not in opportunity.name for opportunity in opportunities))

    def test_validation_and_solution_fit_messages_follow_locale(self) -> None:
        signals = [{"source_type": "google_search", "body": "Setup is difficult.", "metadata": {"normalized_text": "Setup is difficult."}}]
        clusters = [{"id": "pain-1", "name": "Setup is difficult", "evidence_signal_indexes": [0], "root_causes": [], "representative_quotes": []}]
        validations, _ = SignalValidationEngine().validate(signals=signals, clusters=clusters, locale="en")
        fits, _ = SolutionFitEngine().evaluate(clusters=clusters, targets=[("product", "simple setup")], locale="en")
        self.assertIn("source type", validations[0]["validation_reasons"][0])
        self.assertTrue(all("ください" not in message for message in fits[0]["recommended_adjustments"]))

    def test_search_demand_appends_full_intent_queries(self) -> None:
        keywords = SearchDemandLayer()._keywords(
            query="ad reporting",
            expanded_queries={},
            clusters=[],
            opportunities=[],
            features=[],
            locale="en",
        )
        self.assertIn("ad reporting automation", keywords)
        self.assertNotIn("a", keywords)

    @patch("backend.services.demand.connectors.google_search_connector.GoogleSearchDemandConnector.collect")
    def test_google_evidence_is_kept_when_firecrawl_is_missing(self, collect: Mock) -> None:
        collect.return_value = DemandConnectorResponse(
            source_type="google_search",
            connector_key="google_custom_search",
            status="completed",
            signals=[
                DemandRawSignal(
                    source_type="google_search",
                    source_name="example.com",
                    connector_key="google_custom_search",
                    url="https://example.com/reviews",
                    title="Reviews",
                    body="Reporting takes too long.",
                ),
            ],
        )
        service = DemandIntelligenceService(
            repository=_SourceRunRepository(),
            settings=Settings(
                demand_real_sources_enabled=True,
                demand_synthetic_fallback=True,
                google_custom_search_api_key="key",
                google_custom_search_engine_id="cx",
            ),
        )
        signals, summary = service._collect_signals(
            user_id="user",
            run_id="run",
            query="ad reporting",
            pair={},
            ad=None,
            lp=None,
        )
        self.assertEqual([signal.connector_key for signal in signals], ["google_custom_search"])
        self.assertEqual(summary["evidence_status"], "real")
        self.assertEqual(summary["skipped_count"], 2)

    @patch("backend.services.demand.connectors.firecrawl_connector.FirecrawlDemandConnector.collect")
    @patch("backend.services.demand.connectors.firecrawl_search_connector.FirecrawlSearchDemandConnector.collect")
    def test_firecrawl_search_supports_real_research_without_google(self, search_collect: Mock, scrape_collect: Mock) -> None:
        search_collect.return_value = DemandConnectorResponse(
            source_type="google_search",
            connector_key="firecrawl_search",
            status="completed",
            signals=[
                DemandRawSignal(
                    source_type="review_site",
                    source_name="example.com",
                    connector_key="firecrawl_search",
                    url="https://example.com/reviews",
                    title="Reviews",
                    body="Reporting takes too long.",
                ),
            ],
        )
        scrape_collect.return_value = DemandConnectorResponse(
            source_type="review_site",
            connector_key="firecrawl",
            status="completed",
            signals=[
                DemandRawSignal(
                    source_type="review_site",
                    source_name="example.com",
                    connector_key="firecrawl",
                    url="https://example.com/reviews",
                    title="Reviews",
                    body="Full review content.",
                ),
            ],
        )
        service = DemandIntelligenceService(
            repository=_SourceRunRepository(),
            settings=Settings(
                demand_real_sources_enabled=True,
                demand_synthetic_fallback=True,
                firecrawl_api_key="key",
            ),
        )
        signals, summary = service._collect_signals(
            user_id="user",
            run_id="run",
            query="ad reporting",
            pair={},
            ad=None,
            lp=None,
        )
        self.assertEqual([signal.connector_key for signal in signals], ["firecrawl_search", "firecrawl"])
        self.assertEqual(summary["evidence_status"], "real")
        scrape_request = scrape_collect.call_args.args[0]
        self.assertEqual(scrape_request.expanded_queries, ["https://example.com/reviews"])

    def test_synthetic_is_only_used_when_real_sources_are_unavailable(self) -> None:
        service = DemandIntelligenceService(
            repository=_SourceRunRepository(),
            settings=Settings(demand_real_sources_enabled=True, demand_synthetic_fallback=True),
        )
        signals, summary = service._collect_signals(
            user_id="user",
            run_id="run",
            query="広告レポート",
            pair={},
            ad=None,
            lp=None,
        )
        self.assertTrue(signals)
        self.assertTrue(all(signal.connector_key == "synthetic" for signal in signals))
        self.assertEqual(summary["evidence_status"], "synthetic")


class _SourceRunRepository:
    def __init__(self) -> None:
        self.index = 0

    def create_demand_source_run(self, payload: dict) -> dict:
        self.index += 1
        return {"id": f"source-{self.index}", **payload}

    def update_demand_source_run(self, *, user_id: str, source_run_id: str, payload: dict) -> dict:
        return {"id": source_run_id, "user_id": user_id, **payload}

    def create_demand_connector_log(self, payload: dict) -> dict:
        return payload


if __name__ == "__main__":
    unittest.main()
