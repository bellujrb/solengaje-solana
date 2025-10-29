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
      // Generate fresh keypairs for each test
      influencer = Keypair.generate();
      brand = Keypair.generate();
      oracle = Keypair.generate();

      // Verify keypairs are generated correctly
      if (!influencer || !brand || !oracle) {
        throw new Error("Failed to generate keypairs");
      }

      console.log("Generated keypairs successfully");
      console.log("Influencer:", influencer.publicKey.toString());
      console.log("Brand:", brand.publicKey.toString());
      console.log("Oracle:", oracle.publicKey.toString());

      // Airdrop SOL to accounts
      console.log("Requesting airdrops...");
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
      console.log("Confirming airdrops...");
      await provider.connection.confirmTransaction(influencerAirdrop, "confirmed");
      await provider.connection.confirmTransaction(brandAirdrop, "confirmed");
      await provider.connection.confirmTransaction(oracleAirdrop, "confirmed");

      // Wait for airdrops to be processed
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify balances
      const influencerBalance = await provider.connection.getBalance(influencer.publicKey);
      const brandBalance = await provider.connection.getBalance(brand.publicKey);
      console.log("Influencer balance:", influencerBalance / LAMPORTS_PER_SOL, "SOL");
      console.log("Brand balance:", brandBalance / LAMPORTS_PER_SOL, "SOL");

      if (influencerBalance < LAMPORTS_PER_SOL || brandBalance < LAMPORTS_PER_SOL) {
        throw new Error("Insufficient SOL balance after airdrop");
      }

      // Create USDC mint (6 decimals) with explicit payer
      console.log("Creating USDC mint...");
      usdcMint = await createMint(
        provider.connection,
        brand, // payer (has SOL)
        brand.publicKey, // mint authority
        null, // freeze authority
        6 // decimals
      );
      console.log("USDC mint created:", usdcMint.toString());

      // Create token accounts
      console.log("Creating token accounts...");
      brandUsdcAccount = await createAccount(
        provider.connection,
        brand, // payer
        usdcMint,
        brand.publicKey // owner
      );
      console.log("Brand USDC account created:", brandUsdcAccount.toString());

      influencerUsdcAccount = await createAccount(
        provider.connection,
        influencer, // payer
        usdcMint,
        influencer.publicKey // owner
      );
      console.log("Influencer USDC account created:", influencerUsdcAccount.toString());

      // Mint USDC to brand account
      console.log("Minting USDC to brand account...");
      const mintTx = await mintTo(
        provider.connection,
        brand, // fee payer
        usdcMint,
        brandUsdcAccount,
        brand, // mint authority (keypair, not publickey)
        amountUsdc * 2 // Mint double the amount for testing
      );
      console.log("USDC minted successfully, tx:", mintTx);

    } catch (error) {
      console.error("Error in beforeEach setup:", error);
      console.error("Stack trace:", error.stack);
      throw error;
    }
  });

  describe("Feature: Criação de Campanhas", () => {
    describe("Cenário: Criação bem-sucedida de campanha", () => {
      it("Given um influenciador autenticado, And uma marca válida, And um oracle autorizado, And parâmetros válidos da campanha, When o influenciador cria uma nova campanha, Then a campanha deve ser criada com status 'Draft'", async () => {
        // Given: Setup já feito no beforeEach
        // Verify all required accounts are properly initialized
        expect(influencer).to.not.be.undefined;
        expect(brand).to.not.be.undefined;
        expect(oracle).to.not.be.undefined;
        expect(usdcMint).to.not.be.undefined;
        
        // When: Criar a campanha
        const [campaignPda] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("campaign"),
            influencer.publicKey.toBuffer(),
            brand.publicKey.toBuffer(),
            Buffer.from(campaignName)
          ],
          program.programId
        );

        try {
          const tx = await program.methods
            .createCampaign(
              campaignName,
              brandName,
              hashtag,
              new anchor.BN(targetLikes),
              new anchor.BN(targetComments),
              new anchor.BN(targetViews),
              new anchor.BN(targetShares),
              new anchor.BN(amountUsdc),
              new anchor.BN(deadline)
            )
            .accountsPartial({
              campaign: campaignPda,
              influencer: influencer.publicKey,
              brand: brand.publicKey,
              oracle: oracle.publicKey,
              systemProgram: SystemProgram.programId,
            })
            .signers([influencer])
            .rpc();

          console.log("Campaign created with transaction:", tx);

          // Then: Verificar se a campanha foi criada corretamente
          const campaignAccount = await program.account.campaign.fetch(campaignPda);

          // Verificar todos os campos
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
          expect(campaignAccount.status).to.deep.equal({ draft: {} });

          // Verificar métricas atuais zeradas
          expect(campaignAccount.currentLikes.toNumber()).to.equal(0);
          expect(campaignAccount.currentComments.toNumber()).to.equal(0);
          expect(campaignAccount.currentViews.toNumber()).to.equal(0);
          expect(campaignAccount.currentShares.toNumber()).to.equal(0);

          // Verificar valor pago zerado
          expect(campaignAccount.paidAmount.toNumber()).to.equal(0);

          // Verificar todos os marcos de pagamento como false
          expect(campaignAccount.paymentMilestones).to.deep.equal(
            Array(10).fill(false)
          );

          // Verificar timestamps
          expect(campaignAccount.createdAt.toNumber()).to.be.greaterThan(0);
          expect(campaignAccount.lastUpdated.toNumber()).to.be.greaterThan(0);
        } catch (error) {
          console.error("Error creating campaign:", error);
          throw error;
        }
      });
    });
  });
});