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
 * Feature: Criação de Campanhas
 * 
 * Cenário: Criação bem-sucedida de campanha
 * Given um influenciador autenticado
 * And uma marca válida
 * And um oracle autorizado
 * And parâmetros válidos da campanha (nome, hashtag, métricas alvo, valor, prazo)
 * When o influenciador cria uma nova campanha
 * Then a campanha deve ser criada com status "Draft"
 * And todos os campos devem ser preenchidos corretamente
 * And as métricas atuais devem ser zeradas
 * And o valor pago deve ser zero
 * And todos os marcos de pagamento devem estar como false
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
  getAccount
} from "@solana/spl-token";
import { expect } from "chai";

describe("Solengage - BDD Tests", () => {
  // Configure the client to use the local cluster
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.solengage as Program<Solengage>;
  const provider = anchor.getProvider() as anchor.AnchorProvider;

  // Verify provider is properly configured
  if (!provider || !provider.connection || !provider.wallet) {
    throw new Error("Provider not properly configured");
  }

  // Test accounts
  let influencer: Keypair;
  let brand: Keypair;
  let oracle: Keypair;
  let usdcMint: PublicKey;
  let brandUsdcAccount: PublicKey;
  let campaignUsdcAccount: PublicKey;
  let influencerUsdcAccount: PublicKey;

  // Test data
  const campaignName = "Test Campaign";
  const brandName = "Test Brand";
  const hashtag = "#testcampaign";
  const targetLikes = 1000;
  const targetComments = 100;
  const targetViews = 10000;
  const targetShares = 50;
  const amountUsdc = 1000 * 1_000_000; // 1000 USDC (6 decimals)
  const deadline = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60); // 30 days from now

  beforeEach(async () => {
    try {
      console.log("\n========================================");
      console.log("🔧 SETUP: Inicializando ambiente de teste");
      console.log("========================================\n");

      // Generate fresh keypairs for each test
      console.log("📝 Gerando keypairs...");
      influencer = Keypair.generate();
      brand = Keypair.generate();
      oracle = Keypair.generate();

      // Verify keypairs are generated correctly
      if (!influencer || !brand || !oracle) {
        throw new Error("Failed to generate keypairs");
      }

      console.log("✅ Keypairs gerados com sucesso:");
      console.log("   - Influencer:", influencer.publicKey.toString());
      console.log("   - Brand:", brand.publicKey.toString());
      console.log("   - Oracle:", oracle.publicKey.toString());

      // Airdrop SOL to accounts
      console.log("\n💰 Solicitando airdrops de SOL...");
      const influencerAirdrop = await provider.connection.requestAirdrop(
        influencer.publicKey,
        2 * LAMPORTS_PER_SOL
      );
      const brandAirdrop = await provider.connection.requestAirdrop(
        brand.publicKey,
        2 * LAMPORTS_PER_SOL
      );
      const oracleAirdrop = await provider.connection.requestAirdrop(
        oracle.publicKey,
        1 * LAMPORTS_PER_SOL
      );

      // Confirm all airdrops with proper error handling
      console.log("⏳ Confirmando airdrops...");
      await provider.connection.confirmTransaction(influencerAirdrop, "confirmed");
      await provider.connection.confirmTransaction(brandAirdrop, "confirmed");
      await provider.connection.confirmTransaction(oracleAirdrop, "confirmed");

      // Wait for airdrops to be processed
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify balances
      const influencerBalance = await provider.connection.getBalance(influencer.publicKey);
      const brandBalance = await provider.connection.getBalance(brand.publicKey);
      console.log("✅ Saldos após airdrop:");
      console.log("   - Influencer:", influencerBalance / LAMPORTS_PER_SOL, "SOL");
      console.log("   - Brand:", brandBalance / LAMPORTS_PER_SOL, "SOL");

      if (influencerBalance < LAMPORTS_PER_SOL || brandBalance < LAMPORTS_PER_SOL) {
        throw new Error("Insufficient SOL balance after airdrop");
      }

      // Create USDC mint (6 decimals) with explicit payer
      console.log("\n🪙 Criando USDC mint (6 decimals)...");
      usdcMint = await createMint(
        provider.connection,
        brand, // payer (has SOL)
        brand.publicKey, // mint authority
        null, // freeze authority
        6 // decimals
      );
      console.log("✅ USDC mint criado:", usdcMint.toString());

      // Create token accounts
      console.log("\n💼 Criando token accounts...");
      brandUsdcAccount = await createAccount(
        provider.connection,
        brand, // payer
        usdcMint,
        brand.publicKey // owner
      );
      console.log("✅ Brand USDC account:", brandUsdcAccount.toString());

      influencerUsdcAccount = await createAccount(
        provider.connection,
        influencer, // payer
        usdcMint,
        influencer.publicKey // owner
      );
      console.log("✅ Influencer USDC account:", influencerUsdcAccount.toString());

      // Mint USDC to brand account
      console.log("\n💵 Mintando USDC para brand account...");
      const mintAmount = amountUsdc * 2; // Mint double the amount for testing
      const mintTx = await mintTo(
        provider.connection,
        brand, // fee payer
        usdcMint,
        brandUsdcAccount,
        brand, // mint authority (keypair, not publickey)
        mintAmount
      );
      console.log("✅ USDC mintado com sucesso!");
      console.log("   - Amount:", mintAmount / 1_000_000, "USDC");
      console.log("   - Transaction:", mintTx);

      console.log("\n✅ Setup completo!\n");

    } catch (error) {
      console.error("Error in beforeEach setup:", error);
      console.error("Stack trace:", error.stack);
      throw error;
    }
  });

  describe("Feature: Criação de Campanhas", () => {
    describe("Cenário: Criação bem-sucedida de campanha", () => {
      it("Given um influenciador autenticado, And uma marca válida, And um oracle autorizado, And parâmetros válidos da campanha, When o influenciador cria uma nova campanha, Then a campanha deve ser criada com status 'Draft'", async () => {
        console.log("\n========================================");
        console.log("🧪 TESTE: Criação de Campanha");
        console.log("========================================\n");

        // Given: Setup já feito no beforeEach
        console.log("✅ GIVEN: Setup já realizado no beforeEach");
        // Verify all required accounts are properly initialized
        expect(influencer).to.not.be.undefined;
        expect(brand).to.not.be.undefined;
        expect(oracle).to.not.be.undefined;
        expect(usdcMint).to.not.be.undefined;
        console.log("   - Todas as contas estão inicializadas\n");

        // When: Criar a campanha
        console.log("📋 WHEN: Criando campanha...");
        const [campaignPda] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("campaign"),
            influencer.publicKey.toBuffer(),
            brand.publicKey.toBuffer(),
            Buffer.from(campaignName)
          ],
          program.programId
        );

          const brandName = "Test Brand";

        console.log("   - Campaign PDA:", campaignPda.toString());
        console.log("   - Nome:", campaignName);
        console.log("   - Brand:", brandName);
        console.log("   - Hashtag:", hashtag);
        console.log("   - Target Likes:", targetLikes);
        console.log("   - Amount:", amountUsdc / 1_000_000, "USDC");
        console.log("   - Deadline:", new Date(deadline * 1000).toISOString());

        try {
          const tx = await program.methods
            .createCampaign(
              campaignName,
              "test-nickname", // nickname
              brandName,
              hashtag,
              new anchor.BN(targetLikes),
              new anchor.BN(targetComments),
              new anchor.BN(targetViews),
              new anchor.BN(targetShares),
              new anchor.BN(amountUsdc),
              new anchor.BN(deadline)
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

          console.log("✅ Campanha criada com sucesso!");
          console.log("   - Transaction:", tx);

          // Then: Verificar se a campanha foi criada corretamente
          console.log("\n🔍 THEN: Verificando estado da campanha...");
          const campaignAccount = await program.account.campaign.fetch(campaignPda);

          // Verificar todos os campos básicos
          console.log("   ✓ Verificando campos básicos...");
          expect(campaignAccount.influencer.toString()).to.equal(influencer.publicKey.toString());
          expect(campaignAccount.brand.toString()).to.equal(brand.publicKey.toString());
          expect(campaignAccount.oracle.toString()).to.equal(oracle.publicKey.toString());
          expect(campaignAccount.name).to.equal(campaignName);
          expect(campaignAccount.brandName).to.equal(brandName);
          expect(campaignAccount.hashtag).to.equal(hashtag);
          expect(campaignAccount.targetLikes.toNumber()).to.equal(targetLikes);
          expect(campaignAccount.targetComments.toNumber()).to.equal(targetComments);
          expect(campaignAccount.targetViews.toNumber()).to.equal(targetViews);
          expect(campaignAccount.targetShares.toNumber()).to.equal(targetShares);
          expect(campaignAccount.amountUsdc.toNumber()).to.equal(amountUsdc);
          expect(campaignAccount.deadline.toNumber()).to.equal(deadline);

          // Verificar status inicial
          console.log("   ✓ Verificando status inicial...");
          expect(campaignAccount.status).to.deep.equal({ draft: {} });
          console.log("     - Status: Draft ✓");

          // Verificar métricas atuais zeradas
          console.log("   ✓ Verificando métricas iniciais...");
          expect(campaignAccount.currentLikes.toNumber()).to.equal(0);
          expect(campaignAccount.currentComments.toNumber()).to.equal(0);
          expect(campaignAccount.currentViews.toNumber()).to.equal(0);
          expect(campaignAccount.currentShares.toNumber()).to.equal(0);
          console.log("     - Todas as métricas zeradas ✓");

          // Verificar valor pago zerado
          console.log("   ✓ Verificando valor pago...");
          expect(campaignAccount.paidAmount.toNumber()).to.equal(0);
          console.log("     - Paid Amount: 0 USDC ✓");

          // Verificar todos os marcos de pagamento como false
          console.log("   ✓ Verificando payment milestones...");
          expect(campaignAccount.paymentMilestones).to.deep.equal(
            Array(10).fill(false)
          );
          console.log("     - Todos os 10 milestones em false ✓");

          // Verificar timestamps
          console.log("   ✓ Verificando timestamps...");
          expect(campaignAccount.createdAt.toNumber()).to.be.greaterThan(0);
          expect(campaignAccount.lastUpdated.toNumber()).to.be.greaterThan(0);
          console.log("     - Created At:", new Date(campaignAccount.createdAt.toNumber() * 1000).toISOString());
          console.log("     - Last Updated:", new Date(campaignAccount.lastUpdated.toNumber() * 1000).toISOString());

          console.log("\n✅ Teste de Criação de Campanha concluído com sucesso!\n");
        } catch (error) {
          console.error("\n❌ Erro ao criar campanha:", error);
          throw error;
        }
      });
    });
  });
});