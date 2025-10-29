"use client";

import { useState, useEffect, useCallback } from "react";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { BN, Program, AnchorProvider } from "@coral-xyz/anchor";
import { getConnection } from "../lib/anchor";
import { usePrivyWallet } from "./usePrivyWallet";
import {
  convertMultipleCampaigns,
  convertBlockchainCampaignToUI,
} from "../utils/campaignConverter";
import idl from "../lib/idl.json";

export interface Campaign {
  id: string;
  brand: string;
  creator: string;
  totalValue: string;
  deadline: string;
  targetLikes: string;
  targetComments: string;
  targetViews: string;
  targetShares: string;
  currentLikes: string;
  currentComments: string;
  currentViews: string;
  currentShares: string;
  paidAmount: string;
  status: "ACTIVE" | "COMPLETED" | "PENDING" | "EXPIRED" | "CANCELLED";
  progress: number;
  title: string;
  description: string;
  instagramUsername: string;
  createdAt: string;
  postsCount: number;
  endDate: string;
}

interface BlockchainCampaign {
  campaignPDA: PublicKey;
  influencer: PublicKey;
  brand: PublicKey;
  name: string;
  description: string;
  amountUsdc: BN;
  amountPaid: BN;
  targetLikes: BN;
  targetComments: BN;
  targetViews: BN;
  targetShares: BN;
  currentLikes: BN;
  currentComments: BN;
  currentViews: BN;
  currentShares: BN;
  deadlineTs: BN;
  instagramUsername: string;
  status: "Pending" | "Active" | "Completed" | "Cancelled" | "Expired";
  createdAt: BN;
  posts: Array<{
    postId: string;
    postUrl: string;
    addedAt: BN;
  }>;
  bump: number;
}
function getProgram(anchorWallet: any): Program {
  const connection = getConnection();
  const provider = new AnchorProvider(connection, anchorWallet as any, {
    commitment: 'confirmed',
    skipPreflight: false,
  });

  return new Program(idl as any, provider);  // sem programId aqui
}


export function useCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    publicKey,
    isConnected,
    user,
    anchorWallet,
    sendTransaction,
  } = usePrivyWallet();

  const fetchAllCampaigns = useCallback(async () => {
    if (!isConnected || !publicKey) {
      setCampaigns([]);
      setLoading(false);
      return;
    }

    if (campaigns.length === 0) {
      setLoading(true);
    }
    setError(null);

    try {
      if (!anchorWallet) {
        throw new Error("Anchor wallet not available");
      }

      console.log("Fetching campaigns with publicKey:", publicKey.toBase58());
      const program = getProgram(anchorWallet);

      const campaignAccounts = await (program.account as any).campaign.all([
        // Opcional: filtrar por influencer
        // { memcmp: { offset: 8, bytes: publicKey.toBase58() } }
      ]);

      console.log("Found campaigns:", campaignAccounts.length);

      const blockchainCampaigns = campaignAccounts.map((account: any) => ({
        campaignPDA: account.publicKey,
        ...account.account,
      })) as BlockchainCampaign[];

      const converted = convertMultipleCampaigns(blockchainCampaigns);
      setCampaigns(converted);
    } catch (err) {
      console.error("Error fetching campaigns from blockchain:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch campaigns");
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, [isConnected, publicKey, anchorWallet, campaigns.length]);

  const fetchCampaign = useCallback(
    async (campaignPDA: PublicKey): Promise<Campaign | null> => {
      if (!isConnected || !publicKey) {
        return null;
      }

      try {
        if (!anchorWallet) {
          throw new Error("Anchor wallet not available");
        }
        const program = getProgram(anchorWallet);
        const campaignAccount = await (program.account as any).campaign.fetch(
          campaignPDA
        );
        const blockchainCampaign = {
          campaignPDA,
          ...campaignAccount,
        } as BlockchainCampaign;

        return convertBlockchainCampaignToUI(blockchainCampaign);
      } catch (err) {
        console.error("Error fetching campaign:", err);
        return null;
      }
    },
    [isConnected, publicKey, anchorWallet]
  );

  useEffect(() => {
    fetchAllCampaigns();
  }, [fetchAllCampaigns]);

  const createCampaign = useCallback(
    async (params: {
      name: string;
      description: string;
      amountUsdc: number;
      targetLikes: number;
      targetComments: number;
      targetViews: number;
      targetShares: number;
      durationDays: number;
      instagramUsername: string;
    }): Promise<{
      success: boolean;
      campaignId?: string;
      error?: string;
      signature?: string;
    }> => {
      if (!isConnected || !publicKey) {
        return { success: false, error: "Wallet not connected" };
      }

      try {
        const createdAt = Math.floor(Date.now() / 1000);
        const deadlineTs = createdAt + params.durationDays * 24 * 60 * 60;
        const amountUsdcBN = new BN(params.amountUsdc * 1_000_000);

        const PROGRAM_ID = new PublicKey(
          process.env.NEXT_PUBLIC_INFLUNEST_PROGRAM_ID ||
            "DS6344gi387M4e6XvS99QQXGiDmY6qQi4xYxqGUjFbB3"
        );
        const [campaignPDA, bump] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("campaign"),
            publicKey.toBuffer(),
            Buffer.from(new BigInt64Array([BigInt(createdAt)]).buffer),
          ],
          PROGRAM_ID
        );

        console.log("Creating campaign with params:", {
          name: params.name,
          description: params.description,
          amountUsdc: params.amountUsdc,
          campaignPDA: campaignPDA.toBase58(),
          influencer: publicKey.toBase58(),
        });

        const program = getProgram(anchorWallet!);

        const tx: Transaction = await program.methods
          .createCampaign(
            params.name,
            params.description,
            amountUsdcBN,
            new BN(params.targetLikes),
            new BN(params.targetComments),
            new BN(params.targetViews),
            new BN(params.targetShares),
            new BN(deadlineTs),
            params.instagramUsername,
            new BN(createdAt)
          )
          .accounts({
            campaign: campaignPDA,
            influencer: publicKey,
            systemProgram: SystemProgram.programId,
          })
          .transaction();

        const connection = getConnection();
        tx.feePayer = publicKey;
        const { blockhash } = await connection.getLatestBlockhash();
        tx.recentBlockhash = blockhash;

        if (!sendTransaction) {
          throw new Error("sendTransaction not available from Privy");
        }

        const serializedTx = tx.serialize({
          requireAllSignatures: false,
          verifySignatures: false,
        });

        // sendTransaction apenas aceita a transação serializada
        const result = await sendTransaction(serializedTx);

        const signature =
          typeof result === "string"
            ? result
            : (result as any).hash ||
              (result as any).signature ||
              String(result);

        console.log("Campaign created successfully with signature:", signature);

        await fetchAllCampaigns();

        return {
          success: true,
          campaignId: campaignPDA.toBase58(),
          signature,
        };
      } catch (err) {
        console.error("Error creating campaign:", err);
        return {
          success: false,
          error: err instanceof Error ? err.message : "Failed to create campaign",
        };
      }
    },
    [isConnected, publicKey, anchorWallet, sendTransaction, fetchAllCampaigns]
  );

  const refetch = useCallback(() => {
    fetchAllCampaigns();
  }, [fetchAllCampaigns]);

  return {
    campaigns,
    loading,
    error,
    refetch,
    fetchCampaign,
    createCampaign,
    isConnected,
  };
}
