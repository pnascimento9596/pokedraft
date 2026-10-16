"""Clean a raw GLM reply and check that it counts as a receipt.

Usage:
    python3 -I tools/review/strip-verdict.py <raw reply> <packet meta.json> [--out CLEAN]

Strips ANSI escapes and the braille spinner ollama prints, then requires the canary and the
full head SHA from the meta file and exactly one verdict. A verdict is a line that holds only the
word, optionally labelled `Verdict` and wrapped in Markdown (`**APPROVE**`, `# APPROVE`,
`| Verdict | **APPROVE** |`), so prose that quotes "APPROVE or REQUEST_CHANGES" does not count.
Exit 0 for APPROVE, 2 for REQUEST_CHANGES, 1 when the reply does not count.
"""

import argparse
import json
import pathlib
import re
import sys

ANSI = re.compile(r"\x1b\[[0-9;?]*[A-Za-z]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)")
BRAILLE = re.compile(r"[⠀-⣿]\s*")
VERDICT = re.compile(
    r"^[\s#*|>`_]*(?:(?i:verdict)[\s*|`_:]*)?(APPROVE|REQUEST_CHANGES)[\s*|`_.]*$", re.MULTILINE
)


def main() -> None:
    parser = argparse.ArgumentParser(description="Clean and check a GLM review reply.")
    parser.add_argument("reply", help="raw ollama output")
    parser.add_argument("meta", help="the .meta.json written next to the packet")
    parser.add_argument("--out", help="write the cleaned reply here")
    args = parser.parse_args()

    meta = json.loads(pathlib.Path(args.meta).read_text())
    text = BRAILLE.sub("", ANSI.sub("", pathlib.Path(args.reply).read_text()))
    if args.out:
        pathlib.Path(args.out).write_text(text)

    problems = []
    if meta["canary"] not in text:
        problems.append(f"canary {meta['canary']} not echoed")
    if meta["sha"] not in text:
        problems.append(f"head SHA {meta['sha']} not echoed in full")
    verdicts = sorted(set(VERDICT.findall(text)))
    if len(verdicts) != 1:
        problems.append(f"expected exactly one verdict line value, found {verdicts or 'none'}")

    report = {"sha": meta["sha"], "canary": meta["canary"], "verdicts": verdicts}
    if problems:
        print(json.dumps({**report, "counts": False, "problems": problems}))
        sys.exit(1)
    print(json.dumps({**report, "counts": True, "verdict": verdicts[0]}))
    sys.exit(0 if verdicts[0] == "APPROVE" else 2)


if __name__ == "__main__":
    main()
