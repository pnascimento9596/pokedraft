import type { Rating } from "@/ui/rating";
import s from "./RatingNote.module.css";

// The two lines inside a pitch token's rating pill, shared by the builder and the draft screen.
export function RatingNote({ rating, id }: { readonly rating: Rating; readonly id: string }) {
  return (
    <>
      <span id={`${id}-score`} className={s.noteScore}>
        {rating.score}
      </span>{" "}
      <span id={`${id}-label`} className={s.noteLabel}>
        {rating.versus}
      </span>
    </>
  );
}
