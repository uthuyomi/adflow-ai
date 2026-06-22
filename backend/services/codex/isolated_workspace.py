from __future__ import annotations

from contextlib import contextmanager
from dataclasses import dataclass
import os
from pathlib import Path
import shutil
import stat
import subprocess
import tempfile
import threading
from typing import Iterator
from uuid import uuid4

_UID_LOCK = threading.Lock()
_ACTIVE_UIDS: set[int] = set()


@dataclass(frozen=True)
class ExecutionWorkspace:
    root: Path
    repository: Path
    runner_uid: int | None = None


class IsolatedWorkspaceManager:
    def __init__(self, *, root: str | None = None, runner_user: str | None = None) -> None:
        self.root = Path(root or tempfile.gettempdir()).resolve()
        self.runner_user = (runner_user or "").strip()

    @contextmanager
    def clone(self, *, repository: str, branch: str, token: str) -> Iterator[ExecutionWorkspace]:
        workspace_id = uuid4()
        execution_root = self.root / f"adflow-codex-{workspace_id}"
        checkout = execution_root / "repository"
        runner_uid = self._allocate_uid(workspace_id)
        execution_root.mkdir(parents=True, exist_ok=False)
        askpass = execution_root / ("git-askpass.bat" if os.name == "nt" else "git-askpass.sh")
        try:
            self._write_askpass(askpass)
            clone_env = self._clone_environment(token=token, askpass=askpass)
            subprocess.run(
                ["git", "clone", "--depth", "1", "--branch", branch, f"https://github.com/{repository}.git", str(checkout)],
                check=True,
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                env=clone_env,
            )
            askpass.unlink(missing_ok=True)
            self._restrict_workspace(execution_root, runner_uid)
            yield ExecutionWorkspace(root=execution_root, repository=checkout, runner_uid=runner_uid)
        finally:
            shutil.rmtree(execution_root, ignore_errors=True)
            if runner_uid is not None:
                with _UID_LOCK:
                    _ACTIVE_UIDS.discard(runner_uid)

    def codex_environment(self, workspace: ExecutionWorkspace) -> dict[str, str]:
        allowed = (
            "PATH",
            "SYSTEMROOT",
            "WINDIR",
            "HOME",
            "USERPROFILE",
            "TMP",
            "TEMP",
            "LANG",
            "LC_ALL",
            "SSL_CERT_FILE",
            "CODEX_CA_CERTIFICATE",
            "CODEX_API_KEY",
            "CODEX_ACCESS_TOKEN",
        )
        environment = {key: os.environ[key] for key in allowed if os.environ.get(key)}
        if workspace.runner_uid is not None:
            environment["HOME"] = str(workspace.root)
            environment["USER"] = f"codex-{workspace.runner_uid}"
            environment["LOGNAME"] = environment["USER"]
            environment["TMP"] = str(workspace.root)
            environment["TEMP"] = str(workspace.root)
        elif os.name != "nt" and self.runner_user:
            environment["HOME"] = f"/home/{self.runner_user}"
        return environment

    def command(self, executable: str, workspace: ExecutionWorkspace, prompt: str) -> list[str]:
        command = [
            executable,
            "--ask-for-approval",
            "never",
            "exec",
            "--ephemeral",
            "--ignore-user-config",
            "--sandbox",
            "workspace-write",
            "-C",
            str(workspace.repository),
            prompt,
        ]
        if workspace.runner_uid is not None:
            return [
                "setpriv",
                f"--reuid={workspace.runner_uid}",
                f"--regid={workspace.runner_uid}",
                "--clear-groups",
                "--no-new-privs",
                *command,
            ]
        return command

    @staticmethod
    def _write_askpass(path: Path) -> None:
        if os.name == "nt":
            path.write_text("@echo off\r\nif /I \"%1\"==\"Username for\" (echo x-access-token) else (echo %GIT_PASSWORD%)\r\n", encoding="ascii")
        else:
            path.write_text(
                "#!/bin/sh\ncase \"$1\" in *Username*) printf '%s\\n' x-access-token ;; *) printf '%s\\n' \"$GIT_PASSWORD\" ;; esac\n",
                encoding="ascii",
            )
            path.chmod(path.stat().st_mode | stat.S_IXUSR)

    @staticmethod
    def _clone_environment(*, token: str, askpass: Path) -> dict[str, str]:
        environment = {
            key: value
            for key, value in os.environ.items()
            if key.upper() not in {"GITHUB_APP_PRIVATE_KEY", "GITHUB_WEBHOOK_SECRET", "GITHUB_TOKEN", "GH_TOKEN"}
        }
        environment.update(
            {
                "GIT_ASKPASS": str(askpass),
                "GIT_TERMINAL_PROMPT": "0",
                "GIT_PASSWORD": token,
            }
        )
        return environment

    def _restrict_workspace(self, execution_root: Path, runner_uid: int | None) -> None:
        if runner_uid is None:
            return
        subprocess.run(["chown", "-R", f"{runner_uid}:{runner_uid}", str(execution_root)], check=True, capture_output=True)
        execution_root.chmod(0o700)

    @staticmethod
    def _allocate_uid(workspace_id) -> int | None:
        if os.name == "nt" or os.geteuid() != 0 or not shutil.which("setpriv") or not shutil.which("chown"):
            return None
        candidate = 20000 + workspace_id.int % 30000
        with _UID_LOCK:
            while candidate in _ACTIVE_UIDS:
                candidate = 20000 + ((candidate - 19999) % 30000)
            _ACTIVE_UIDS.add(candidate)
        return candidate
