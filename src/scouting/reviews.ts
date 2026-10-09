import gen1 from "./review/gen-1.json";
import gen2 from "./review/gen-2.json";
import gen3 from "./review/gen-3.json";
import gen4 from "./review/gen-4.json";
import gen5 from "./review/gen-5.json";
import gen6 from "./review/gen-6.json";
import gen7 from "./review/gen-7.json";
import gen8 from "./review/gen-8.json";
import gen9 from "./review/gen-9.json";
import { ReviewFileSchema, type ReviewFile } from "./review";

export const REVIEW_FILES: readonly ReviewFile[] = [
  gen1,
  gen2,
  gen3,
  gen4,
  gen5,
  gen6,
  gen7,
  gen8,
  gen9,
].map((f) => ReviewFileSchema.parse(f));

export const REVIEWS = REVIEW_FILES.flatMap((f) => f.entries);
