"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef } from "react";
import { SettingsSummary } from "@/components/SettingsSummary";
import { MODE_LABEL } from "@/ui/labels";
import type { ChallengeMode, PanelSettings } from "@/ui/settings";
import { confirmPlay } from "@/ui/settingsSummary";
import {
  RUN_CLEARED,
  runSlotKey,
  writeRunCheckpoint,
  writeSession,
  type RunSlot,
} from "@/ui/storage";
import s from "./ConfirmPlay.module.css";

export interface ConfirmPlayProps {
  readonly mode: ChallengeMode;
  readonly panel: PanelSettings;
  readonly onEdit: () => void;
  readonly onDone: () => void;
}

// Yes navigates and unmounts the dialog: the home page stays mounted but hidden behind /play, and a
// modal dialog left open there would make the whole document inert. Every other way out (No, Escape, a tap on the backdrop) closes the dialog and
// reports onEdit, so the player lands on the settings.
export function ConfirmPlay({ mode, panel, onEdit, onDone }: ConfirmPlayProps) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const yesRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descId = useId();
  const { href, items, settings } = confirmPlay(mode, panel);

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    yesRef.current?.focus();
    router.prefetch(href);
  }, [router, href]);

  return (
    <dialog
      ref={ref}
      className={s.dialog}
      aria-labelledby={titleId}
      aria-describedby={descId}
      onClose={onEdit}
      onClick={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
    >
      <div className={s.body}>
        <h2 id={titleId} className={s.title}>
          Settings confirmed?
        </h2>
        <p id={descId} className={s.lead}>
          {MODE_LABEL[mode]} will use these settings.
        </p>
        <SettingsSummary items={items} stacked />
        <div className={s.actions}>
          <button type="button" className="btn" onClick={() => ref.current?.close()}>
            No, edit settings
          </button>
          <button
            ref={yesRef}
            type="button"
            className="btn btn--primary"
            onClick={() => {
              const slot: RunSlot = { settings, seed: null, daily: null };
              writeRunCheckpoint(slot, null);
              writeSession(runSlotKey(slot), RUN_CLEARED);
              router.push(href);
              onDone();
            }}
          >
            Yes, play
          </button>
        </div>
      </div>
    </dialog>
  );
}
