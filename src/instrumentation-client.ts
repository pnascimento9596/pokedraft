import { z } from "zod";

// Zod compiles object parsers with new Function, which a CSP without 'unsafe-eval' reports (and,
// once enforced, blocks after a failed probe). The interpreted parser gives the same results.
// This file runs before the app's modules, so it is set before the first parse.
z.config({ jitless: true });
