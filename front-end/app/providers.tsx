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
  
  // URLs para mainnet - usar variável de ambiente ou padrão
  const solanaMainnetRpc = process.env.NEXT_PUBLIC_SOLANA_MAINNET_RPC_URL || "https://api.mainnet-beta.solana.com";
  const solanaMainnetWs = solanaMainnetRpc.replace(/^http/, "ws").replace(/^https/, "wss");
  
  // URLs para devnet - usar variável de ambiente ou padrão do solana-config
  const solanaDevnetRpc = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://supertea-solanan-66b1.devnet.rpcpool.com/d914275f-7a7d-491c-9f0e-61cb6466f39a";
  const solanaDevnetWs = solanaDevnetRpc.replace(/^http/, "ws").replace(/^https/, "wss");
  
  // Garantir que as URLs WebSocket são válidas
  const mainnetWsUrl = solanaMainnetWs || "wss://api.mainnet-beta.solana.com";
  const devnetWsUrl = solanaDevnetWs || "wss://supertea-solanan-66b1.devnet.rpcpool.com/d914275f-7a7d-491c-9f0e-61cb6466f39a";

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
              rpcSubscriptions: createSolanaRpcSubscriptions(mainnetWsUrl),
            },
            "solana:devnet": {
              rpc: createSolanaRpc(solanaDevnetRpc),
              rpcSubscriptions: createSolanaRpcSubscriptions(devnetWsUrl),
            },
          },
        },
      }}
    >
      <CampaignProvider>{props.children}</CampaignProvider>
    </PrivyProvider>
  );
}
