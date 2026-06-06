from __future__ import annotations

from datetime import datetime, timezone

from backend.core.config import Settings
from backend.services.demand.demand_models import DemandConnectorRequest, DemandConnectorResponse, DemandRawSignal


class SyntheticDemandConnector:
    connector_key = "synthetic"
    source_type = "synthetic"

    def is_configured(self, settings: Settings) -> bool:
        return True

    def collect(self, request: DemandConnectorRequest) -> DemandConnectorResponse:
        subject = str(request.metadata.get("product_idea") or request.metadata.get("pair_name") or request.query)
        now = datetime.now(timezone.utc).isoformat()
        is_ja = request.language == "ja"
        templates = (
            [
                "毎回の手作業に時間がかかり、もっと簡単な方法を探している。",
                "既存ツールは設定が複雑で、使い始めるまでの負担が大きい。",
                "料金に対して得られる効果が分かりにくく、導入判断が難しい。",
                "複数の情報を手作業でまとめる必要があり、ミスが起きやすい。",
                "結果の根拠が見えず、チームや顧客へ説明しにくい。",
                "作業を自動化したいが、既存の選択肢は柔軟性が不足している。",
                "必要な機能が複数サービスに分かれており、運用が煩雑になる。",
                "改善案は得られても、優先順位を判断できない。",
            ]
            if is_ja
            else [
                "The recurring manual work takes too long, and users want a simpler workflow.",
                "Existing tools are difficult to set up and create too much onboarding effort.",
                "The value is unclear compared with the pricing, which makes adoption difficult.",
                "Users manually combine information from multiple tools, which creates errors.",
                "The evidence behind results is unclear, making them difficult to explain to a team or client.",
                "Users want to automate the work, but existing alternatives lack flexibility.",
                "Required features are fragmented across multiple services, making operations complicated.",
                "Users receive improvement ideas but cannot decide what to prioritize.",
            ]
        )
        subject_label = "対象案" if is_ja else "Product idea"
        signals = [
            DemandRawSignal(
                source_type="synthetic",
                source_name="Synthetic fallback",
                connector_key=self.connector_key,
                external_id=f"synthetic-{index + 1}",
                title=f"Synthetic hypothesis {index + 1}",
                body=f"{body} {subject_label}: {subject}",
                posted_at=now,
                collected_at=now,
                engagement={"likes": 0, "comments": 0, "shares": 0},
                language=request.language,
                metadata={"synthetic": True, "product_idea": subject},
            )
            for index, body in enumerate(templates[: request.max_results])
        ]
        return DemandConnectorResponse(
            source_type=self.source_type,
            connector_key=self.connector_key,
            status="completed",
            signals=signals,
            metadata={"synthetic": True},
        )
