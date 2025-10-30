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
import { Solengage } from "../target/types/solengage";
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
    console.log("\n========================================");
    console.log("🔧 SETUP: Inicializando ambiente de teste");
    console.log("========================================\n");

    // 1. Setup: Create accounts and a draft campaign
    console.log("📝 Gerando keypairs...");
    influencer = Keypair.generate();
    brand = Keypair.generate();
    oracle = Keypair.generate();
    console.log("✅ Keypairs gerados:");
    console.log("   - Influencer:", influencer.publicKey.toBase58());
    console.log("   - Brand:", brand.publicKey.toBase58());
    console.log("   - Oracle:", oracle.publicKey.toBase58());

    // Airdrop SOL
    console.log("\n💰 Solicitando airdrops de SOL...");
    await Promise.all([
      provider.connection.requestAirdrop(influencer.publicKey, 2 * LAMPORTS_PER_SOL).then(sig => provider.connection.confirmTransaction(sig, "confirmed")),
      provider.connection.requestAirdrop(brand.publicKey, 2 * LAMPORTS_PER_SOL).then(sig => provider.connection.confirmTransaction(sig, "confirmed")),
    ]);
    console.log("✅ Airdrops confirmados");

    // Create USDC Mint
    console.log("\n🪙 Criando USDC mint (6 decimals)...");
    usdcMint = await createMint(provider.connection, brand, brand.publicKey, null, 6);
    console.log("✅ USDC mint criado:", usdcMint.toBase58());

    // Create Brand's USDC account and mint tokens
    console.log("\n💼 Criando Brand USDC account...");
    brandUsdcAccount = await createAccount(provider.connection, brand, usdcMint, brand.publicKey);
    console.log("✅ Brand USDC account:", brandUsdcAccount.toBase58());

    console.log("\n💵 Mintando USDC para brand...");
    const mintAmount = amountUsdc.toNumber() * 2;
    await mintTo(provider.connection, brand, usdcMint, brandUsdcAccount, brand, mintAmount);
    console.log("✅ USDC mintado:", mintAmount / 1_000_000, "USDC");

    // Find Campaign PDA
    console.log("\n🔍 Calculando Campaign PDA...");
    [campaignPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("campaign"),
        influencer.publicKey.toBuffer(),
        brand.publicKey.toBuffer(),
        Buffer.from(campaignName)
      ],
      program.programId
    );
    console.log("✅ Campaign PDA:", campaignPda.toBase58());

    // Create Campaign USDC Account (owned by PDA)
    console.log("\n💼 Criando Campaign USDC vault...");
    campaignUsdcAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        brand, // Payer
        usdcMint,
        campaignPda, // Owner
        true // allowOwnerOffCurve
    ).then(acc => acc.address);
    console.log("✅ Campaign USDC vault:", campaignUsdcAccount.toBase58());

    // Create the campaign
    console.log("\n📋 Criando campanha em status Draft...");
    await program.methods
      .createCampaign(
        campaignName,
        "test-nickname",
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
    console.log("✅ Campanha criada em status Draft");
    console.log("\n✅ Setup completo!\n");
  });

  describe("Feature: Ativação de Campanhas", () => {
    it("Cenário: Ativação bem-sucedida da campanha", async () => {
      console.log("\n========================================");
      console.log("🧪 TESTE: Ativação de Campanha");
      console.log("========================================\n");

      // Given: A draft campaign and brand with funds (from beforeEach)
      console.log("✅ GIVEN: Campanha em status Draft criada no beforeEach");
      const initialCampaignState = await program.account.campaign.fetch(campaignPda);
      expect(initialCampaignState.status).to.deep.equal({ draft: {} });
      console.log("   - Status inicial: Draft ✓");

      const initialBrandBalance = (await getAccount(provider.connection, brandUsdcAccount)).amount;
      console.log("   - Brand balance inicial:", Number(initialBrandBalance) / 1_000_000, "USDC");

      // When: The brand pays to activate the campaign
      console.log("\n💰 WHEN: Brand paga para ativar campanha...");
      console.log("   - Transferindo", amountUsdc.toNumber() / 1_000_000, "USDC para campaign vault");
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
      console.log("✅ Pagamento realizado com sucesso!");

      // Then: The campaign status should be Active
      console.log("\n🔍 THEN: Verificando mudança de status...");
      const finalCampaignState = await program.account.campaign.fetch(campaignPda);
      expect(finalCampaignState.status).to.deep.equal({ active: {} });
      console.log("   ✓ Status alterado para Active ✓");

      // And: The funds should be in the campaign's USDC account
      console.log("\n🔍 AND: Verificando saldo da campaign vault...");
      const campaignBalance = await getAccount(provider.connection, campaignUsdcAccount);
      expect(campaignBalance.amount.toString()).to.equal(amountUsdc.toString());
      console.log("   ✓ Campaign vault balance:", Number(campaignBalance.amount) / 1_000_000, "USDC ✓");

      // And: The brand's balance should be reduced
      console.log("\n🔍 AND: Verificando saldo final do brand...");
      const finalBrandBalance = (await getAccount(provider.connection, brandUsdcAccount)).amount;
      const expectedFinalBrandBalance = BigInt(initialBrandBalance.toString()) - BigInt(amountUsdc.toString());
      expect(finalBrandBalance.toString()).to.equal(expectedFinalBrandBalance.toString());
      console.log("   ✓ Brand balance final:", Number(finalBrandBalance) / 1_000_000, "USDC ✓");
      console.log("   ✓ Diferença:", Number(initialBrandBalance - finalBrandBalance) / 1_000_000, "USDC ✓");

      console.log("\n✅ Teste de Ativação de Campanha concluído com sucesso!\n");
    });
  });
});