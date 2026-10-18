"""Build a GLM review packet for the exact head of a pokedraft branch.

Usage:
    python3 -I tools/review/review-packet.py <name> <repo> <dispatch doc> [evidence ...]
        [--out-dir DIR] [--exclude PATH ...] [--base REF]

Prints one JSON line with the head SHA, base SHA, canary, packet path and packet size.
See tools/review/README.md for the full review loop.
"""

import argparse
import json
import pathlib
import secrets
import subprocess
import sys
import tempfile

PREAMBLE = (
    "Independent Pokedraft dispatch review. Read all supplied diff and evidence. "
    "Return APPROVE or REQUEST_CHANGES, exact head SHA and canary. "
    "Put the verdict alone on its own line, for example **APPROVE**, with nothing else on it. "
    "Separate blockers from optional polish. Do not invent tool execution. "
    "This is GLM-first packet review per repo overrides. "
    "A commit after this head voids this receipt.\n"
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build a GLM review packet for HEAD.")
    parser.add_argument("name", help="short dispatch name, used in the canary and file names")
    parser.add_argument("repo", help="path to the repository checkout under review")
    parser.add_argument("dispatch", help="dispatch document, relative to the repo or absolute")
    parser.add_argument("evidence", nargs="*", help="evidence files appended verbatim")
    parser.add_argument(
        "--out-dir",
        help="directory for the packet and its meta file (default: a new temporary directory)",
    )
    parser.add_argument(
        "--exclude",
        action="append",
        default=[],
        metavar="PATH",
        help="leave PATH out of both diffs, e.g. src/engine/versions/v5 (repeatable)",
    )
    parser.add_argument("--base", default="origin/main", help="base ref (default: origin/main)")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    repo = pathlib.Path(args.repo).resolve()

    def git(*git_args: str) -> str:
        return subprocess.check_output(["git", *git_args], cwd=repo, text=True)

    if git("status", "--porcelain"):
        sys.exit("review requires a clean tree: commit or remove every change first")

    head = git("rev-parse", "HEAD").strip()
    base = git("rev-parse", args.base).strip()
    canary = f"{args.name}-{secrets.token_hex(16)}"
    meta = {"sha": head, "base": base, "canary": canary}

    out_dir = (
        pathlib.Path(args.out_dir)
        if args.out_dir
        else pathlib.Path(tempfile.mkdtemp(prefix="pokedraft-review-"))
    )
    out_dir.mkdir(parents=True, exist_ok=True)
    packet = out_dir / f"pokedraft-{args.name}-review.packet"

    pathspec = ["--", ".", *(f":!{path}" for path in args.exclude)] if args.exclude else []
    span = f"{args.base}...HEAD"
    parts = [
        PREAMBLE,
        json.dumps(meta),
        "DISPATCH",
        (repo / args.dispatch).read_text(),
        "OVERRIDES",
        (repo / "tools/pstack-core/pokedraft-overrides.md").read_text(),
        "DIFF STAT",
        git("diff", "--stat", span, *pathspec),
        "FULL DIFF",
        git("diff", "--no-ext-diff", span, *pathspec),
    ]
    if args.exclude:
        parts.insert(2, "EXCLUDED FROM BOTH DIFFS\n" + "\n".join(args.exclude))
    for name in args.evidence:
        path = pathlib.Path(name)
        parts.extend([f"EVIDENCE {path}", path.read_text()])

    packet.write_text("\n\n".join(parts))
    packet.with_suffix(".meta.json").write_text(json.dumps(meta))
    print(json.dumps({**meta, "packet": str(packet), "bytes": packet.stat().st_size}))


if __name__ == "__main__":
    main()
