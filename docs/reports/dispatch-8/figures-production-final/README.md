# Figure preservation on final production

Production merge b6c9bb71f0f12ad56b37e5945c302712dc6388a7, both themes. scripts/audit/theme-figures.mjs compares identical inputs against figures-baseline: 186 result values and 10 leaderboard values, plus exact score, record and row text.

The results input is scripts/audit/fixtures.json shareRun.token (Team Score 593, record 3-0-2). The leaderboard response is the explicit Misty/Brock fixture: scores 845/790 and records 8-0-0/6-1-1, daily date 2026-10-09. Those fields are preserved in each JSON. They are controlled comparison data, not production leaderboard observations.

The separate geometry/late-font guards use BOARD_ONE: twenty Ws, score 983 and record 8-1-1. That fixture supports layout claims and is not the dataset used for the numbers-only preservation claim.
