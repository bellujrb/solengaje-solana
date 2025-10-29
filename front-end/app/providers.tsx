"use client";

import { type ReactNode, useState, useEffect, useMemo } from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";
import { createSolanaRpc, createSolanaRpcSubscriptions } from "@solana/kit";
import { CampaignProvider } from "./contexts/CampaignContext";

export function Providers(props: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  
  const solanaMainnetRpc = process.env.NEXT_PUBLIC_SOLANA_MAINNET_RPC_URL || "";
  const solanaDevnetRpc = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "";
  const solanaMainnetWs = solanaMainnetRpc.replace(/^http/, "ws").replace(/^https/, "wss");
  const solanaDevnetWs = solanaDevnetRpc.replace(/^http/, "ws").replace(/^https/, "wss");

  const solanaConnectors = useMemo(() => {
    if (!mounted) {
      return undefined;
    }
    return toSolanaWalletConnectors();
  }, [mounted]);

  if (!privyAppId) {
    return (
      <CampaignProvider>
        {props.children}
      </CampaignProvider>
    );
  }

  if (!mounted) {
    return (
      <CampaignProvider>
        {props.children}
      </CampaignProvider>
    );
  }

  return (
    <PrivyProvider
      appId={privyAppId}
      config={{
        embeddedWallets: {
          showWalletUIs: true,
          solana: {
            createOnLogin: "all-users",
          },
          ethereum: {
            createOnLogin: "off",
          },
        },
        loginMethods: ["email"],
        appearance: {
          walletChainType: "solana-only",
          theme: "light",
        },
        externalWallets: {
          solana: {
            connectors: solanaConnectors ?? undefined,
          },
        },
        solana: {
          rpcs: {
            "solana:mainnet": {
              rpc: createSolanaRpc(solanaMainnetRpc),
              rpcSubscriptions: createSolanaRpcSubscriptions(solanaMainnetWs),
            },
            "solana:devnet": {
              rpc: createSolanaRpc(solanaDevnetRpc),
              rpcSubscriptions: createSolanaRpcSubscriptions(solanaDevnetWs),
            },
          },
        },
      }}
    >
      <CampaignProvider>{props.children}</CampaignProvider>
    </PrivyProvider>
  );
}
