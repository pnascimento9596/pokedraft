# Final theme production receipts

Theme source merge b6c9bb71f0f12ad56b37e5945c302712dc6388a7, reviewed head 792c841146a3fcec7aa0304afb61810f57e24315. GLM 5.3 Flash cloud high APPROVE, canary verified, followed by pinned squash merge of PR #32.

GitHub Ubuntu CI 38195371430 passed 735 unit tests in 80 files. Browser CI ran 625 cases: 573 passed, one passed on retry, 51 existing skips. The retry was the unchanged Pixel 7 tap-after-drag guard. It is reported as a retry, not hidden in a clean-pass count. The original mobile acceptance file was not changed.

Production first health proves the merge SHA, production/iad1/engine3/token versions1/2/3 and no-store. Live tests: four passed. Unchanged mobile acceptance plus all-formation draft guards: 286 passed, 50 existing skips, no failures or retries. Production axe/contrast/strict CLS/date/theme-choice: 71 passed.

The exact new verify-bot row f74330c1-2956-45ed-89ac-817ee4fabadd, cup8, 2026-10-12 was deleted using id/nickname/mode/date; the readback count is zero. Neon’s first query returned an internal MCP error, then retry succeeded without login.

Final production screenshots: 44 viewport and 44 full-page, both widths/themes, zero overflow and one h1. Font HTML/CSS/network proof: Inter only, required weights and swap, local Inter Fallback; no Big Shoulders/Barlow. Card and OG: HTTP200 image/png, 1200x630, retained files. Figure-preservation fixtures retain 186/10 values per theme.

An earlier concurrent local unit repeat failed four timeouts (731 pass); the isolated repeat failed one unchanged five-second replay import (734 pass). That exact file then passed both tests in 2.41 seconds, and the clean GitHub gate passed all735. These failed local runs are retained and are not called green.

Full raw Lighthouse reports live in the workflow artifact with 90-day retention. Compact individual metrics, hashes, environment and medians are committed separately after the final workflow completes. This receipt describes source acceptance; the documentation closeout PR must itself pass review/CI and post-merge verification.
