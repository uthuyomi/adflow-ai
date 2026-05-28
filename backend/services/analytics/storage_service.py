from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Protocol
from uuid import uuid4

import requests
from pydantic import BaseModel, ConfigDict

from backend.services.ads.ad_collector_service import FullAdsCollection
from backend.services.lp.lp_collector import LPCollection


class RawCollectionRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ads: FullAdsCollection
    lp: LPCollection


class StorageSaveResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    storage_provider: str
    record_id: str
    saved_at: datetime
    table: str | None = None


class CollectionStorage(Protocol):
    def save_raw_collection(self, record: RawCollectionRecord) -> StorageSaveResult:
        ...


class InMemoryCollectionStorage:
    def __init__(self) -> None:
        self.records: dict[str, RawCollectionRecord] = {}

    def save_raw_collection(self, record: RawCollectionRecord) -> StorageSaveResult:
        record_id = str(uuid4())
        self.records[record_id] = record
        return StorageSaveResult(
            storage_provider="memory",
            record_id=record_id,
            saved_at=datetime.now(timezone.utc),
        )


class SupabaseCollectionStorage:
    def __init__(
        self,
        *,
        supabase_url: str,
        supabase_key: str,
        table: str,
    ) -> None:
        self.supabase_url = supabase_url.rstrip("/")
        self.supabase_key = supabase_key
        self.table = table

    def save_raw_collection(self, record: RawCollectionRecord) -> StorageSaveResult:
        record_id = str(uuid4())
        saved_at = datetime.now(timezone.utc)
        payload = {
            "id": record_id,
            "saved_at": saved_at.isoformat(),
            "ads": record.ads.model_dump(mode="json"),
            "lp": record.lp.model_dump(mode="json"),
        }
        response = requests.post(
            f"{self.supabase_url}/rest/v1/{self.table}",
            headers={
                "apikey": self.supabase_key,
                "Authorization": f"Bearer {self.supabase_key}",
                "Content-Type": "application/json",
                "Prefer": "return=minimal",
            },
            json=payload,
            timeout=30,
        )
        try:
            response.raise_for_status()
        except requests.HTTPError as exc:
            raise ValueError(f"Supabase save failed: {response.text}") from exc

        return StorageSaveResult(
            storage_provider="supabase",
            record_id=record_id,
            saved_at=saved_at,
            table=self.table,
        )
