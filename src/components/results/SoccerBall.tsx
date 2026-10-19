export interface SoccerBallProps {
  readonly size?: number;
  readonly className?: string;
  readonly striking?: boolean;
}

export function SoccerBall({ size = 28, className, striking = false }: SoccerBallProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      data-striking={striking}
      role="img"
      aria-label="Soccer ball"
      data-testid="soccer-ball"
    >
      {/* Base white sphere */}
      <circle
        cx="16"
        cy="16"
        r="14.5"
        style={{ fill: "var(--ball-fill)", stroke: "var(--ball-ink)" }}
        strokeWidth="1.5"
      />

      {/* Central pentagon */}
      <polygon
        points="16,11 19.8,13.8 18.3,18.2 13.7,18.2 12.2,13.8"
        style={{ fill: "var(--ball-ink)" }}
      />

      {/* Seam lines radiating from center pentagon vertices */}
      <line
        x1="16"
        y1="11"
        x2="16"
        y2="4.5"
        style={{ stroke: "var(--ball-ink)" }}
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <line
        x1="19.8"
        y1="13.8"
        x2="26"
        y2="10"
        style={{ stroke: "var(--ball-ink)" }}
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <line
        x1="18.3"
        y1="18.2"
        x2="24"
        y2="24"
        style={{ stroke: "var(--ball-ink)" }}
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <line
        x1="13.7"
        y1="18.2"
        x2="8"
        y2="24"
        style={{ stroke: "var(--ball-ink)" }}
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <line
        x1="12.2"
        y1="13.8"
        x2="6"
        y2="10"
        style={{ stroke: "var(--ball-ink)" }}
        strokeWidth="1.2"
        strokeLinecap="round"
      />

      {/* Outer edge patches */}
      <polygon points="13.5,3 18.5,3 17,6 15,6" style={{ fill: "var(--ball-ink)" }} />
      <polygon points="28,12 29.5,16 26.5,18 25,14" style={{ fill: "var(--ball-ink)" }} />
      <polygon points="21,27.5 25,25 24,28.5" style={{ fill: "var(--ball-ink)" }} />
      <polygon points="11,27.5 7,25 8,28.5" style={{ fill: "var(--ball-ink)" }} />
      <polygon points="4,12 2.5,16 5.5,18 7,14" style={{ fill: "var(--ball-ink)" }} />

      {/* 3D specular highlight and rim shading */}
      <circle cx="12" cy="11" r="4.5" style={{ fill: "var(--ball-shine)" }} opacity="0.4" />
      <circle
        cx="16"
        cy="16"
        r="14"
        fill="none"
        style={{ stroke: "var(--ball-ink)" }}
        strokeWidth="1"
        opacity="0.2"
      />
    </svg>
  );
}
