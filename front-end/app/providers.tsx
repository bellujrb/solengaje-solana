"use client";

import { type ReactNode } from "react";
import { CampaignProvider } from "./contexts/CampaignContext";

// Providers simplificados sem conexão Web3
export function Providers(props: { children: ReactNode }) {
  return (
    <CampaignProvider>
      {props.children}
    </CampaignProvider>
  );
}
