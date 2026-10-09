---
name: interrogate
description: Adversarial review using the portable rubric and references. In pokedraft it is the rubric the fallback reviewer applies; the merge receipt rules live in pokedraft-overrides.md.
---

# Interrogate (portable)

This tree vendors the rubric and references only. It does not vendor Cursor `Task` spawn text, model slugs, or home-directory routing.

## What this is

Independent reviewers challenge a diff against the same rubric. Agreement is high-confidence. The merge receipt rules (reviewer order, canary echo, two-round cap, SHA pin) live in `tools/pstack-core/pokedraft-overrides.md` under Review.

## Steps

1. State the intent in one paragraph.
2. Package the diff (`git diff origin/main...HEAD` or the files the user named).
3. Read `references/rubric.md`, `references/code-quality-review.md`, and `references/reviewer-prompt.md`.
4. Run independent reviewers using the current harness. The implementer never reviews its own diff. Do not invent Cursor `Task` invocations.
5. Synthesize using `references/lead-judgment.md`. Categorize Act on / Consider / Dismiss. Do not auto-apply.

If the harness cannot spawn a second model, say so and continue with one reviewer plus lead judgment.
