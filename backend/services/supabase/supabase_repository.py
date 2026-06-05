from __future__ import annotations

from typing import Any

import requests


class SupabaseRepository:
    def __init__(self, *, supabase_url: str, supabase_key: str) -> None:
        self.supabase_url = supabase_url.rstrip("/")
        self.supabase_key = supabase_key

    def get_user(self, access_token: str) -> dict[str, Any]:
        response = requests.get(
            f"{self.supabase_url}/auth/v1/user",
            headers={
                "apikey": self.supabase_key,
                "Authorization": f"Bearer {access_token}",
            },
            timeout=30,
        )
        self._raise(response, "Supabase auth lookup failed")
        user = response.json()
        user_id = user.get("id")
        if not user_id:
            raise ValueError("Supabase auth response did not include a user id.")
        return user

    def get_user_id(self, access_token: str) -> str:
        return str(self.get_user(access_token)["id"])

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

    def rpc(self, function_name: str, payload: dict[str, Any]) -> Any:
        response = requests.post(
            f"{self.supabase_url}/rest/v1/rpc/{function_name}",
            headers=self._headers(),
            json=payload,
            timeout=30,
        )
        self._raise(response, f"Supabase RPC failed for {function_name}")
        return response.json()

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

    def create_demand_source_run(self, payload: dict[str, Any]) -> dict[str, Any]:
        return self.insert("demand_source_runs", payload)

    def update_demand_source_run(self, *, user_id: str, source_run_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        return self.update("demand_source_runs", user_id=user_id, filters={"id": source_run_id}, payload=payload)

    def create_demand_connector_log(self, payload: dict[str, Any]) -> dict[str, Any]:
        return self.insert("demand_connector_logs", payload)

    def insert_demand_signals(self, signals: list[dict[str, Any]]) -> list[dict[str, Any]]:
        return [self.insert("demand_intelligence_signals", signal) for signal in signals]

    def update_demand_signal_quality(self, *, user_id: str, signal_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        return self.update("demand_intelligence_signals", user_id=user_id, filters={"id": signal_id}, payload=payload)

    def insert_demand_signal_validations(self, validations: list[dict[str, Any]]) -> list[dict[str, Any]]:
        return [self.insert("demand_signal_validations", validation) for validation in validations]

    def update_demand_cluster_validation(self, *, run_id: str, cluster_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        response = requests.patch(
            f"{self.supabase_url}/rest/v1/demand_intelligence_clusters",
            headers={**self._headers(), "Prefer": "return=representation"},
            params={"run_id": f"eq.{run_id}", "id": f"eq.{cluster_id}"},
            json=payload,
            timeout=30,
        )
        self._raise(response, "Supabase update failed for demand_intelligence_clusters")
        rows = response.json()
        return rows[0] if rows else payload

    def insert_demand_solution_fits(self, fits: list[dict[str, Any]]) -> list[dict[str, Any]]:
        return [self.insert("demand_solution_fits", fit) for fit in fits]

    def insert_demand_signal_snapshots(self, snapshots: list[dict[str, Any]]) -> list[dict[str, Any]]:
        return [self.insert("demand_signal_snapshots", snapshot) for snapshot in snapshots]

    def insert_demand_search_signals(self, signals: list[dict[str, Any]]) -> list[dict[str, Any]]:
        return [self.insert("demand_search_signals", signal) for signal in signals]

    def insert_demand_market_size_estimates(self, estimates: list[dict[str, Any]]) -> list[dict[str, Any]]:
        return [self.insert("demand_market_size_estimates", estimate) for estimate in estimates]

    def insert_demand_outcome_learning_links(self, links: list[dict[str, Any]]) -> list[dict[str, Any]]:
        return [self.insert("demand_outcome_learning_links", link) for link in links]

    def get_demand_snapshots_for_cluster(
        self,
        *,
        user_id: str,
        pair_id: str,
        cluster_name: str | None = None,
        limit: int = 50,
    ) -> list[dict[str, Any]]:
        filters: dict[str, Any] = {"ad_lp_pair_id": pair_id}
        if cluster_name:
            filters["cluster_name"] = cluster_name
        return self.get_many("demand_signal_snapshots", user_id=user_id, filters=filters, order="snapshot_date.desc", limit=limit)

    def get_demand_validations_for_run(self, *, user_id: str, run_id: str) -> list[dict[str, Any]]:
        return self.get_many("demand_signal_validations", user_id=user_id, filters={"run_id": run_id}, order="created_at.desc")

    def get_demand_solution_fits_for_run(self, *, user_id: str, run_id: str) -> list[dict[str, Any]]:
        return self.get_many("demand_solution_fits", user_id=user_id, filters={"run_id": run_id}, order="fit_score.desc")

    def get_demand_source_runs_for_run(self, *, user_id: str, run_id: str) -> list[dict[str, Any]]:
        return self.get_many("demand_source_runs", user_id=user_id, filters={"run_id": run_id}, order="created_at.asc")

    def get_demand_evidence_for_run(self, *, run_id: str) -> list[dict[str, Any]]:
        return self.get_related_many("demand_intelligence_signals", filters={"run_id": run_id}, order="created_at.asc")

    def get_demand_search_signals_for_run(self, *, user_id: str, run_id: str) -> list[dict[str, Any]]:
        return self.get_many("demand_search_signals", user_id=user_id, filters={"run_id": run_id}, order="created_at.desc")

    def get_demand_market_size_for_run(self, *, user_id: str, run_id: str) -> list[dict[str, Any]]:
        return self.get_many("demand_market_size_estimates", user_id=user_id, filters={"run_id": run_id}, order="market_size_score.desc")

    def get_demand_outcome_learning_for_run(self, *, user_id: str, run_id: str) -> list[dict[str, Any]]:
        return self.get_many("demand_outcome_learning_links", user_id=user_id, filters={"run_id": run_id}, order="created_at.desc")

    def update_demand_run_summaries(
        self,
        *,
        user_id: str,
        run_id: str,
        source_status_summary: dict[str, Any],
        validation_summary: dict[str, Any],
        solution_fit_summary: dict[str, Any],
        monitoring_summary: dict[str, Any],
    ) -> dict[str, Any]:
        return self.update(
            "demand_intelligence_runs",
            user_id=user_id,
            filters={"id": run_id},
            payload={
                "source_status_summary": source_status_summary,
                "validation_summary": validation_summary,
                "solution_fit_summary": solution_fit_summary,
                "monitoring_summary": monitoring_summary,
            },
        )

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
