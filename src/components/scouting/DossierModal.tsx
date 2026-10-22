"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { ScoutingDossier as ScoutingDossierComponent } from "./ScoutingDossier";

const LazyDossier = dynamic(() => import("./ScoutingDossier").then((m) => m.ScoutingDossier), {
  ssr: false,
});

export function DossierModal(props: ComponentProps<typeof ScoutingDossierComponent>) {
  return <LazyDossier {...props} />;
}
