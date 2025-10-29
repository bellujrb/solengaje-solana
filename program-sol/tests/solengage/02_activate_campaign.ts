/**
 * Testes Solengage - Especificação BDD
 * 
 * Este arquivo implementa os testes para o programa Solengage seguindo o padrão BDD (Behavior-Driven Development).
 * 
 * Visão Geral:
 * O Solengage é um programa Solana que gerencia campanhas de marketing de influenciadores 
 * com pagamentos progressivos baseados em métricas de engajamento.
 * 
 * Cenário Implementado:
 * 
 * Feature: Ativação de Campanhas
 * 
 * Cenário: Ativação bem-sucedida da campanha
 * Given uma campanha existente em status "Draft"
 * And a marca tem saldo suficiente de USDC
 * When a marca deposita USDC para ativar a campanha
 * Then o status da campanha deve mudar para "Active"
 * And o valor total deve ser transferido para a conta da campanha
 * And o saldo da marca deve diminuir pelo valor da campanha
 */

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Solengage } from "../../target/types/solengage";
import { 
  PublicKey, 
  Keypair, 
  SystemProgram,
  LAMPORTS_PER_SOL 
} from "@solana/web3.js";
import { 
  TOKEN_PROGRAM_ID,
  createMint,
  createAccount,
  mintTo,
  getAccount,
  getOrCreateAssociatedTokenAccount
} from "@solana/spl-token";
import { expect } from "chai";

describe("Solengage - BDD Tests", () => {
  // Configure the client to use the local cluster
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.solengage as Program<Solengage>;
  const provider = anchor.getProvider() as anchor.AnchorProvider;

  // Test accounts
  let influencer: Keypair;
  let brand: Keypair;
  let oracle: Keypair;
  let usdcMint: PublicKey;
  let brandUsdcAccount: PublicKey;
  let campaignPda: PublicKey;
  let campaignUsdcAccount: PublicKey;

  // Test data
  const campaignName = "Activate Campaign Test";
  const amountUsdc = new anchor.BN(500 * 1_000_000); // 500 USDC

  beforeEach(async () => {
    // 1. Setup: Create accounts and a draft campaign
    influencer = Keypair.generate();
    brand = Keypair.generate();
    oracle = Keypair.generate();

    // Airdrop SOL
    await Promise.all([
      provider.connection.requestAirdrop(influencer.publicKey, 2 * LAMPORTS_PER_SOL).then(sig => provider.connection.confirmTransaction(sig, "confirmed")),
      provider.connection.requestAirdrop(brand.publicKey, 2 * LAMPORTS_PER_SOL).then(sig => provider.connection.confirmTransaction(sig, "confirmed")),
    ]);

    // Create USDC Mint
    usdcMint = await createMint(provider.connection, brand, brand.publicKey, null, 6);

    // Create Brand's USDC account and mint tokens
    brandUsdcAccount = await createAccount(provider.connection, brand, usdcMint, brand.publicKey);
    await mintTo(provider.connection, brand, usdcMint, brandUsdcAccount, brand, amountUsdc.toNumber() * 2);

    // Find Campaign PDA
    [campaignPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("campaign"),
        influencer.publicKey.toBuffer(),
        brand.publicKey.toBuffer(),
        Buffer.from(campaignName)
      ],
      program.programId
    );
    
    // Create Campaign USDC Account (owned by PDA)
    campaignUsdcAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        brand, // Payer
        usdcMint,
        campaignPda, // Owner
        true // allowOwnerOffCurve
    ).then(acc => acc.address);


    // Create the campaign
    await program.methods
      .createCampaign(
        campaignName,
        "Brand Name",
        "#activate",
        new anchor.BN(100),
        new anchor.BN(10),
        new anchor.BN(1000),
        new anchor.BN(5),
        amountUsdc,
        new anchor.BN(Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7) // 7 days
      )
      .accounts({
        campaign: campaignPda,
        influencer: influencer.publicKey,
        brand: brand.publicKey,
        oracle: oracle.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([influencer])
      .rpc();
  });

  describe("Feature: Ativação de Campanhas", () => {
    it("Cenário: Ativação bem-sucedida da campanha", async () => {
      // Given: A draft campaign and brand with funds (from beforeEach)
      const initialCampaignState = await program.account.campaign.fetch(campaignPda);
      expect(initialCampaignState.status).to.deep.equal({ draft: {} });

      const initialBrandBalance = (await getAccount(provider.connection, brandUsdcAccount)).amount;

      // When: The brand pays to activate the campaign
      await program.methods
        .brandPayCampaign()
        .accounts({
          campaign: campaignPda,
          brand: brand.publicKey,
          brandUsdcAccount: brandUsdcAccount,
          campaignUsdcAccount: campaignUsdcAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([brand])
        .rpc();

      // Then: The campaign status should be Active
      const finalCampaignState = await program.account.campaign.fetch(campaignPda);
      expect(finalCampaignState.status).to.deep.equal({ active: {} });

      // And: The funds should be in the campaign's USDC account
      const campaignBalance = await getAccount(provider.connection, campaignUsdcAccount);
      expect(campaignBalance.amount.toString()).to.equal(amountUsdc.toString());

      // And: The brand's balance should be reduced
      const finalBrandBalance = (await getAccount(provider.connection, brandUsdcAccount)).amount;
      const expectedFinalBrandBalance = BigInt(initialBrandBalance.toString()) - BigInt(amountUsdc.toString());
      expect(finalBrandBalance.toString()).to.equal(expectedFinalBrandBalance.toString());
    });
  });
});