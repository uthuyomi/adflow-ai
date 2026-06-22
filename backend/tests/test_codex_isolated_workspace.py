from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

from backend.services.codex.isolated_workspace import ExecutionWorkspace, IsolatedWorkspaceManager


class CodexIsolatedWorkspaceTests(unittest.TestCase):
    def test_parallel_workspaces_are_unique_and_cleaned(self):
        with tempfile.TemporaryDirectory() as root:
            manager = IsolatedWorkspaceManager(root=root, runner_user=None)

            def fake_run(command, **kwargs):
                if command[:2] == ["git", "clone"]:
                    checkout = Path(command[-1])
                    checkout.mkdir(parents=True)
                    (checkout / ".git").mkdir()
                    (checkout / "marker.txt").write_text(checkout.parent.name, encoding="utf-8")
                return type("Result", (), {"returncode": 0})()

            def use_workspace(_index):
                with manager.clone(repository="owner/repo", branch="main", token="secret-token") as workspace:
                    self.assertNotIn("secret-token", str(workspace.repository))
                    return workspace.root, workspace.repository.read_text if False else (workspace.repository / "marker.txt").read_text(encoding="utf-8")

            with patch("backend.services.codex.isolated_workspace.subprocess.run", side_effect=fake_run):
                with ThreadPoolExecutor(max_workers=2) as executor:
                    results = list(executor.map(use_workspace, range(2)))

            self.assertNotEqual(results[0][0], results[1][0])
            self.assertFalse(results[0][0].exists())
            self.assertFalse(results[1][0].exists())

    def test_codex_environment_excludes_application_secrets(self):
        manager = IsolatedWorkspaceManager(runner_user=None)
        with patch.dict(
            os.environ,
            {
                "PATH": "test-path",
                "CODEX_API_KEY": "codex-key",
                "GITHUB_APP_PRIVATE_KEY": "github-secret",
                "SUPABASE_SERVICE_ROLE_KEY": "supabase-secret",
                "STRIPE_SECRET_KEY": "stripe-secret",
            },
            clear=True,
        ):
            environment = manager.codex_environment(ExecutionWorkspace(Path("."), Path(".")))
        self.assertEqual(environment["CODEX_API_KEY"], "codex-key")
        self.assertNotIn("GITHUB_APP_PRIVATE_KEY", environment)
        self.assertNotIn("SUPABASE_SERVICE_ROLE_KEY", environment)
        self.assertNotIn("STRIPE_SECRET_KEY", environment)

    def test_clone_token_is_only_in_clone_environment(self):
        manager = IsolatedWorkspaceManager(runner_user=None)
        with tempfile.TemporaryDirectory() as root:
            askpass = Path(root) / "askpass"
            environment = manager._clone_environment(token="short-lived", askpass=askpass)
        self.assertEqual(environment["GIT_PASSWORD"], "short-lived")
        self.assertEqual(environment["GIT_TERMINAL_PROMPT"], "0")

    def test_codex_command_places_global_approval_flag_before_exec(self):
        manager = IsolatedWorkspaceManager(runner_user=None)
        workspace = ExecutionWorkspace(Path("root"), Path("repository"))
        command = manager.command("codex", workspace, "prompt")
        self.assertEqual(command[:4], ["codex", "--ask-for-approval", "never", "exec"])
        self.assertIn("--ignore-user-config", command)

    def test_nested_untracked_file_is_collected(self):
        from backend.services.codex.codex_task_service import CodexTaskService

        with tempfile.TemporaryDirectory() as root:
            repository = Path(root)
            subprocess.run(["git", "init"], cwd=repository, check=True, capture_output=True)
            subprocess.run(["git", "config", "user.email", "test@example.com"], cwd=repository, check=True)
            subprocess.run(["git", "config", "user.name", "Test"], cwd=repository, check=True)
            (repository / "README.md").write_text("# Test\n", encoding="utf-8")
            subprocess.run(["git", "add", "README.md"], cwd=repository, check=True)
            subprocess.run(["git", "commit", "-m", "initial"], cwd=repository, check=True, capture_output=True)
            nested = repository / "docs" / "proof.md"
            nested.parent.mkdir()
            nested.write_text("proof\n", encoding="utf-8")

            files = CodexTaskService._changed_files(repository)

        self.assertEqual(files, [{"path": "docs/proof.md", "content": "proof\n"}])


if __name__ == "__main__":
    unittest.main()
