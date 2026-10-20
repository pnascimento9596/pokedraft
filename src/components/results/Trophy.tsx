/** The cup beside the Champions label. Decorative: the label already says Champions. */
export function Trophy({ className }: { readonly className?: string }) {
  return (
    <svg
      className={className}
      width={20}
      height={20}
      viewBox="0 0 46 46"
      aria-hidden="true"
      focusable="false"
      data-testid="results-trophy"
    >
      <path d="M13 5 H33 V19 C33 26 28.5 30 23 30 C17.5 30 13 26 13 19 Z" fill="currentColor" />
      <path
        d="M13 9 H6 C6 17 9 21 14 22 M33 9 H40 C40 17 37 21 32 22"
        stroke="currentColor"
        strokeWidth={3}
        fill="none"
      />
      <rect x={21} y={29} width={4} height={8} fill="currentColor" />
      <rect x={14} y={37} width={18} height={5} rx={2} fill="currentColor" />
    </svg>
  );
}
