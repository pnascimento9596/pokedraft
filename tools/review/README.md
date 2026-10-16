# Review packet tools

The merge receipt for a pokedraft PR comes from GLM 5.3 Flash reading a packet built from the
exact PR head (`tools/pstack-core/pokedraft-overrides.md`, Review). These two scripts build that
packet and check the reply. They need Python 3.9 or later and nothing outside the standard
library.

## 1. Build the packet

The tree must be clean, because the packet describes `HEAD` and nothing else. Commit and push
first.

```sh
python3 -I tools/review/review-packet.py <name> <repo> <dispatch doc> [evidence ...] \
  --out-dir <dir> [--exclude <path> ...] [--base origin/main]
```

- `<name>` is a short dispatch name. It prefixes the canary and names the packet file.
- `<repo>` is the checkout under review. `<dispatch doc>` is read relative to it, or absolute.
- Each evidence file (gate logs, Playwright summaries, a previous verdict) is appended verbatim.
- `--out-dir` holds the packet and its `.meta.json`. Without it the script makes a new temporary
  directory. Keep packets out of the repository.
- `--exclude <path>` adds `:!<path>` to both `git diff` calls (stat and full). Use it for frozen
  engine bundles, which are byte copies whose provenance a gate already proves:
  `--exclude src/engine/versions/v5`. The packet lists every excluded path.

It prints one JSON line:

```json
{
  "sha": "<head>",
  "base": "<origin/main>",
  "canary": "<name>-<32 hex>",
  "packet": "<dir>/pokedraft-<name>-review.packet",
  "bytes": 123456
}
```

## 2. Run GLM

```sh
ollama run glm-5.3-flash:cloud --think high --hidethinking < <packet> > <dir>/reply.raw
```

If `ollama` is unreachable or the model does not run, the overrides name the fallback reviewer.
Never swap in another model silently.

## 3. Check the reply

ollama writes ANSI escapes and a braille spinner into the captured output. Strip them, then
confirm the reply echoes the canary and the head SHA:

```sh
python3 -I tools/review/strip-verdict.py <dir>/reply.raw <dir>/pokedraft-<name>-review.meta.json \
  --out <dir>/reply.txt
```

It removes `\x1b[...]` sequences and `re.sub(r'[⠀-⣿]\s*', '', text)`, then requires the canary,
the full 40-character head SHA and exactly one of `APPROVE` or `REQUEST_CHANGES`. Exit 0 is
APPROVE, 2 is REQUEST_CHANGES, 1 means the reply does not count (missing canary, missing or short
SHA, no verdict, or both words). A reply that does not count is not a receipt. Rerun the review.

Any commit after an APPROVE voids it. Re-review the new head.

## Fix rounds

For round 2 and later, add one evidence file that holds the previous verdict verbatim followed by
the delta since that head:

```sh
{ cat <dir>/reply.txt; echo; git diff <previous head> HEAD; } > <dir>/round-1-verdict-and-delta.txt
python3 -I tools/review/review-packet.py <name>-r2 <repo> <dispatch doc> \
  <gate logs> <dir>/round-1-verdict-and-delta.txt --out-dir <dir>
```

The overrides allow at most 2 review rounds per head and 3 fix rounds before stopping to report.

## Older wrapper

`scripts/review/glm-review.sh` is the dispatch 1 wrapper for data and scouting reviews. It
summarizes the generated data files instead of inlining them. These tools are the general path.
