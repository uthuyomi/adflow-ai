from __future__ import annotations


class GitHubCommitService:
    def prepare_commit_plan(self, *, message: str, target_files: list[str]) -> dict[str, object]:
        return {
            "message": message,
            "target_files": target_files,
            "status": "planned",
        }
