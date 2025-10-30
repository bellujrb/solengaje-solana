"use client";

import { useState, useCallback } from "react";
import { PublicKey, Transaction } from "@solana/web3.js";
import { BN, Program } from "@coral-xyz/anchor";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";
import { getConnection, PROGRAM_ID, USDC_MINT } from "../lib/anchor";
import { usePrivyWallet } from "./usePrivyWallet";
import solengIdl from "../lib/solengage.json";

interface ActivateCampaignParams {
  campaignPDA: PublicKey;
  influencerPublicKey: PublicKey;
  brandPublicKey: PublicKey;
}

function getProgram(anchorWallet: unknown): Program {
  const connection = getConnection();
  const provider = new (require("@coral-xyz/anchor").AnchorProvider)(
    connection,
    anchorWallet as never,
    {
      commitment: 'confirmed',
      skipPreflight: false,
    }
  );

  // Criar uma cópia profunda do IDL e atualizar o address com o programId correto
  const idlWithProgramId = JSON.parse(JSON.stringify(solengIdl));
  idlWithProgramId.address = PROGRAM_ID.toBase58();
  
  console.log('Creating Program with IDL address:', idlWithProgramId.address);
  console.log('Expected PROGRAM_ID:', PROGRAM_ID.toBase58());

  return new Program(idlWithProgramId as never, provider);
}

export function useActivateCampaign() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    publicKey,
    isConnected,
    anchorWallet,
    sendTransaction,
  } = usePrivyWallet();

  const activateCampaign = useCallback(
    async (params: ActivateCampaignParams): Promise<{
      success: boolean;
      signature?: string;
      error?: string;
    }> => {
      if (!isConnected || !publicKey) {
        return { success: false, error: "Wallet not connected" };
      }

      if (!anchorWallet) {
        return { success: false, error: "Anchor wallet not available" };
      }

      setLoading(true);
      setError(null);

      try {
        const program = getProgram(anchorWallet);
        const connection = getConnection();

        // First, fetch the campaign to get its details
        const campaignAccount = await (program.account as { campaign: { fetch: (pda: PublicKey) => Promise<unknown> } }).campaign.fetch(params.campaignPDA);
        const amountUsdc = (campaignAccount as { amountUsdc: BN }).amountUsdc;

        // Get brand's USDC token account address
        const brandUsdcAccount = await getAssociatedTokenAddress(
          USDC_MINT,
          params.brandPublicKey,
          false,
          TOKEN_PROGRAM_ID
        );

        // Get campaign's USDC token account address
        const campaignUsdcAccount = await getAssociatedTokenAddress(
          USDC_MINT,
          params.campaignPDA,
          true,
          TOKEN_PROGRAM_ID
        );

        console.log("Activating campaign with params:", {
          campaignPDA: params.campaignPDA.toBase58(),
          brand: params.brandPublicKey.toBase58(),
          brandUsdcAccount: brandUsdcAccount.toBase58(),
          campaignUsdcAccount: campaignUsdcAccount.toBase58(),
          amount: amountUsdc.toString(),
        });

        // Create transaction
        const tx: Transaction = await program.methods
          .brandPayCampaign()
          .accounts({
            campaign: params.campaignPDA,
            brand: params.brandPublicKey,
            brandUsdcAccount: brandUsdcAccount,
            campaignUsdcAccount: campaignUsdcAccount,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .transaction();

        const { blockhash } = await connection.getLatestBlockhash('confirmed');
        tx.recentBlockhash = blockhash;
        tx.feePayer = params.brandPublicKey;

        if (!sendTransaction) {
          throw new Error("sendTransaction not available from Privy");
        }

        const serializedTx = tx.serialize({
          requireAllSignatures: false,
          verifySignatures: false,
        });

        const result = await sendTransaction(serializedTx);

        const signature =
          typeof result === "string"
            ? result
            : (result as { hash?: string; signature?: string })?.hash ||
              (result as { hash?: string; signature?: string })?.signature ||
              String(result);

        console.log("Campaign activated successfully with signature:", signature);

        return {
          success: true,
          signature,
        };
      } catch (err) {
        console.error("Error activating campaign:", err);
        const errorMessage = err instanceof Error ? err.message : "Failed to activate campaign";
        setError(errorMessage);
        
        return {
          success: false,
          error: errorMessage,
        };
      } finally {
        setLoading(false);
      }
    },
    [isConnected, publicKey, anchorWallet, sendTransaction]
  );

  return {
    activateCampaign,
    loading,
    error,
  };
}
