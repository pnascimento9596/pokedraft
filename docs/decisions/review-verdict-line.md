# Review verdict line

Green chore. The review packet now asks for the verdict alone on its own line.

## Why

`tools/review/strip-verdict.py` counts a GLM reply only when one line holds nothing but the
verdict, optionally labelled and wrapped in Markdown. That rule is deliberate: GLM quotes the
prompt's "APPROVE or REQUEST_CHANGES" in prose, so a bare word search would count the wrong thing.
The preamble never said so, and three replies that approved did not count:

- PR #89 at `60dc61d`: the bold verdict, then the head and the canary, on one line.
- PR #92 at `5b2229a`: the bold verdict, then the canary, on one line.
- PR #93 at `fc9bae8`: a heading that held the verdict and a sentence about the head.

Each needed a rerun at the same head with a fresh canary.

## Decision

Tell the reviewer the format the parser already requires instead of loosening the parser. A
looser parser would have to tell a verdict apart from prose that mentions one, which is the
problem the strict rule solves.

## Not done

The parser is unchanged. Whether the instruction stops the drift is measured on the next reviews.
