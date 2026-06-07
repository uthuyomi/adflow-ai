from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import urlencode

from backend.core.config import Settings
from backend.services.outcomes.improvement_outcome_service import ImprovementOutcomeService
from backend.services.product.ad_ab_test_service import AdABTestService
from backend.services.supabase.supabase_repository import SupabaseRepository
from backend.services.x_ads.token_cipher import TokenCipher
from backend.services.x_ads.x_ads_client import XAdsClient
from backend.services.x_ads.x_oauth_client import XOAuthClient


class XAdsService:
    def __init__(self, *, repository: SupabaseRepository, settings: Settings) -> None:
        self.repository = repository
        self.settings = settings
        self.cipher = TokenCipher(settings.x_ads_token_encryption_key)

    def list_connections(self, *, user_id: str) -> list[dict[str, Any]]:
        return [self._public_connection(row) for row in self.repository.get_many("x_ads_connections", user_id=user_id, order="created_at.desc")]

    def start_oauth(self, *, user_id: str, label: str, return_path: str | None = None) -> dict[str, str]:
        state = secrets.token_urlsafe(32)
        token = self._oauth_client().request_token(self.settings.x_ads_oauth_callback_url)
        if token.get("oauth_callback_confirmed") != "true":
            raise ValueError("X did not confirm the OAuth callback URL.")
        request_token = token["oauth_token"]
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
        self.repository.insert(
            "x_ads_oauth_sessions",
            {
                "user_id": user_id,
                "state": state,
                "oauth_token_hash": _token_hash(request_token),
                "encrypted_request_token_secret": self.cipher.encrypt(token["oauth_token_secret"]),
                "label": label.strip() or "X Ads",
                "return_path": _safe_return_path(return_path),
                "status": "pending",
                "expires_at": expires_at.isoformat(),
            },
        )
        return {"authorization_url": self._oauth_client().authorization_url(request_token)}

    def complete_oauth(
        self,
        *,
        state: str | None,
        oauth_token: str | None,
        oauth_verifier: str | None,
        denied: str | None = None,
    ) -> str:
        supplied_token = oauth_token or denied
        if not supplied_token:
            return self._frontend_redirect("/ad-optimization", "failed", "missing_token")
        rows = self.repository.get_related_many(
            "x_ads_oauth_sessions",
            filters={"oauth_token_hash": _token_hash(supplied_token)},
            limit=1,
        )
        if not rows:
            return self._frontend_redirect("/ad-optimization", "failed", "invalid_session")
        session = rows[0]
        if state and session.get("state") != state:
            return self._frontend_redirect("/ad-optimization", "failed", "invalid_session")
        user_id = str(session["user_id"])
        return_path = _safe_return_path(session.get("return_path"))
        if session.get("status") != "pending":
            return self._frontend_redirect(return_path, "failed", "session_used")
        expires_at = datetime.fromisoformat(str(session["expires_at"]).replace("Z", "+00:00"))
        if datetime.now(timezone.utc) >= expires_at:
            self._update_oauth_session(user_id=user_id, session_id=session["id"], status="expired", error_code="expired")
            return self._frontend_redirect(return_path, "failed", "expired")
        if denied:
            self._update_oauth_session(user_id=user_id, session_id=session["id"], status="denied", error_code="denied")
            return self._frontend_redirect(return_path, "denied", "denied")
        if not oauth_token or not oauth_verifier:
            self._update_oauth_session(user_id=user_id, session_id=session["id"], status="failed", error_code="missing_verifier")
            return self._frontend_redirect(return_path, "failed", "missing_verifier")
        try:
            access = self._oauth_client().access_token(
                request_token=oauth_token,
                request_token_secret=self.cipher.decrypt(session["encrypted_request_token_secret"]),
                verifier=oauth_verifier,
            )
            self._create_verified_connection(
                user_id=user_id,
                label=session["label"],
                access_token=access["oauth_token"],
                access_token_secret=access["oauth_token_secret"],
                x_user_id=access.get("user_id"),
                x_username=access.get("screen_name"),
            )
            self._update_oauth_session(user_id=user_id, session_id=session["id"], status="completed")
            return self._frontend_redirect(return_path, "connected", None)
        except Exception:
            self._update_oauth_session(user_id=user_id, session_id=session["id"], status="failed", error_code="exchange_failed")
            return self._frontend_redirect(return_path, "failed", "exchange_failed")

    def create_connection(
        self,
        *,
        user_id: str,
        label: str,
        access_token: str,
        access_token_secret: str,
    ) -> dict[str, Any]:
        return self._create_verified_connection(
            user_id=user_id,
            label=label,
            access_token=access_token,
            access_token_secret=access_token_secret,
        )

    def _create_verified_connection(
        self,
        *,
        user_id: str,
        label: str,
        access_token: str,
        access_token_secret: str,
        x_user_id: str | None = None,
        x_username: str | None = None,
    ) -> dict[str, Any]:
        client = self._client(access_token=access_token, access_token_secret=access_token_secret)
        accounts = client.list_accounts()
        connection = self.repository.insert(
            "x_ads_connections",
            {
                "user_id": user_id,
                "label": label.strip() or "X Ads",
                "x_user_id": x_user_id,
                "x_username": x_username,
                "encrypted_access_token": self.cipher.encrypt(access_token),
                "encrypted_access_token_secret": self.cipher.encrypt(access_token_secret),
                "scopes": ["ads.read", "ads.write", "tweet_composer"],
                "status": "active",
                "last_verified_at": _now(),
            },
        )
        for account in accounts:
            self._store_account(user_id=user_id, connection_id=connection["id"], account=account, client=client)
        return {**self._public_connection(connection), "accounts": self.list_accounts(user_id=user_id, connection_id=connection["id"])}

    def verify_connection(self, *, user_id: str, connection_id: str) -> dict[str, Any]:
        connection, client = self._connection_client(user_id=user_id, connection_id=connection_id)
        try:
            accounts = client.list_accounts()
            for account in accounts:
                self._store_account(user_id=user_id, connection_id=connection_id, account=account, client=client)
            updated = self.repository.update(
                "x_ads_connections",
                user_id=user_id,
                filters={"id": connection_id},
                payload={"status": "active", "last_verified_at": _now(), "last_error": None},
            )
            return {**self._public_connection(updated), "accounts": self.list_accounts(user_id=user_id, connection_id=connection_id)}
        except ValueError as exc:
            self.repository.update(
                "x_ads_connections",
                user_id=user_id,
                filters={"id": connection["id"]},
                payload={"status": "invalid", "last_error": str(exc), "last_verified_at": _now()},
            )
            raise

    def revoke_connection(self, *, user_id: str, connection_id: str) -> dict[str, Any]:
        connection = self.repository.get_one("x_ads_connections", user_id=user_id, filters={"id": connection_id})
        if connection.get("status") == "revoked":
            return self._public_connection(connection)
        return self._public_connection(
            self.repository.update(
                "x_ads_connections",
                user_id=user_id,
                filters={"id": connection_id},
                payload={"status": "revoked", "last_error": "Revoked by user."},
            ),
        )

    def list_accounts(self, *, user_id: str, connection_id: str | None = None) -> list[dict[str, Any]]:
        return self.repository.get_many(
            "x_ads_accounts",
            user_id=user_id,
            filters={"connection_id": connection_id} if connection_id else None,
            order="created_at.desc",
        )

    def sync_account(
        self,
        *,
        user_id: str,
        connection_id: str,
        account_id: str,
        project_id: str | None,
        days: int = 30,
    ) -> dict[str, Any]:
        _, client = self._connection_client(user_id=user_id, connection_id=connection_id)
        account_record = self.repository.get_one(
            "x_ads_accounts",
            user_id=user_id,
            filters={"connection_id": connection_id, "x_account_id": account_id},
        )
        last_synced_at = account_record.get("last_synced_at")
        if last_synced_at:
            last_sync = datetime.fromisoformat(str(last_synced_at).replace("Z", "+00:00"))
            if datetime.now(timezone.utc) - last_sync < timedelta(minutes=5):
                raise ValueError("X Ads detailed sync is limited to once every 5 minutes per account.")
        promoted = client.list_promoted_tweets(account_id)
        tweet_ids = [str(item.get("tweet_id")) for item in promoted if item.get("tweet_id")]
        tweets = client.list_tweets(account_id, tweet_ids)
        tweets_by_id = {str(item.get("id") or item.get("tweet_id")): item for item in tweets}
        promoted_by_tweet = {str(item.get("tweet_id")): item for item in promoted if item.get("tweet_id")}
        end = datetime.now(timezone.utc)
        start = end - timedelta(days=max(1, min(days, 90)))
        stats = client.get_promoted_tweet_stats(
            account_id,
            [str(item.get("id")) for item in promoted if item.get("id")],
            start_time=start.strftime("%Y-%m-%dT%H:%M:%SZ"),
            end_time=end.strftime("%Y-%m-%dT%H:%M:%SZ"),
        )
        stats_by_promoted_id = {str(item.get("id") or item.get("id_data", [{}])[0].get("id")): item for item in stats}
        synced_ads = []
        for tweet_id in tweet_ids:
            tweet = tweets_by_id.get(tweet_id, {})
            promoted_tweet = promoted_by_tweet.get(tweet_id, {})
            stat = stats_by_promoted_id.get(str(promoted_tweet.get("id")), {})
            metrics = _aggregate_metrics(stat)
            ad = self._upsert_ad(
                user_id=user_id,
                connection_id=connection_id,
                account_id=account_id,
                project_id=project_id,
                tweet=tweet,
                promoted_tweet=promoted_tweet,
                metrics=metrics,
            )
            synced_ads.append(ad)
            self._ensure_pair(user_id=user_id, project_id=project_id, ad=ad)
            self._store_snapshots(
                user_id=user_id,
                connection_id=connection_id,
                account_id=account_id,
                project_id=project_id,
                ad=ad,
                stat=stat,
            )
            self._update_published_outcome(user_id=user_id, ad=ad)
        self.repository.update(
            "x_ads_accounts",
            user_id=user_id,
            filters={"connection_id": connection_id, "x_account_id": account_id},
            payload={"last_synced_at": _now()},
        )
        return {"ads": synced_ads, "account_id": account_id, "synced_count": len(synced_ads), "days": days}

    def list_publish_requests(self, *, user_id: str, project_id: str | None = None) -> list[dict[str, Any]]:
        return self.repository.get_many(
            "x_ads_publish_requests",
            user_id=user_id,
            filters={"project_id": project_id} if project_id else None,
            order="created_at.desc",
        )

    def get_publish_request(self, *, user_id: str, request_id: str) -> dict[str, Any]:
        return self.repository.get_one("x_ads_publish_requests", user_id=user_id, filters={"id": request_id})

    def create_publish_request(
        self,
        *,
        user_id: str,
        source_ai_result_id: str,
        connection_id: str,
        account_id: str,
        line_item_id: str,
        proposed_text: str | None = None,
        hypothesis: str | None = None,
        primary_metric: str = "ctr",
    ) -> dict[str, Any]:
        result = self.repository.get_one("ai_agent_results", user_id=user_id, filters={"id": source_ai_result_id})
        if result.get("decision_status") != "apply_ready":
            raise ValueError("AI result must be apply_ready before creating an X Ads publish request.")
        pair = self.repository.get_one("ad_lp_pairs", user_id=user_id, filters={"id": result["ad_lp_pair_id"]})
        source_ad = self.repository.get_one("twitter_ads", user_id=user_id, filters={"id": pair["twitter_ad_id"]})
        if not result.get("project_id"):
            raise ValueError("X Ads publishing requires the source pair to belong to a project.")
        connection = self.repository.get_one("x_ads_connections", user_id=user_id, filters={"id": connection_id})
        if connection.get("status") != "active":
            raise ValueError("X Ads connection must be active before creating a publishing draft.")
        self.repository.get_one("x_ads_accounts", user_id=user_id, filters={"connection_id": connection_id, "x_account_id": account_id})
        text = (proposed_text or _proposal_text(result) or "").strip()
        if not text:
            raise ValueError("The approved AI result does not include publishable ad copy.")
        publish_text = _publish_text(text, source_ad["destination_url"])
        if len(publish_text) > 280:
            raise ValueError("X ad copy plus its destination URL must be 280 characters or fewer.")
        key = hashlib.sha256(f"{source_ai_result_id}:{connection_id}:{account_id}:{line_item_id}:{text}".encode()).hexdigest()
        existing = self.repository.get_many("x_ads_publish_requests", user_id=user_id, filters={"idempotency_key": key}, limit=1)
        if existing:
            return existing[0]
        request = self.repository.insert(
            "x_ads_publish_requests",
            {
                "user_id": user_id,
                "project_id": result.get("project_id"),
                "ad_lp_pair_id": result["ad_lp_pair_id"],
                "source_ad_id": source_ad["id"],
                "source_ai_result_id": source_ai_result_id,
                "connection_id": connection_id,
                "x_account_id": account_id,
                "x_line_item_id": line_item_id,
                "proposed_text": text,
                "destination_url": source_ad["destination_url"],
                "hypothesis": hypothesis or str((result.get("output") or {}).get("summary") or result.get("task") or ""),
                "primary_metric": primary_metric,
                "risk_level": result.get("risk_level"),
                "idempotency_key": key,
            },
        )
        self._event(user_id=user_id, request_id=request["id"], event_type="draft_created", status="completed")
        return request

    def approve_publish_request(self, *, user_id: str, request_id: str, approved: bool) -> dict[str, Any]:
        request = self.repository.get_one("x_ads_publish_requests", user_id=user_id, filters={"id": request_id})
        if request.get("publish_status") == "published":
            raise ValueError("Published X Ads requests cannot be changed.")
        status = "approved" if approved else "rejected"
        updated = self.repository.update(
            "x_ads_publish_requests",
            user_id=user_id,
            filters={"id": request_id},
            payload={"approval_status": status, "approved_by": user_id if approved else None, "approved_at": _now() if approved else None},
        )
        self._event(user_id=user_id, request_id=request_id, event_type=status, status="completed")
        return updated

    def publish(self, *, user_id: str, request_id: str) -> dict[str, Any]:
        request = self.repository.get_one("x_ads_publish_requests", user_id=user_id, filters={"id": request_id})
        if request.get("approval_status") != "approved":
            raise ValueError("Explicit approval is required before publishing to X Ads.")
        if request.get("publish_status") == "published":
            return request
        if request.get("publish_status") == "publishing":
            raise ValueError("This X Ads request is already publishing.")
        account = self.repository.get_one(
            "x_ads_accounts",
            user_id=user_id,
            filters={"connection_id": request["connection_id"], "x_account_id": request["x_account_id"]},
        )
        if not account.get("promotable_users"):
            raise ValueError("This X Ads account has no promotable users. Confirm TWEET_COMPOSER permission before publishing.")
        _, client = self._connection_client(user_id=user_id, connection_id=request["connection_id"])
        self.repository.update("x_ads_publish_requests", user_id=user_id, filters={"id": request_id}, payload={"publish_status": "publishing", "error_message": None})
        self._event(user_id=user_id, request_id=request_id, event_type="publish_started", status="running")
        try:
            tweet_id = str(request.get("published_tweet_id") or "")
            if not tweet_id:
                tweet = client.create_promoted_only_tweet(
                    request["x_account_id"],
                    text=_publish_text(request["proposed_text"], request["destination_url"]),
                )
                tweet_id = str(tweet.get("id") or tweet.get("id_str") or tweet.get("tweet_id"))
                if not tweet_id:
                    raise ValueError("X Ads did not return a tweet ID.")
                request = self.repository.update(
                    "x_ads_publish_requests",
                    user_id=user_id,
                    filters={"id": request_id},
                    payload={"published_tweet_id": tweet_id},
                )
                self._event(user_id=user_id, request_id=request_id, event_type="promoted_only_post_created", status="completed", response={"tweet_id": tweet_id})
            promoted_id = str(request.get("promoted_tweet_id") or "")
            if not promoted_id:
                promoted = client.attach_promoted_tweet(request["x_account_id"], line_item_id=request["x_line_item_id"], tweet_id=tweet_id)
                promoted_id = str(promoted.get("id") or "")
                if not promoted_id:
                    raise ValueError("X Ads did not return a promoted tweet ID.")
                request = self.repository.update(
                    "x_ads_publish_requests",
                    user_id=user_id,
                    filters={"id": request_id},
                    payload={"promoted_tweet_id": promoted_id},
                )
                self._event(user_id=user_id, request_id=request_id, event_type="promoted_post_attached", status="completed", response={"promoted_tweet_id": promoted_id})
            source_ad = self.repository.get_one("twitter_ads", user_id=user_id, filters={"id": request["source_ad_id"]})
            created_ad = self.repository.get_one("twitter_ads", user_id=user_id, filters={"id": request["created_ad_id"]}) if request.get("created_ad_id") else self.repository.insert(
                "twitter_ads",
                {
                    "user_id": user_id, "project_id": request.get("project_id"), "name": f"{source_ad.get('name') or 'X Ad'} approved variant",
                    "campaign_name": source_ad.get("campaign_name"), "ad_group_name": source_ad.get("ad_group_name"),
                    "headline": request["proposed_text"][:120], "body": request["proposed_text"], "cta": source_ad.get("cta"),
                    "destination_url": request["destination_url"], "image_url": source_ad.get("image_url"), "video_url": source_ad.get("video_url"),
                    "status": "active", "x_connection_id": request["connection_id"], "x_account_id": request["x_account_id"],
                    "x_line_item_id": request["x_line_item_id"], "x_tweet_id": tweet_id, "x_promoted_tweet_id": promoted_id,
                    "source": "x_ads_publish", "last_synced_at": _now(), "sync_metadata": {"publish_request_id": request_id},
                },
            )
            if not request.get("created_ad_id"):
                request = self.repository.update("x_ads_publish_requests", user_id=user_id, filters={"id": request_id}, payload={"created_ad_id": created_ad["id"]})
            if request.get("ab_test_id"):
                test = {"id": request["ab_test_id"]}
            else:
                test = AdABTestService(repository=self.repository).create_test(
                    user_id=user_id, project_id=request["project_id"], name=f"Approved X ad test: {source_ad.get('name') or source_ad['id']}",
                    hypothesis=request.get("hypothesis"), primary_metric=request.get("primary_metric") or "ctr", ad_ids=[source_ad["id"], created_ad["id"]],
                )
                test = AdABTestService(repository=self.repository).update_status(user_id=user_id, test_id=test["id"], status="running")
                request = self.repository.update("x_ads_publish_requests", user_id=user_id, filters={"id": request_id}, payload={"ab_test_id": test["id"]})
            if request.get("outcome_id"):
                outcome = {"id": request["outcome_id"]}
            else:
                outcome = ImprovementOutcomeService(repository=self.repository).create_outcome(
                    user_id=user_id, project_id=request.get("project_id"), ad_lp_pair_id=request["ad_lp_pair_id"],
                    source_ai_result_id=request["source_ai_result_id"], title=f"Measure approved X ad variant: {created_ad['name']}",
                    description=request.get("hypothesis"), before_metrics=_ad_metrics(source_ad),
                )
                request = self.repository.update("x_ads_publish_requests", user_id=user_id, filters={"id": request_id}, payload={"outcome_id": outcome["id"]})
            updated = self.repository.update(
                "x_ads_publish_requests",
                user_id=user_id,
                filters={"id": request_id},
                payload={
                    "publish_status": "published",
                    "published_at": _now(),
                    "published_tweet_id": tweet_id,
                    "promoted_tweet_id": promoted_id,
                    "created_ad_id": created_ad["id"],
                    "ab_test_id": test["id"],
                    "outcome_id": outcome["id"],
                },
            )
            self._event(user_id=user_id, request_id=request_id, event_type="published", status="completed", response={"tweet_id": tweet_id, "promoted_tweet_id": promoted_id})
            self.repository.insert(
                "change_history",
                {
                    "user_id": user_id,
                    "project_id": request.get("project_id"),
                    "entity_type": "x_ads_publish_request",
                    "entity_id": request_id,
                    "action": "published",
                    "before_data": {"source_ad_id": source_ad["id"], "metrics": _ad_metrics(source_ad)},
                    "after_data": {"created_ad_id": created_ad["id"], "tweet_id": tweet_id, "promoted_tweet_id": promoted_id, "ab_test_id": test["id"], "outcome_id": outcome["id"]},
                    "summary": "Approved X Ads variant published and A/B test started.",
                    "reason": request.get("hypothesis"),
                },
            )
            return updated
        except Exception as exc:
            self.repository.update("x_ads_publish_requests", user_id=user_id, filters={"id": request_id}, payload={"publish_status": "failed", "error_message": str(exc)})
            self._event(user_id=user_id, request_id=request_id, event_type="publish_failed", status="failed", error=str(exc))
            raise

    def _connection_client(self, *, user_id: str, connection_id: str) -> tuple[dict[str, Any], XAdsClient]:
        connection = self.repository.get_one("x_ads_connections", user_id=user_id, filters={"id": connection_id})
        if connection.get("status") not in {"active", "pending"}:
            raise ValueError("X Ads connection is not active.")
        return connection, self._client(
            access_token=self.cipher.decrypt(connection["encrypted_access_token"]),
            access_token_secret=self.cipher.decrypt(connection["encrypted_access_token_secret"]),
        )

    def _client(self, *, access_token: str, access_token_secret: str) -> XAdsClient:
        if not self.settings.x_ads_consumer_key or not self.settings.x_ads_consumer_secret:
            raise ValueError("X_ADS_CONSUMER_KEY and X_ADS_CONSUMER_SECRET are required.")
        return XAdsClient(
            consumer_key=self.settings.x_ads_consumer_key,
            consumer_secret=self.settings.x_ads_consumer_secret,
            access_token=access_token,
            access_token_secret=access_token_secret,
            ads_base_url=self.settings.x_ads_api_base_url,
        )

    def _oauth_client(self) -> XOAuthClient:
        return XOAuthClient(
            consumer_key=self.settings.x_ads_consumer_key or "",
            consumer_secret=self.settings.x_ads_consumer_secret or "",
            oauth_base_url=self.settings.x_ads_oauth_base_url,
        )

    def _update_oauth_session(self, *, user_id: str, session_id: str, status: str, error_code: str | None = None) -> None:
        self.repository.update(
            "x_ads_oauth_sessions",
            user_id=user_id,
            filters={"id": session_id},
            payload={
                "status": status,
                "error_code": error_code,
                "completed_at": _now(),
                "encrypted_request_token_secret": None,
            },
        )

    def _frontend_redirect(self, return_path: str, result: str, reason: str | None) -> str:
        query = {"x_ads": result}
        if reason:
            query["reason"] = reason
        return f"{self.settings.frontend_app_url.rstrip('/')}{_safe_return_path(return_path)}?{urlencode(query)}"

    def _store_account(self, *, user_id: str, connection_id: str, account: dict[str, Any], client: XAdsClient) -> dict[str, Any]:
        account_id = str(account.get("id"))
        promotable_users = client.list_promotable_users(account_id)
        payload = {
            "connection_id": connection_id,
            "x_account_id": account_id,
            "name": str(account.get("name") or account_id),
            "currency": account.get("currency"),
            "timezone": account.get("timezone"),
            "permissions": account.get("approval_statuses") if isinstance(account.get("approval_statuses"), list) else [],
            "promotable_users": promotable_users,
            "status": account.get("entity_status") or "active",
            "raw_payload": account,
        }
        existing = self.repository.get_many("x_ads_accounts", user_id=user_id, filters={"connection_id": connection_id, "x_account_id": account_id}, limit=1)
        if existing:
            return self.repository.update("x_ads_accounts", user_id=user_id, filters={"id": existing[0]["id"]}, payload=payload)
        return self.repository.insert("x_ads_accounts", {"user_id": user_id, **payload})

    def _upsert_ad(self, *, user_id: str, connection_id: str, account_id: str, project_id: str | None, tweet: dict[str, Any], promoted_tweet: dict[str, Any], metrics: dict[str, Any]) -> dict[str, Any]:
        tweet_id = str(tweet.get("id") or tweet.get("tweet_id"))
        text = str(tweet.get("full_text") or tweet.get("text") or "")
        destination_url = _first_url(tweet) or "https://x.com"
        payload = {
            "project_id": project_id,
            "name": f"X Ad {tweet_id}",
            "headline": text[:120],
            "body": text,
            "destination_url": destination_url,
            "impressions": metrics["impressions"],
            "clicks": metrics["clicks"],
            "conversions": metrics["conversions"],
            "spend": metrics["spend"],
            "status": promoted_tweet.get("entity_status") or "active",
            "x_connection_id": connection_id,
            "x_account_id": account_id,
            "x_line_item_id": promoted_tweet.get("line_item_id"),
            "x_tweet_id": tweet_id,
            "x_promoted_tweet_id": promoted_tweet.get("id"),
            "source": "x_ads_sync",
            "last_synced_at": _now(),
            "sync_metadata": {"tweet": tweet, "promoted_tweet": promoted_tweet},
        }
        existing = self.repository.get_many("twitter_ads", user_id=user_id, filters={"x_connection_id": connection_id, "x_tweet_id": tweet_id}, limit=1)
        if existing:
            payload["sync_metadata"] = {**(existing[0].get("sync_metadata") or {}), **payload["sync_metadata"]}
            return self.repository.update("twitter_ads", user_id=user_id, filters={"id": existing[0]["id"]}, payload=payload)
        return self.repository.insert("twitter_ads", {"user_id": user_id, **payload})

    def _store_snapshots(self, *, user_id: str, connection_id: str, account_id: str, project_id: str | None, ad: dict[str, Any], stat: dict[str, Any]) -> None:
        for row in _daily_metrics(stat):
            payload = {
                "project_id": project_id,
                "twitter_ad_id": ad["id"],
                "connection_id": connection_id,
                "x_account_id": account_id,
                "x_line_item_id": ad.get("x_line_item_id"),
                "x_tweet_id": ad.get("x_tweet_id"),
                **row,
            }
            existing = self.repository.get_many("x_ads_metric_snapshots", user_id=user_id, filters={"connection_id": connection_id, "x_account_id": account_id, "x_tweet_id": ad.get("x_tweet_id"), "snapshot_date": row["snapshot_date"], "granularity": "DAY"}, limit=1)
            if existing:
                self.repository.update("x_ads_metric_snapshots", user_id=user_id, filters={"id": existing[0]["id"]}, payload=payload)
            else:
                self.repository.insert("x_ads_metric_snapshots", {"user_id": user_id, **payload})

    def _ensure_pair(self, *, user_id: str, project_id: str | None, ad: dict[str, Any]) -> None:
        if not project_id or not ad.get("destination_url"):
            return
        landing_pages = self.repository.get_many(
            "landing_pages",
            user_id=user_id,
            filters={"project_id": project_id, "url": ad["destination_url"]},
            limit=1,
        )
        if not landing_pages:
            return
        existing = self.repository.get_many(
            "ad_lp_pairs",
            user_id=user_id,
            filters={"twitter_ad_id": ad["id"], "landing_page_id": landing_pages[0]["id"]},
            limit=1,
        )
        if existing:
            return
        self.repository.insert(
            "ad_lp_pairs",
            {
                "user_id": user_id,
                "project_id": project_id,
                "twitter_ad_id": ad["id"],
                "landing_page_id": landing_pages[0]["id"],
                "name": f"{ad.get('name') or 'X Ad'} / {landing_pages[0].get('name') or 'LP'}",
                "status": "active",
            },
        )

    def _update_published_outcome(self, *, user_id: str, ad: dict[str, Any]) -> None:
        publish_request_id = (ad.get("sync_metadata") or {}).get("publish_request_id")
        if not publish_request_id:
            return
        requests = self.repository.get_many("x_ads_publish_requests", user_id=user_id, filters={"id": publish_request_id}, limit=1)
        if not requests or not requests[0].get("outcome_id"):
            return
        ImprovementOutcomeService(repository=self.repository).update_outcome(
            user_id=user_id,
            outcome_id=requests[0]["outcome_id"],
            payload={"after_metrics": _ad_metrics(ad), "measured_at": _now(), "outcome_status": "measured"},
        )

    def _event(self, *, user_id: str, request_id: str, event_type: str, status: str, response: dict[str, Any] | None = None, error: str | None = None) -> None:
        self.repository.insert("x_ads_publish_events", {"user_id": user_id, "publish_request_id": request_id, "event_type": event_type, "status": status, "response_payload": response or {}, "error_message": error})

    @staticmethod
    def _public_connection(row: dict[str, Any]) -> dict[str, Any]:
        return {key: value for key, value in row.items() if key not in {"encrypted_access_token", "encrypted_access_token_secret"}}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _token_hash(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _safe_return_path(value: str | None) -> str:
    path = (value or "/ad-optimization").strip()
    if not path.startswith("/") or path.startswith("//") or "://" in path:
        return "/ad-optimization"
    return path.split("?", 1)[0].split("#", 1)[0]


def _proposal_text(result: dict[str, Any]) -> str | None:
    output = result.get("output") or {}
    for key in ("suggested_value", "ad_copy", "copy", "text"):
        if output.get(key):
            return str(output[key])
    recommendations = output.get("recommendations") or []
    return str(recommendations[0]) if recommendations else None


def _first_url(tweet: dict[str, Any]) -> str | None:
    for item in ((tweet.get("entities") or {}).get("urls") or []):
        if isinstance(item, dict) and (item.get("expanded_url") or item.get("url")):
            return str(item.get("expanded_url") or item.get("url"))
    return None


def _aggregate_metrics(stat: dict[str, Any]) -> dict[str, Any]:
    rows = _daily_metrics(stat)
    return {
        "impressions": sum(int(row["impressions"]) for row in rows),
        "clicks": sum(int(row["clicks"]) for row in rows),
        "conversions": sum(int(row["conversions"]) for row in rows),
        "spend": sum(float(row["spend"]) for row in rows),
    }


def _daily_metrics(stat: dict[str, Any]) -> list[dict[str, Any]]:
    id_data = stat.get("id_data") or []
    metrics = id_data[0].get("metrics", {}) if id_data and isinstance(id_data[0], dict) else stat.get("metrics", {})
    dates = metrics.get("start_time") or []
    count = max([len(value) for value in metrics.values() if isinstance(value, list)] or [1])
    rows = []
    for index in range(count):
        value = lambda key: (metrics.get(key) or [0] * count)[index] or 0
        date = str(dates[index] if index < len(dates) else datetime.now(timezone.utc).date().isoformat())[:10]
        rows.append(
            {
                "snapshot_date": date,
                "granularity": "DAY",
                "impressions": int(value("impressions")),
                "clicks": int(value("url_clicks") or value("clicks")),
                "conversions": int(value("conversion_purchases") or value("conversion_sign_ups")),
                "spend": float(value("billed_charge_local_micro")) / 1_000_000,
                "engagements": int(value("engagements")),
                "video_views": int(value("video_total_views")),
                "raw_metrics": {key: values[index] for key, values in metrics.items() if isinstance(values, list) and index < len(values)},
            },
        )
    return rows


def _ad_metrics(ad: dict[str, Any]) -> dict[str, Any]:
    return {key: ad.get(key) or 0 for key in ("impressions", "clicks", "conversions", "spend", "ctr", "cpc", "cvr")}


def _publish_text(text: str, destination_url: str) -> str:
    return text if destination_url in text else f"{text.rstrip()}\n{destination_url}"
