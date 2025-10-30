"use client";

import { useState, useEffect, useCallback } from "react";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { BN, Program, AnchorProvider } from "@coral-xyz/anchor";
import { getConnection, PROGRAM_ID } from "../lib/anchor";
import { usePrivyWallet } from "./usePrivyWallet";
import {
  convertMultipleCampaigns,
  convertBlockchainCampaignToUI,
} from "../utils/campaignConverter";
import solengIdl from "../lib/solengage.json";

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
  status: "ACTIVE" | "COMPLETED" | "PENDING" | "EXPIRED" | "CANCELLED" | "DRAFT";
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
  nickname: string;
  brandName: string;
  hashtag: string;
  amountUsdc: BN;
  paidAmount: BN;
  targetLikes: BN;
  targetComments: BN;
  targetViews: BN;
  targetShares: BN;
  currentLikes: BN;
  currentComments: BN;
  currentViews: BN;
  currentShares: BN;
  deadline: BN;
  status: { draft?: Record<string, never> } | { active?: Record<string, never> } | { completed?: Record<string, never> } | { cancelled?: Record<string, never> };
  oracle: PublicKey;
  createdAt: BN;
  lastUpdated: BN;
  paymentMilestones: boolean[];
}
function getProgram(anchorWallet: unknown): Program {
  const connection = getConnection();
  const provider = new AnchorProvider(connection, anchorWallet as never, {
    commitment: 'confirmed',
    skipPreflight: true,
  });

  // Criar uma cópia profunda do IDL e atualizar o address com o programId correto
  // O Anchor verifica se o address no IDL corresponde ao programId usado na instrução
  const idlWithProgramId = JSON.parse(JSON.stringify(solengIdl));
  idlWithProgramId.address = PROGRAM_ID.toBase58();
  
  console.log('Creating Program with IDL address:', idlWithProgramId.address);
  console.log('Expected PROGRAM_ID:', PROGRAM_ID.toBase58());

  return new Program(idlWithProgramId as never, provider);
}


export function useCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    publicKey,
    isConnected,
    isReady,
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

      const campaignAccounts = await (program.account as { campaign: { all: (filters?: unknown[]) => Promise<Array<{ publicKey: PublicKey; account: unknown }>> } }).campaign.all([
        // Opcional: filtrar por influencer
        // { memcmp: { offset: 8, bytes: publicKey.toBase58() } }
      ]);

      console.log("Found campaigns:", campaignAccounts.length);

      const blockchainCampaigns = campaignAccounts.map((account) => ({
        campaignPDA: account.publicKey,
        ...(account.account as Record<string, unknown>),
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
        const campaignAccount = await (program.account as { campaign: { fetch: (pda: PublicKey) => Promise<unknown> } }).campaign.fetch(
          campaignPDA
        );
        const blockchainCampaign = {
          campaignPDA,
          ...(campaignAccount as Record<string, unknown>),
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
      brandName?: string;
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

      if (!isReady) {
        return { success: false, error: "Wallet is not ready yet. Please wait for initialization." };
      }

      try {
        // Validar amountUsdc antes de usar
        if (isNaN(params.amountUsdc) || params.amountUsdc <= 0) {
          return {
            success: false,
            error: `Valor inválido: ${params.amountUsdc}. Por favor, informe um valor válido para o orçamento.`,
          };
        }

        const createdAt = Math.floor(Date.now() / 1000);
        const deadlineTs = createdAt + params.durationDays * 24 * 60 * 60;
        const amountUsdcBN = new BN(Math.floor(params.amountUsdc * 1_000_000));
        
        // TODO: Get brand public key from form data or settings
        // For now, using the same publicKey as brand (to be updated later)
        const brandPublicKey = publicKey;
        
        // TODO: Get oracle public key from environment or contract
        // For now, using a placeholder oracle (you need to set this to the actual oracle)
        const oraclePublicKey = new PublicKey("11111111111111111111111111111112");
        
        const [campaignPDA] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("campaign"),
            publicKey.toBuffer(),
            brandPublicKey.toBuffer(),
            Buffer.from(params.name),
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

        // Verificar se o programId do program corresponde ao PROGRAM_ID esperado
        const programProgramId = program.programId.toBase58();
        const expectedProgramId = PROGRAM_ID.toBase58();
        
        if (programProgramId !== expectedProgramId) {
          console.warn(`Program ID mismatch: expected ${expectedProgramId}, got ${programProgramId}`);
        }

        const tx: Transaction = await program.methods
          .createCampaign(
            params.name,
            params.brandName || params.name, // brand_name
            params.description, // hashtag (reusing description for now)
            new BN(params.targetLikes),
            new BN(params.targetComments),
            new BN(params.targetViews),
            new BN(params.targetShares),
            amountUsdcBN,
            new BN(deadlineTs)
          )
          .accounts({
            campaign: campaignPDA,
            influencer: publicKey,
            brand: brandPublicKey,
            oracle: oraclePublicKey,
            systemProgram: SystemProgram.programId,
          })
          .transaction();

        // Verificar qual programId está realmente sendo usado na instrução
        if (tx.instructions.length > 0) {
          const firstInstruction = tx.instructions[0];
          const instructionProgramId = firstInstruction.programId.toBase58();
          console.log('Program ID na instrução da transação:', instructionProgramId);
          console.log('Program ID esperado:', PROGRAM_ID.toBase58());
          console.log('Program ID do objeto Program:', program.programId.toBase58());
          
          if (instructionProgramId !== PROGRAM_ID.toBase58()) {
            return {
              success: false,
              error: `Program ID mismatch na transação. Instrução usa: ${instructionProgramId}, mas esperado: ${PROGRAM_ID.toBase58()}. Por favor, verifique se o programa está deployado com o programId correto ou atualize NEXT_PUBLIC_PROGRAM_ID.`,
            };
          }
        }

        const connection = getConnection();
        tx.feePayer = publicKey;
        
        // Tentar verificar se o programa existe no programId especificado
        try {
          const programInfo = await connection.getAccountInfo(PROGRAM_ID);
          if (!programInfo) {
            return {
              success: false,
              error: `Programa não encontrado no endereço ${PROGRAM_ID.toBase58()}. Verifique se o programa está deployado na devnet ou atualize NEXT_PUBLIC_PROGRAM_ID com o programId correto.`,
            };
          }
          console.log('Programa encontrado na blockchain. Program ID:', PROGRAM_ID.toBase58());
          
          // Adicionar aviso sobre DeclaredProgramIdMismatch
          console.warn('⚠️ Se receber erro "DeclaredProgramIdMismatch", isso significa que:');
          console.warn('   O programId declarado no código Rust (declare_id!) não corresponde ao programId real do programa deployado.');
          console.warn('   Solução: Faça redeploy do programa para garantir que correspondam.');
          console.warn(`   Comando: cd program-sol && anchor build && anchor deploy --provider.cluster devnet`);
        } catch (error) {
          console.warn('Erro ao verificar programa na blockchain:', error);
        }
        
        // Adicionar tratamento específico para erro DeclaredProgramIdMismatch
        // Este erro será capturado após a tentativa de envio da transação
        
        // Obter blockhash inicial (será atualizado com um fresco em usePrivyWallet se necessário)
        const { blockhash } = await connection.getLatestBlockhash('confirmed');
        tx.recentBlockhash = blockhash;

        if (!sendTransaction) {
          throw new Error("sendTransaction not available from Privy");
        }

        const serializedTx = tx.serialize({
          requireAllSignatures: false,
          verifySignatures: false,
        });

        // sendTransaction atualizará o blockhash com um fresco antes de enviar
        // Isso evita erros de "Blockhash not found" se houver delay entre criação e envio
        const result = await sendTransaction(serializedTx);

        const signature =
          typeof result === "string"
            ? result
            : (result as { hash?: string; signature?: string })?.hash ||
              (result as { hash?: string; signature?: string })?.signature ||
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
        
        // Tratamento específico para erro DeclaredProgramIdMismatch
        const errorMessage = err instanceof Error ? err.message : String(err);
        if (
          errorMessage.includes('DeclaredProgramIdMismatch') ||
          errorMessage.includes('0x1004') ||
          errorMessage.includes('4100')
        ) {
          return {
            success: false,
            error: `Erro: O programId declarado no código Rust não corresponde ao programId do programa deployado.\n\n` +
              `Program ID esperado: ${PROGRAM_ID.toBase58()}\n\n` +
              `Para resolver:\n` +
              `1. Certifique-se de que o programa está deployado na devnet\n` +
              `2. Execute: cd program-sol && anchor build && anchor deploy --provider.cluster devnet\n` +
              `3. Ou verifique se NEXT_PUBLIC_PROGRAM_ID corresponde ao programId real do programa deployado\n` +
              `4. Verifique o Solana Explorer: https://explorer.solana.com/address/${PROGRAM_ID.toBase58()}?cluster=devnet`,
          };
        }
        
        return {
          success: false,
          error: err instanceof Error ? err.message : "Failed to create campaign",
        };
      }
    },
    [isConnected, publicKey, anchorWallet, sendTransaction, fetchAllCampaigns, isReady]
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
