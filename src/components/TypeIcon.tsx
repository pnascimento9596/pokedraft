import type { CSSProperties } from "react";
import type { PokemonType } from "@/engine/types";
import { typeLabel } from "@/ui/labels";
import { TYPE_PALETTE } from "@/design/stadium";

interface TypeIconProps {
  readonly type: PokemonType;
  readonly size?: number;
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly decorative?: boolean;
}

export function TypeIcon({ type, size = 16, className, style, decorative = false }: TypeIconProps) {
  const color = TYPE_PALETTE[type] ?? TYPE_PALETTE.normal;
  const label = typeLabel(type);

  return (
    <span
      className={className}
      title={label}
      aria-label={decorative ? undefined : label}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: "50%",
        background: `color-mix(in srgb, ${color} 28%, rgba(0, 0, 0, 0.75))`,
        border: `1.5px solid ${color}`,
        boxShadow: `0 0 6px color-mix(in srgb, ${color} 50%, transparent)`,
        color,
        flexShrink: 0,
        overflow: "hidden",
        ...style,
      }}
    >
      <svg
        width={Math.round(size * 0.7)}
        height={Math.round(size * 0.7)}
        viewBox="0 0 24 24"
        fill={color}
        stroke={color}
        strokeWidth="0.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        style={{ display: "block" }}
      >
        {renderTypePath(type, color)}
      </svg>
    </span>
  );
}

function renderTypePath(type: PokemonType, color: string) {
  switch (type) {
    case "fire":
      return (
        <path
          d="M12 2C10.5 4.5 10 6.5 10.5 8C10.8 8.8 11.5 9.4 12 10C13 8.8 13.5 7.2 13 5.5C15.5 8 18 11.5 18 15C18 18.3 15.3 21 12 21C8.7 21 6 18.3 6 15C6 11.8 8 9 10 7C9.5 9 10 11 11.5 11.5C11 10.5 11 9.5 11.5 8.5C12 7 12 4.5 12 2Z"
          strokeWidth="0"
        />
      );
    case "water":
      return (
        <path
          d="M12 2.5C12 2.5 5 11.5 5 16C5 19.9 8.1 22 12 22C15.9 22 19 19.9 19 16C19 11.5 12 2.5 12 2.5ZM12 20C9.2 20 7 18.2 7 16C7 13.2 10.5 8.2 12 5.8C13.5 8.2 17 13.2 17 16C17 18.2 14.8 20 12 20Z"
          strokeWidth="0"
        />
      );
    case "electric":
      return <path d="M13.5 2L4.5 13H11.5L9.5 22L19.5 10H12.5L13.5 2Z" strokeWidth="0" />;
    case "grass":
      return (
        <path
          d="M19.5 3C13.5 3.5 7.5 7.5 6 13.5C5 17.5 7 20.5 10.5 21C16.5 20.5 20.5 14.5 21 8.5C21 5.5 20.5 3.5 19.5 3ZM10.5 19C8.5 18.5 7 16.5 7.8 13.8C8.8 9.5 13.5 6 18.2 5.2C17.5 9.8 14.5 16.2 10.5 19Z"
          strokeWidth="0"
        />
      );
    case "ice":
      return (
        <g stroke={color} strokeWidth="2" fill="none">
          <line x1="12" y1="2" x2="12" y2="22" />
          <line x1="3.3" y1="7" x2="20.7" y2="17" />
          <line x1="3.3" y1="17" x2="20.7" y2="7" />
          <circle cx="12" cy="12" r="2.5" fill={color} stroke="none" />
        </g>
      );
    case "fighting":
      return (
        <path
          d="M7 6C7 4.9 7.9 4 9 4H15C16.1 4 17 4.9 17 6V10C17 10.6 16.6 11 16 11H8C7.4 11 7 10.6 7 10V6ZM5 11C5 9.9 5.9 9 7 9H8V14H6C5.4 14 5 13.6 5 13V11ZM8 14H16V17C16 19.2 14.2 21 12 21C9.8 21 8 19.2 8 17V14ZM16 11H17C18.1 11 19 11.9 19 13V15C19 16.1 18.1 17 17 17H16V11Z"
          strokeWidth="0"
        />
      );
    case "poison":
      return (
        <path
          d="M12 2C12 2 5 10 5 15C5 18.9 8.1 22 12 22C15.9 22 19 18.9 19 15C19 10 12 2 12 2ZM10 12C10.6 12 11 12.4 11 13C11 13.6 10.6 14 10 14C9.4 14 9 13.6 9 13C9 12.4 9.4 12 10 12ZM14 12C14.6 12 15 12.4 15 13C15 13.6 14.6 14 14 14C13.4 14 13 13.6 13 13C13 12.4 13.4 12 14 12ZM13.5 18H10.5V16.5H13.5V18Z"
          strokeWidth="0"
        />
      );
    case "ground":
      return (
        <path
          d="M12 3L2 19H22L12 3ZM12 7.5L18.3 17.5H5.7L12 7.5ZM5 20.5H19V22H5V20.5Z"
          strokeWidth="0"
        />
      );
    case "flying":
      return (
        <path
          d="M2.5 10C6 9 10 10.5 12 12.5C14 10.5 18 9 21.5 10C19 14.5 15.5 18 12 20C8.5 18 5 14.5 2.5 10ZM12 14.5C10.5 13 8 11.8 5 12C7 14.5 9.5 16.5 12 17.5C14.5 16.5 17 14.5 19 12C16 11.8 13.5 13 12 14.5Z"
          strokeWidth="0"
        />
      );
    case "psychic":
      return (
        <g stroke="none" fill={color}>
          <path d="M12 4.5C6.5 4.5 2 12 2 12C2 12 6.5 19.5 12 19.5C17.5 19.5 22 12 22 12C22 12 17.5 4.5 12 4.5ZM12 17C9.2 17 7 14.8 7 12C7 9.2 9.2 7 12 7C14.8 7 17 9.2 17 12C17 14.8 14.8 17 12 17Z" />
          <circle cx="12" cy="12" r="2.8" />
        </g>
      );
    case "bug":
      return (
        <path
          d="M12 5C10.3 5 9 6.3 9 8C9 8.4 9.1 8.7 9.2 9H6V11H8.3C8.1 11.6 8 12.3 8 13H5V15H8C8.2 16.8 9.2 18.3 10.6 19.2L9.5 21.4L11.3 22.3L12.7 19.6C12.9 19.6 13.1 19.6 13.3 19.6L14.7 22.3L16.5 21.4L15.4 19.2C16.8 18.3 17.8 16.8 18 15H21V13H18C18 12.3 17.9 11.6 17.7 11H20V9H16.8C16.9 8.7 17 8.4 17 8C17 6.3 15.7 5 14 5H13V3H15V1H11V3H13V5H12ZM11 11H13V17H11V11ZM15 11V16.7C15.6 15.8 16 14.5 16 13C16 12.3 15.9 11.6 15.7 11H15ZM9 11H8.3C8.1 11.6 8 12.3 8 13C8 14.5 8.4 15.8 9 16.7V11Z"
          strokeWidth="0"
        />
      );
    case "rock":
      return (
        <path
          d="M12 2L4 8L6 19L12 22L18 19L20 8L12 2ZM12 5L17.5 9.5L12 13.5L6.5 9.5L12 5ZM8 17.5L6.8 11.2L11 14.5V19.8L8 17.5ZM13 19.8V14.5L17.2 11.2L16 17.5L13 19.8Z"
          strokeWidth="0"
        />
      );
    case "ghost":
      return (
        <path
          d="M12 2C7.6 2 4 5.6 4 10V19L7 17L9.5 19.5L12 17L14.5 19.5L17 17L20 19V10C20 5.6 16.4 2 12 2ZM9 9.5C9.8 9.5 10.5 10.2 10.5 11C10.5 11.8 9.8 12.5 9 12.5C8.2 12.5 7.5 11.8 7.5 11C7.5 10.2 8.2 9.5 9 9.5ZM15 9.5C15.8 9.5 16.5 10.2 16.5 11C16.5 11.8 15.8 12.5 15 12.5C14.2 12.5 13.5 11.8 13.5 11C13.5 10.2 14.2 9.5 15 9.5Z"
          strokeWidth="0"
        />
      );
    case "dragon":
      return (
        <path
          d="M3 5C7.5 4 14.5 6.5 18 11C19.5 8 20.5 4.5 21 2C21 8.5 18.5 14 15 17C17 17.5 19.5 17 21.5 15.5C19.5 19.5 15.5 22 11 22C6.5 22 3 17 3 12C3 9.5 4 7 5 5C4.2 5 3.5 5 3 5ZM8 12C8 15 10.5 17.5 13.5 17.5C11.5 16 10 13.5 10 10.5C8.8 11 8 11.5 8 12Z"
          strokeWidth="0"
        />
      );
    case "steel":
      return (
        <path
          d="M12 2L4 5.5V11.5C4 16.5 7.5 21 12 22C16.5 21 20 16.5 20 11.5V5.5L12 2ZM12 4.5L18 7.2V11.5C18 15.2 15.5 18.8 12 19.8C8.5 18.8 6 15.2 6 11.5V7.2L12 4.5ZM12 8C10.3 8 9 9.3 9 11C9 12.7 10.3 14 12 14C13.7 14 15 12.7 15 11C15 9.3 13.7 8 12 8Z"
          strokeWidth="0"
        />
      );
    case "dark":
      return (
        <path
          d="M14.5 2.5C11 4 8.5 7.5 8.5 11.5C8.5 15.5 11 19 14.5 20.5C9 21.5 4 17 4 11.5C4 6 9 1.5 14.5 2.5ZM17 9L18 11L20.2 11.2L18.5 12.7L19 15L17 13.8L15 15L15.5 12.7L13.8 11.2L16 11L17 9Z"
          strokeWidth="0"
        />
      );
    case "fairy":
      return (
        <path
          d="M12 2C12 7.5 7.5 12 2 12C7.5 12 12 16.5 12 22C12 16.5 16.5 12 22 12C16.5 12 12 7.5 12 2ZM18 4C18 5.7 16.7 7 15 7C16.7 7 18 8.3 18 10C18 8.3 19.3 7 21 7C19.3 7 18 5.7 18 4Z"
          strokeWidth="0"
        />
      );
    case "normal":
    default:
      return (
        <g stroke="none" fill={color}>
          <path d="M12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22C17.5 22 22 17.5 22 12C22 6.5 17.5 2 12 2ZM12 19C8.1 19 5 15.9 5 12C5 8.1 8.1 5 12 5C15.9 5 19 8.1 19 12C19 15.9 15.9 19 12 19Z" />
          <circle cx="12" cy="12" r="3.5" />
        </g>
      );
  }
}
