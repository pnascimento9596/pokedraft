import type { Rating } from "@/ui/rating";
import s from "./RatingNote.module.css";

// The two lines inside a pitch token's rating pill, shared by the builder and the draft screen.
export function RatingNote({ rating }: { readonly rating: Rating }) {
  return (
    <>
      <span className={s.noteScore}>{rating.score}</span>{" "}
      <span className={s.noteLabel}>{rating.versus}</span>
    </>
  );
}
