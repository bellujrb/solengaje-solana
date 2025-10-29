"use client";

import { type ReactNode, useState, useEffect } from "react";
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
          solana: {
            createOnLogin: "all-users",
          },
          ethereum: {
            createOnLogin: "off",
          },
        },
        loginMethods: ['email'],
        appearance: {
          walletChainType: "solana-only",
          theme: "light",
        },
        externalWallets: {
          solana: { connectors: toSolanaWalletConnectors() },
        },
        solana: {
          rpcs: {
            "solana:mainnet": {
              rpc: createSolanaRpc(
                process.env.NEXT_PUBLIC_SOLANA_MAINNET_RPC_URL ||
                "https://api.mainnet-beta.solana.com"
              ),
              rpcSubscriptions: createSolanaRpcSubscriptions(
                process.env.NEXT_PUBLIC_SOLANA_MAINNET_RPC_URL?.replace("http", "ws") ||
                "wss://api.mainnet-beta.solana.com"
              ),
            },
            "solana:devnet": {
              rpc: createSolanaRpc("https://api.devnet.solana.com"),
              rpcSubscriptions: createSolanaRpcSubscriptions("wss://api.devnet.solana.com"),
            },
          },
        },
      }}
    >
      <CampaignProvider>{props.children}</CampaignProvider>
    </PrivyProvider>

  );
}
