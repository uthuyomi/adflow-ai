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
        pair_name = str(request.metadata.get("pair_name") or request.query)
        now = datetime.now(timezone.utc).isoformat()
        templates = [
            ("x", "X", "広告レポート作成が毎週つらい。媒体ごとの数字転記と説明文作成に時間が溶ける。"),
            ("yahoo_chiebukuro", "Yahoo知恵袋", "広告分析を簡単にしたいです。CTRやCVRの見方が難しく、何を改善すべきか分かりません。"),
            ("amazon_review", "Amazonレビュー", "レポートツールは高いのに設定が面倒。導入しても効果が見えるまで時間がかかります。"),
            ("rakuten_review", "楽天レビュー", "管理画面が複雑で、クライアントへの共有資料を作るのが大変です。"),
            ("kakaku_review", "価格.comレビュー", "競合ツールはUIが分かりにくく、サポートも弱いので乗り換えたい。"),
            ("youtube_comment", "YouTubeコメント", "広告運用の報告書を自動化できるなら欲しい。グラフ作成とコメント作成が特に面倒。"),
            ("google_search", "Google検索結果", f"{request.query} 比較 自動化 レポート 改善 方法"),
            ("google_related_search", "Google関連検索", f"{request.query} レポート作成 面倒 代理店 共有"),
            ("google_suggest", "Googleサジェスト", f"{request.query} 分析 自動化 安い 簡単"),
            ("google_people_also_ask", "Google People Also Ask", f"{request.query} は広告分析とレポート作成をどこまで自動化できますか"),
            ("competitor_lp", "競合LP", "競合は効率化を訴求しているが、媒体横断の説明文作成や顧客共有までの解決は弱い。"),
            ("competitor_review", "競合レビュー", "便利だが高い。初期設定が難しく、使いこなすまで学習コストが高い。"),
            ("comparison_article", "比較記事", "広告管理ツールは多いが、分析から改善案、LP整合性まで一気通貫で見る製品は少ない。"),
            ("note", "note", "運用者は数値を見るだけでなく、なぜ悪いのかを説明する文章作成に疲れている。"),
            ("qiita", "Qiita", "広告データをAPIで集めても、結局レポート化と改善提案を人が書いている。"),
            ("zenn", "Zenn", "自動化したいのは収集よりも、示唆抽出、共有、次の施策化の部分。"),
            ("forum", "フォーラム", "複数媒体を見ながらLPも確認する運用が面倒。広告とLPのズレを自動で見たい。"),
            ("app_store_review", "App Storeレビュー", "スマホで状況確認できるのは良いが、詳細分析や共有には弱い。"),
            ("google_play_review", "Google Playレビュー", "通知は便利だが、改善アクションまで出してほしい。"),
        ]
        signals = [
            DemandRawSignal(
                source_type=source_type,
                source_name=source_name,
                connector_key=self.connector_key,
                external_id=f"synthetic-{index + 1}",
                url=f"https://example.invalid/demand/{source_type}/{index + 1}",
                title=f"{request.query} signal {index + 1}",
                body=f"{body} 対象ペア: {pair_name}",
                posted_at=now,
                collected_at=now,
                engagement={"likes": 8 + index * 3, "comments": 1 + index % 5, "shares": index % 4},
                like_count=8 + index * 3,
                comment_count=1 + index % 5,
                share_count=index % 4,
                language="ja",
                metadata={"synthetic": True, "pair_name": pair_name},
            )
            for index, (source_type, source_name, body) in enumerate(templates[: request.max_results])
        ]
        return DemandConnectorResponse(
            source_type=self.source_type,
            connector_key=self.connector_key,
            status="completed",
            signals=signals,
            metadata={"synthetic": True},
        )
