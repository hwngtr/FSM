#!/usr/bin/env python3
"""Regenerate web/js/guard_config.js, Guard.tla, and docs/diagrams/*.mmd from FSM_TABLE."""

from __future__ import annotations

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "src"))

from npc.ai.codegen import write_all_artifacts  # noqa: E402


def main() -> None:
    paths = write_all_artifacts(REPO_ROOT)
    for p in paths:
        print(f"generated: {p.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    main()
