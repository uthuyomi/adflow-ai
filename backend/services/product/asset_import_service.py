from __future__ import annotations

import csv
import os
import re
from dataclasses import dataclass
from html.parser import HTMLParser
from io import StringIO
from typing import Any
from urllib.parse import urlparse

import requests

from backend.core.config import Settings
from backend.core.url_safety import safe_get_public_url
from backend.services.supabase.supabase_repository import SupabaseRepository


@dataclass
class ExtractedLandingPage:
    url: str
    title: str | None
    description: str | None
    h1: str | None
    h2: str | None
    cta: str | None
    text_sample: str


class AssetImportService:
    def __init__(self, *, repository: SupabaseRepository, settings: Settings) -> None:
        self.repository = repository
        self.settings = settings

    def import_lp_from_url(
        self,
        *,
        user_id: str,
        url: str,
        project_id: str | None = None,
        name: str | None = None,
    ) -> dict[str, Any]:
        extracted = fetch_landing_page(url)
        payload = _lp_payload(extracted, user_id=user_id, project_id=project_id, name=name)
        existing = self._find_landing_page(user_id=user_id, url=extracted.url, project_id=project_id)
        if existing:
            landing_page = self.repository.update(
                "landing_pages",
                user_id=user_id,
                filters={"id": existing["id"]},
                payload={key: value for key, value in payload.items() if key != "user_id"},
            )
            action = "updated"
        else:
            landing_page = self.repository.insert("landing_pages", payload)
            action = "created"

        self._history(
            user_id=user_id,
            project_id=project_id,
            entity_type="landing_page",
            entity_id=landing_page["id"],
            action=action,
            after_data=landing_page,
            summary=f"Landing page {action} from URL import.",
        )
        return {"landing_page": landing_page, "extracted": extracted.__dict__, "action": action}

    def import_ads_csv(
        self,
        *,
        user_id: str,
        csv_text: str,
        project_id: str | None = None,
        auto_fetch_lps: bool = True,
        auto_pair: bool = True,
    ) -> dict[str, Any]:
        rows = parse_ads_csv(csv_text)
        imported_ads: list[dict[str, Any]] = []
        imported_lps: list[dict[str, Any]] = []
        imported_pairs: list[dict[str, Any]] = []
        errors: list[dict[str, Any]] = []

        for index, row in enumerate(rows, start=1):
            try:
                ad = self._create_or_update_ad(user_id=user_id, project_id=project_id, row=row)
                imported_ads.append(ad)

                lp: dict[str, Any] | None = None
                if auto_fetch_lps and ad.get("destination_url"):
                    lp_result = self.import_lp_from_url(
                        user_id=user_id,
                        project_id=project_id,
                        url=str(ad["destination_url"]),
                    )
                    lp = lp_result["landing_page"]
                    imported_lps.append(lp)

                if auto_pair and lp:
                    pair = self._create_or_get_pair(
                        user_id=user_id,
                        project_id=project_id,
                        ad=ad,
                        landing_page=lp,
                    )
                    imported_pairs.append(pair)
            except Exception as exc:
                errors.append({"row": index, "message": str(exc), "input": row})

        return {
            "ads": imported_ads,
            "landing_pages": imported_lps,
            "pairs": imported_pairs,
            "errors": errors,
            "summary": {
                "ads": len(imported_ads),
                "landing_pages": len(imported_lps),
                "pairs": len(imported_pairs),
                "errors": len(errors),
            },
        }

    def sync_x_ads(
        self,
        *,
        user_id: str,
        project_id: str | None = None,
        account_id: str | None = None,
        ads: list[dict[str, Any]] | None = None,
        auto_fetch_lps: bool = True,
        auto_pair: bool = True,
    ) -> dict[str, Any]:
        if ads is None:
            ads = self._fetch_x_ads(account_id=account_id)
        csv_text = ads_to_csv(ads)
        result = self.import_ads_csv(
            user_id=user_id,
            csv_text=csv_text,
            project_id=project_id,
            auto_fetch_lps=auto_fetch_lps,
            auto_pair=auto_pair,
        )
        result["source"] = "x_ads_api" if account_id else "provided_x_ads_payload"
        return result

    def _fetch_x_ads(self, *, account_id: str | None) -> list[dict[str, Any]]:
        token = self.settings.x_api_bearer_token or os.getenv("X_ADS_BEARER_TOKEN")
        if not token:
            raise ValueError("X_API_BEARER_TOKEN or X_ADS_BEARER_TOKEN is required for X Ads sync.")
        if not account_id:
            raise ValueError("account_id is required for X Ads sync.")

        base_url = os.getenv("X_ADS_API_BASE_URL", "https://ads-api.x.com/12").rstrip("/")
        promoted_response = requests.get(
            f"{base_url}/accounts/{account_id}/promoted_tweets",
            headers={"Authorization": f"Bearer {token}"},
            timeout=30,
        )
        promoted_response.raise_for_status()
        promoted = _extract_x_data(promoted_response.json())
        tweet_ids = [str(item.get("tweet_id")) for item in promoted if item.get("tweet_id")]
        if not tweet_ids:
            return []

        tweets_response = requests.get(
            f"{base_url}/accounts/{account_id}/tweets",
            headers={"Authorization": f"Bearer {token}"},
            params={"tweet_ids": ",".join(tweet_ids)},
            timeout=30,
        )
        tweets_response.raise_for_status()
        tweets = _extract_x_data(tweets_response.json())
        return [_x_tweet_to_ad(tweet) for tweet in tweets]

    def _create_or_update_ad(self, *, user_id: str, project_id: str | None, row: dict[str, Any]) -> dict[str, Any]:
        destination_url = _required_url(row.get("destination_url") or row.get("url"))
        payload = {
            "user_id": user_id,
            "project_id": row.get("project_id") or project_id,
            "name": _clean(row.get("name")) or _clean(row.get("headline")) or f"Imported ad for {urlparse(destination_url).netloc}",
            "campaign_name": _clean(row.get("campaign_name") or row.get("campaign")),
            "ad_group_name": _clean(row.get("ad_group_name") or row.get("ad_group")),
            "headline": _clean(row.get("headline") or row.get("text")),
            "body": _clean(row.get("body") or row.get("copy") or row.get("tweet_text")),
            "cta": _clean(row.get("cta")),
            "destination_url": destination_url,
            "image_url": _clean(row.get("image_url")),
            "video_url": _clean(row.get("video_url")),
            "impressions": _int(row.get("impressions")),
            "clicks": _int(row.get("clicks")),
            "conversions": _int(row.get("conversions")),
            "spend": _float(row.get("spend")),
            "status": _clean(row.get("status")) or "active",
        }
        existing = self._find_ad(user_id=user_id, destination_url=destination_url, headline=payload["headline"])
        if existing:
            ad = self.repository.update(
                "twitter_ads",
                user_id=user_id,
                filters={"id": existing["id"]},
                payload={key: value for key, value in payload.items() if key != "user_id"},
            )
            action = "updated"
        else:
            ad = self.repository.insert("twitter_ads", payload)
            action = "created"
        self._history(
            user_id=user_id,
            project_id=payload["project_id"],
            entity_type="twitter_ad",
            entity_id=ad["id"],
            action=action,
            after_data=ad,
            summary=f"Ad {action} from import.",
        )
        return ad

    def _create_or_get_pair(
        self,
        *,
        user_id: str,
        project_id: str | None,
        ad: dict[str, Any],
        landing_page: dict[str, Any],
    ) -> dict[str, Any]:
        existing = self.repository.get_many(
            "ad_lp_pairs",
            user_id=user_id,
            filters={"twitter_ad_id": ad["id"], "landing_page_id": landing_page["id"]},
            limit=1,
        )
        if existing:
            return existing[0]
        pair = self.repository.insert(
            "ad_lp_pairs",
            {
                "user_id": user_id,
                "project_id": ad.get("project_id") or landing_page.get("project_id") or project_id,
                "twitter_ad_id": ad["id"],
                "landing_page_id": landing_page["id"],
                "name": f"{ad.get('name') or 'Ad'} / {landing_page.get('name') or 'LP'}",
                "status": "active",
            },
        )
        self._history(
            user_id=user_id,
            project_id=pair.get("project_id"),
            entity_type="ad_lp_pair",
            entity_id=pair["id"],
            action="create",
            after_data=pair,
            summary="Ad and landing page pair created automatically from import.",
        )
        return pair

    def _find_ad(self, *, user_id: str, destination_url: str, headline: str | None) -> dict[str, Any] | None:
        rows = self.repository.get_many("twitter_ads", user_id=user_id, filters={"destination_url": destination_url}, limit=20)
        for row in rows:
            if (row.get("headline") or "") == (headline or ""):
                return row
        return rows[0] if rows else None

    def _find_landing_page(self, *, user_id: str, url: str, project_id: str | None) -> dict[str, Any] | None:
        rows = self.repository.get_many("landing_pages", user_id=user_id, filters={"url": url}, limit=20)
        if project_id:
            for row in rows:
                if row.get("project_id") == project_id:
                    return row
        return rows[0] if rows else None

    def _history(
        self,
        *,
        user_id: str,
        project_id: str | None,
        entity_type: str,
        entity_id: str,
        action: str,
        after_data: dict[str, Any],
        summary: str,
    ) -> None:
        self.repository.insert(
            "change_history",
            {
                "user_id": user_id,
                "project_id": project_id,
                "entity_type": entity_type,
                "entity_id": entity_id,
                "action": action,
                "before_data": None,
                "after_data": after_data,
                "summary": summary,
                "reason": "asset_import",
            },
        )


class _LandingPageHTMLParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.title: str | None = None
        self.description: str | None = None
        self.h1: str | None = None
        self.h2: str | None = None
        self.buttons: list[str] = []
        self.links: list[str] = []
        self.text_parts: list[str] = []
        self._tag_stack: list[str] = []
        self._capture_title = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attrs_dict = {key.lower(): value or "" for key, value in attrs}
        self._tag_stack.append(tag.lower())
        if tag.lower() == "title":
            self._capture_title = True
        if tag.lower() == "meta" and attrs_dict.get("name", "").lower() == "description":
            self.description = attrs_dict.get("content") or self.description

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "title":
            self._capture_title = False
        if self._tag_stack:
            self._tag_stack.pop()

    def handle_data(self, data: str) -> None:
        text = _clean(data)
        if not text:
            return
        tag = self._tag_stack[-1] if self._tag_stack else ""
        if self._capture_title and not self.title:
            self.title = text
        elif tag == "h1" and not self.h1:
            self.h1 = text
        elif tag == "h2" and not self.h2:
            self.h2 = text
        elif tag == "button":
            self.buttons.append(text)
        elif tag == "a":
            self.links.append(text)
        if tag not in {"script", "style", "noscript"}:
            self.text_parts.append(text)


def fetch_landing_page(url: str) -> ExtractedLandingPage:
    response = safe_get_public_url(
        url,
        headers={"User-Agent": "AdFlowAI/1.0 (+https://adflow-ai-wine.vercel.app)"},
        timeout=20,
    )
    html = response.text[:1_000_000]
    parser = _LandingPageHTMLParser()
    parser.feed(html)
    cta = _pick_cta([*parser.buttons, *parser.links])
    text_sample = " ".join(parser.text_parts)[:1000]
    return ExtractedLandingPage(
        url=response.url,
        title=parser.title,
        description=parser.description,
        h1=parser.h1,
        h2=parser.h2,
        cta=cta,
        text_sample=text_sample,
    )


def parse_ads_csv(csv_text: str) -> list[dict[str, Any]]:
    reader = csv.DictReader(StringIO(csv_text.strip()))
    if not reader.fieldnames:
        raise ValueError("CSV header is required.")
    rows = [{(key or "").strip(): value for key, value in row.items()} for row in reader]
    if not rows:
        raise ValueError("CSV must include at least one ad row.")
    return rows


def ads_to_csv(ads: list[dict[str, Any]]) -> str:
    fieldnames = [
        "name",
        "campaign_name",
        "ad_group_name",
        "headline",
        "body",
        "cta",
        "destination_url",
        "image_url",
        "video_url",
        "impressions",
        "clicks",
        "conversions",
        "spend",
        "status",
    ]
    output = StringIO()
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    for ad in ads:
        normalized = _x_tweet_to_ad(ad) if "tweet_id" in ad or "full_text" in ad else ad
        writer.writerow({key: normalized.get(key, "") for key in fieldnames})
    return output.getvalue()


def _lp_payload(
    extracted: ExtractedLandingPage,
    *,
    user_id: str,
    project_id: str | None,
    name: str | None,
) -> dict[str, Any]:
    parsed = urlparse(extracted.url)
    return {
        "user_id": user_id,
        "project_id": project_id,
        "name": name or extracted.title or extracted.h1 or parsed.netloc,
        "url": extracted.url,
        "hero_title": extracted.h1 or extracted.title,
        "hero_subtitle": extracted.description or extracted.h2,
        "primary_cta": extracted.cta,
        "secondary_cta": None,
        "offer_text": None,
        "target_audience": None,
        "bounce_rate": None,
        "session_duration": None,
        "scroll_depth": None,
        "page_speed": None,
        "fcp": None,
        "lcp": None,
        "notes": f"Imported from URL. Extracted sample: {extracted.text_sample[:500]}",
    }


def _pick_cta(candidates: list[str]) -> str | None:
    cta_pattern = re.compile(r"(start|try|buy|book|get|contact|demo|sign|始め|無料|資料|相談|購入|予約)", re.I)
    cleaned = [_clean(candidate) for candidate in candidates if 1 <= len(_clean(candidate)) <= 48]
    for candidate in cleaned:
        if cta_pattern.search(candidate):
            return candidate
    return cleaned[0] if cleaned else None


def _x_tweet_to_ad(tweet: dict[str, Any]) -> dict[str, Any]:
    text = _clean(tweet.get("text") or tweet.get("full_text") or tweet.get("body"))
    url = _extract_first_url(tweet) or _clean(tweet.get("destination_url") or tweet.get("url"))
    return {
        "name": _clean(tweet.get("name")) or f"X Ad {tweet.get('id') or tweet.get('tweet_id') or ''}".strip(),
        "campaign_name": _clean(tweet.get("campaign_name")),
        "ad_group_name": _clean(tweet.get("line_item_name") or tweet.get("ad_group_name")),
        "headline": text[:120] if text else None,
        "body": text,
        "cta": _clean(tweet.get("cta")),
        "destination_url": url,
        "image_url": _clean(tweet.get("image_url")),
        "video_url": _clean(tweet.get("video_url")),
        "impressions": _int(tweet.get("impressions")),
        "clicks": _int(tweet.get("clicks") or tweet.get("url_clicks")),
        "conversions": _int(tweet.get("conversions")),
        "spend": _float(tweet.get("spend")),
        "status": _clean(tweet.get("status") or tweet.get("entity_status")) or "active",
    }


def _extract_x_data(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, dict):
        data = payload.get("data")
        if isinstance(data, list):
            return [item for item in data if isinstance(item, dict)]
        if isinstance(data, dict):
            return [data]
    if isinstance(payload, list):
        return [item for item in payload if isinstance(item, dict)]
    return []


def _extract_first_url(payload: dict[str, Any]) -> str | None:
    entities = payload.get("entities")
    if isinstance(entities, dict):
        urls = entities.get("urls")
        if isinstance(urls, list):
            for item in urls:
                if isinstance(item, dict):
                    expanded = _clean(item.get("expanded_url") or item.get("url"))
                    if expanded:
                        return expanded
    return None


def _required_url(value: Any) -> str:
    text = _clean(value)
    if not text:
        raise ValueError("destination_url is required.")
    parsed = urlparse(text)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError(f"Invalid destination_url: {text}")
    return text


def _clean(value: Any) -> str | None:
    if value is None:
        return None
    text = " ".join(str(value).split())
    return text or None


def _int(value: Any) -> int:
    try:
        return max(0, int(float(str(value or 0).replace(",", ""))))
    except ValueError:
        return 0


def _float(value: Any) -> float:
    try:
        return max(0.0, float(str(value or 0).replace(",", "")))
    except ValueError:
        return 0.0
