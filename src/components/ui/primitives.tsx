import {
  useId,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
} from "react";
import { ArrowRight, type LucideIcon } from "lucide-react";

type PaletteColor = `var(--viz-${1 | 2 | 3 | 4 | 5 | 6 | 7})`;

export function IconTile({
  icon: Icon,
  color = "var(--viz-1)",
}: {
  readonly icon: LucideIcon;
  readonly color?: PaletteColor;
}) {
  return (
    <span
      className="icon-tile"
      style={{ "--icon-color": color } as CSSProperties}
      aria-hidden="true"
    >
      <Icon size={14} strokeWidth={2} />
    </span>
  );
}

export function ModuleCard({
  eyebrow,
  title,
  description,
  meta,
  icon,
  variant = "default",
  headingLevel = 2,
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLElement> & {
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly meta?: ReactNode;
  readonly icon?: ReactNode;
  readonly variant?: "default" | "emphasis" | "quiet";
  readonly headingLevel?: 1 | 2 | 3;
}) {
  const id = useId();
  const Heading = `h${headingLevel}` as "h1" | "h2" | "h3";
  return (
    <section
      {...props}
      className={`module-card module-card--${variant} ${className}`}
      aria-labelledby={id}
    >
      <header className="module-card__header">
        <div className="module-card__heading">
          {icon}
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <Heading id={id} className="module-title">
              {title}
            </Heading>
            <p className="module-description">{description}</p>
          </div>
        </div>
        {meta !== undefined && meta !== null ? (
          <div className="module-card__meta">{meta}</div>
        ) : null}
      </header>
      <div className="module-card__body">{children}</div>
    </section>
  );
}

export function Pill({
  tone = "neutral",
  className = "",
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  readonly tone?: "neutral" | "ok" | "info" | "warn" | "risk";
}) {
  return <span {...props} className={`pill pill--${tone} ${className}`} />;
}

export function Table({ className = "", ...props }: HTMLAttributes<HTMLTableElement>) {
  return <table {...props} className={`theme-table ${className}`} />;
}

export function Tooltip({
  label,
  title,
  rows,
  source,
}: {
  readonly label: string;
  readonly title: string;
  readonly rows: readonly { readonly key: string; readonly value: ReactNode }[];
  readonly source: string;
}) {
  const id = useId();
  return (
    <span className="theme-tooltip">
      <button type="button" className="theme-tooltip__trigger" aria-describedby={id}>
        {label}
      </button>
      <span id={id} role="tooltip" className="theme-tooltip__panel">
        <strong>{title}</strong>
        <span className="theme-tooltip__rows">
          {rows.map((row) => (
            <span key={row.key} className="theme-tooltip__row">
              <span>{row.key}</span>
              <strong className="num">{row.value}</strong>
            </span>
          ))}
        </span>
        <span className="theme-tooltip__source">{source}</span>
      </span>
    </span>
  );
}

export function StatusNote({
  title = "Unavailable",
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & { readonly title?: string }) {
  return (
    <div {...props} className={`status-note ${className}`}>
      <strong>{title}</strong>
      <p>{children}</p>
    </div>
  );
}

export function ListRow({
  children,
  trailing,
  href,
  className = "",
}: {
  readonly children: ReactNode;
  readonly trailing?: ReactNode;
  readonly href?: string;
  readonly className?: string;
}) {
  const content = (
    <>
      <span className="list-row__content">{children}</span> {trailing}
      <ArrowRight aria-hidden="true" size={14} className="list-row__arrow" />
    </>
  );
  return href ? (
    <a className={`list-row ${className}`} href={href}>
      {content}
    </a>
  ) : (
    <div className={`list-row ${className}`}>{content}</div>
  );
}

export function PrimaryButton({
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} type={type} className={`primary-button ${className}`} />;
}

export function Sheet({
  title,
  children,
  className = "",
  ref,
  ...props
}: HTMLAttributes<HTMLDialogElement> & {
  readonly title: string;
  readonly ref?: Ref<HTMLDialogElement>;
  readonly open?: boolean;
  readonly onCancel?: (event: React.SyntheticEvent<HTMLDialogElement>) => void;
  readonly onClose?: (event: React.SyntheticEvent<HTMLDialogElement>) => void;
}) {
  const id = useId();
  return (
    <dialog {...props} ref={ref} aria-labelledby={id} className={`theme-sheet ${className}`}>
      <header className="theme-sheet__header">
        <h2 id={id} className="module-title">
          {title}
        </h2>
      </header>
      <div className="theme-sheet__body">{children}</div>
    </dialog>
  );
}
