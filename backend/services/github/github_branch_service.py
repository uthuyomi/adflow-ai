from __future__ import annotations


class GitHubBranchService:
    def prepare_branch_plan(self, *, base_branch: str, branch_name: str) -> dict[str, str]:
        return {
            "base_branch": base_branch,
            "branch_name": branch_name,
            "status": "planned",
        }
