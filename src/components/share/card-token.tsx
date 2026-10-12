import { CARD_THEME } from "@/design/card-tokens";
import { speciesById, type SpeciesId } from "@/engine";
import { StaticPlayerImage } from "@/components/PlayerPicture";
import { TOKEN, type Rect } from "./card-layout";

/** Pictures for the species on a card: data URIs by Dex id, null when a pack lacks one. */
export type CardImages = ReadonlyMap<number, string | null>;

function cardName(name: string): string {
  return name.replace("♀", " F").replace("♂", " M").replace("’", "'");
}

const SLOT_CIRCLE = 92;

export function Token({
  box,
  id,
  label,
  images,
  mirror,
}: {
  box: Rect;
  id: SpeciesId | null;
  label: string;
  images: CardImages;
  mirror: boolean;
}) {
  const species = id === null ? null : speciesById(id);
  const side = (TOKEN.width - TOKEN.image) / 2;
  return (
    <div
      style={{
        position: "absolute",
        left: box.left,
        top: box.top,
        width: box.width,
        height: box.height,
        display: "flex",
      }}
    >
      {species === null ? (
        <div
          style={{
            position: "absolute",
            left: (TOKEN.width - SLOT_CIRCLE) / 2,
            top: (TOKEN.image - SLOT_CIRCLE) / 2 + 6,
            width: SLOT_CIRCLE,
            height: SLOT_CIRCLE,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: SLOT_CIRCLE / 2,
            border: `3px dashed ${CARD_THEME.chalk}`,
            background: CARD_THEME.chalkVeil,
            color: CARD_THEME.chalk,
            fontSize: 28,
            fontWeight: 700,
          }}
        >
          {label}
        </div>
      ) : (
        <>
          <div style={{ position: "absolute", left: side, top: 0, display: "flex" }}>
            <StaticPlayerImage
              dexId={species.id}
              size={TOKEN.image}
              alt={species.name}
              src={images.get(species.id) ?? null}
              mirror={mirror}
            />
          </div>
          <div
            style={{
              position: "absolute",
              left: 0,
              top: TOKEN.image - TOKEN.overlap,
              width: TOKEN.width,
              display: "flex",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                height: TOKEN.pillHeight,
                padding: `0 ${TOKEN.pillPad}px`,
                borderRadius: CARD_THEME.radiusSm,
                background: CARD_THEME.emphasis,
                border: `1.5px solid ${CARD_THEME.frameLo}`,
                boxShadow: `0 3px 0 ${CARD_THEME.pillShadow}`,
                color: CARD_THEME.ink,
                fontSize: TOKEN.pillFont,
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              {cardName(species.name)}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
