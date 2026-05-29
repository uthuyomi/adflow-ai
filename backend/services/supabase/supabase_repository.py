from __future__ import annotations

from typing import Any

import requests


class SupabaseRepository:
    def __init__(self, *, supabase_url: str, supabase_key: str) -> None:
        self.supabase_url = supabase_url.rstrip("/")
        self.supabase_key = supabase_key

    def get_user_id(self, access_token: str) -> str:
        response = requests.get(
            f"{self.supabase_url}/auth/v1/user",
            headers={
                "apikey": self.supabase_key,
                "Authorization": f"Bearer {access_token}",
            },
            timeout=30,
        )
        self._raise(response, "Supabase auth lookup failed")
        user_id = response.json().get("id")
        if not user_id:
            raise ValueError("Supabase auth response did not include a user id.")
        return user_id

    def get_one(
        self,
        table: str,
        *,
        user_id: str,
        filters: dict[str, Any],
        select: str = "*",
    ) -> dict[str, Any]:
        rows = self.get_many(table, user_id=user_id, filters=filters, select=select, limit=1)
        if not rows:
            raise ValueError(f"{table} record was not found.")
        return rows[0]

    def get_many(
        self,
        table: str,
        *,
        user_id: str,
        filters: dict[str, Any] | None = None,
        select: str = "*",
        order: str | None = None,
        limit: int | None = None,
    ) -> list[dict[str, Any]]:
        params: dict[str, Any] = {"select": select, "user_id": f"eq.{user_id}"}
        for key, value in (filters or {}).items():
            if isinstance(value, list):
                params[key] = f"in.({','.join(str(item) for item in value)})"
            else:
                params[key] = f"eq.{value}"
        if order:
            params["order"] = order
        if limit:
            params["limit"] = str(limit)

        response = requests.get(
            f"{self.supabase_url}/rest/v1/{table}",
            headers=self._headers(),
            params=params,
            timeout=30,
        )
        self._raise(response, f"Supabase select failed for {table}")
        return response.json()

    def get_related_many(
        self,
        table: str,
        *,
        filters: dict[str, Any],
        select: str = "*",
        order: str | None = None,
        limit: int | None = None,
    ) -> list[dict[str, Any]]:
        params: dict[str, Any] = {"select": select}
        for key, value in filters.items():
            if isinstance(value, list):
                params[key] = f"in.({','.join(str(item) for item in value)})"
            else:
                params[key] = f"eq.{value}"
        if order:
            params["order"] = order
        if limit:
            params["limit"] = str(limit)

        response = requests.get(
            f"{self.supabase_url}/rest/v1/{table}",
            headers=self._headers(),
            params=params,
            timeout=30,
        )
        self._raise(response, f"Supabase select failed for {table}")
        return response.json()

    def insert(self, table: str, payload: dict[str, Any]) -> dict[str, Any]:
        response = requests.post(
            f"{self.supabase_url}/rest/v1/{table}",
            headers={**self._headers(), "Prefer": "return=representation"},
            json=payload,
            timeout=30,
        )
        self._raise(response, f"Supabase insert failed for {table}")
        rows = response.json()
        return rows[0] if rows else payload

    def update(
        self,
        table: str,
        *,
        user_id: str,
        filters: dict[str, Any],
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        params = {"user_id": f"eq.{user_id}", **{key: f"eq.{value}" for key, value in filters.items()}}
        response = requests.patch(
            f"{self.supabase_url}/rest/v1/{table}",
            headers={**self._headers(), "Prefer": "return=representation"},
            params=params,
            json=payload,
            timeout=30,
        )
        self._raise(response, f"Supabase update failed for {table}")
        rows = response.json()
        return rows[0] if rows else payload

    def create_improvement_outcome(self, payload: dict[str, Any]) -> dict[str, Any]:
        return self.insert("improvement_outcomes", payload)

    def get_improvement_outcomes_by_pair(self, *, user_id: str, pair_id: str, limit: int = 50) -> list[dict[str, Any]]:
        return self.get_many(
            "improvement_outcomes",
            user_id=user_id,
            filters={"ad_lp_pair_id": pair_id},
            order="created_at.desc",
            limit=limit,
        )

    def get_latest_improvement_outcome_by_pair(self, *, user_id: str, pair_id: str) -> dict[str, Any]:
        rows = self.get_improvement_outcomes_by_pair(user_id=user_id, pair_id=pair_id, limit=1)
        if not rows:
            raise ValueError("No improvement outcome was found for this pair.")
        return rows[0]

    def update_improvement_outcome(self, *, user_id: str, outcome_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        return self.update(
            "improvement_outcomes",
            user_id=user_id,
            filters={"id": outcome_id},
            payload=payload,
        )

    def get_improvement_outcomes_for_analysis_context(
        self,
        *,
        user_id: str,
        pair_id: str,
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        return self.get_improvement_outcomes_by_pair(user_id=user_id, pair_id=pair_id, limit=limit)

    def _headers(self) -> dict[str, str]:
        return {
            "apikey": self.supabase_key,
            "Authorization": f"Bearer {self.supabase_key}",
            "Content-Type": "application/json",
        }

    @staticmethod
    def _raise(response: requests.Response, message: str) -> None:
        try:
            response.raise_for_status()
        except requests.HTTPError as exc:
            raise ValueError(f"{message}: {response.text}") from exc
