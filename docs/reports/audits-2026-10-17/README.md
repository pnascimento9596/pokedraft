# Audits of 2026-10-17

Byte copies of the two read-only audits and the dispatch brief that drive the 2026-10-17
improvement program. Later PRs cite these files by repo path.

| File | Source | SHA-256 |
| --- | --- | --- |
| `pokedraft-audit-2026-10-17.md` | Audit A (Opus, five auditors plus a coordinator who ran headless Chromium against production) | `e26ec6b90b5f781fdde313305563f7b21404e19e9f143946e555f9f58b8d947d` |
| `pokedraft-deep-audit-2026-10-17.md` | Audit G (Gemini, single-pass static read) | `65e7d7cc7aad602a04bc389a558bbb87eb1638cf71c4ab7d63e2a81515349842` |
| `pokedraft-implementation-prompt-2026-10-17.md` | The program brief. Where it and the audits disagree, the brief wins. | `4f22a4c4731e82a8025e66337a36d32f8be29eb2e7625c9301fdc9a88de059b7` |

`shots/` holds the 13 screenshots Audit A took against production. Audit A and the brief name
them at `~/Downloads/pokedraft-audit-2026-10-17-shots/`; read that path as `shots/` here.

Both audits read `40f3c92`. Their `file:line` pointers are pointers, not facts: each PR re-reads
the cited lines at its own branch head.

`program-log.md` gets one summary per finished wave.
