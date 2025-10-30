/**
 * Testes Solengage - Especificação BDD
 * 
 * Feature: Atualização de Métricas e Pagamentos Progressivos
 * 
 * Cenário: Oracle atualiza métricas, acionando o primeiro pagamento de marco (10%)
 * Given uma campanha ativa com metas definidas
 * And o influenciador tem uma conta USDC para receber pagamentos
 * When o oracle autorizado atualiza as métricas, atingindo 10% do alvo
 * Then as métricas da campanha (ex: current_likes) devem ser atualizadas
 * And um pagamento de 10% do valor total da campanha deve ser transferido para o influenciador
 * And o saldo da conta da campanha deve diminuir nesse valor
 * And o valor pago (paid_amount) na campanha deve ser atualizado
 * And o primeiro marco de pagamento (payment_milestones[0]) deve ser marcado como verdadeiro
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
  getAccount,
  getOrCreateAssociatedTokenAccount,
  mintTo
} from "@solana/spl-token";
import { expect } from "chai";

describe("Solengage - 03 Update Campaign Metrics", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.solengage as Program<Solengage>;
  const provider = anchor.getProvider() as anchor.AnchorProvider;

  // Accounts
  let influencer: Keypair, brand: Keypair, oracle: Keypair;
  let usdcMint: PublicKey;
  let brandUsdcAccount: PublicKey, influencerUsdcAccount: PublicKey, campaignUsdcAccount: PublicKey;
  let campaignPda: PublicKey;

  // Campaign Data
  const campaignName = "Test Metrics Update";
  const totalAmount = new anchor.BN(1000 * 1_000_000); // 1000 USDC
  const targetLikes = new anchor.BN(1000);

  beforeEach(async () => {
    console.log("\n========================================");
    console.log("🔧 SETUP: Inicializando ambiente de teste");
    console.log("========================================\n");

    // 1. Setup: Create accounts, mint tokens, and create an ACTIVE campaign
    console.log("📝 Gerando keypairs...");
    influencer = Keypair.generate();
    brand = Keypair.generate();
    oracle = Keypair.generate();

    console.log("✅ Keypairs gerados:");
    console.log("   - Influencer:", influencer.publicKey.toBase58());
    console.log("   - Brand:", brand.publicKey.toBase58());
    console.log("   - Oracle:", oracle.publicKey.toBase58());

    console.log("\n💰 Solicitando airdrops de SOL...");
    await provider.connection.requestAirdrop(influencer.publicKey, 2 * LAMPORTS_PER_SOL).then(sig => provider.connection.confirmTransaction(sig));
    await provider.connection.requestAirdrop(brand.publicKey, 2 * LAMPORTS_PER_SOL).then(sig => provider.connection.confirmTransaction(sig));
    await provider.connection.requestAirdrop(oracle.publicKey, 2 * LAMPORTS_PER_SOL).then(sig => provider.connection.confirmTransaction(sig));
    console.log("✅ Airdrops confirmados");

    console.log("\n🪙 Criando USDC mint...");
    usdcMint = await createMint(provider.connection, brand, brand.publicKey, null, 6);
    console.log("✅ USDC mint criado:", usdcMint.toBase58());

    console.log("\n🔍 Calculando Campaign PDA...");
    [campaignPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("campaign"), influencer.publicKey.toBuffer(), brand.publicKey.toBuffer(), Buffer.from(campaignName)],
      program.programId
    );
    console.log("✅ Campaign PDA:", campaignPda.toBase58());

    console.log("\n💼 Criando token accounts...");
    brandUsdcAccount = await getOrCreateAssociatedTokenAccount(provider.connection, brand, usdcMint, brand.publicKey).then(acc => acc.address);
    influencerUsdcAccount = await getOrCreateAssociatedTokenAccount(provider.connection, influencer, usdcMint, influencer.publicKey).then(acc => acc.address);
    campaignUsdcAccount = await getOrCreateAssociatedTokenAccount(provider.connection, brand, usdcMint, campaignPda, true).then(acc => acc.address);
    console.log("✅ Token accounts criados");

    console.log("\n💵 Mintando USDC para brand...");
    const mintAmount = totalAmount.muln(2).toNumber();
    await mintTo(provider.connection, brand, usdcMint, brandUsdcAccount, brand, mintAmount);
    console.log("✅ USDC mintado:", mintAmount / 1_000_000, "USDC");

    // Create Campaign
    console.log("\n📋 Criando campanha...");
    await program.methods
      .createCampaign(
        campaignName, "test-nickname", "Brand", "#metrics", targetLikes, new anchor.BN(0), new anchor.BN(0), new anchor.BN(0),
        totalAmount, new anchor.BN(Date.now() / 1000 + 86400)
      )
      .accounts({
          campaign: campaignPda, influencer: influencer.publicKey, brand: brand.publicKey,
          oracle: oracle.publicKey, systemProgram: SystemProgram.programId
      })
      .signers([influencer])
      .rpc();
    console.log("✅ Campanha criada");

    // Activate Campaign
    console.log("\n💰 Ativando campanha...");
    await program.methods
      .brandPayCampaign()
      .accounts({
          campaign: campaignPda, brand: brand.publicKey, brandUsdcAccount,
          campaignUsdcAccount, tokenProgram: TOKEN_PROGRAM_ID
      })
      .signers([brand])
      .rpc();
    console.log("✅ Campanha ativada - Status: Active");
    console.log("\n✅ Setup completo!\n");
  });

  it("Scenario: Oracle updates metrics, triggering the first milestone payment", async () => {
    console.log("\n========================================");
    console.log("🧪 TESTE: Atualização de Métricas e Primeiro Pagamento");
    console.log("========================================\n");

    // Given: An active campaign (from beforeEach)
    console.log("✅ GIVEN: Campanha ativa criada no beforeEach");
    const initialCampaignState = await program.account.campaign.fetch(campaignPda);
    expect(initialCampaignState.status).to.deep.equal({ active: {} });
    console.log("   - Status: Active ✓");

    const initialInfluencerBalance = (await getAccount(provider.connection, influencerUsdcAccount)).amount;
    const initialCampaignBalance = (await getAccount(provider.connection, campaignUsdcAccount)).amount;
    console.log("   - Influencer balance inicial:", Number(initialInfluencerBalance) / 1_000_000, "USDC");
    console.log("   - Campaign vault balance:", Number(initialCampaignBalance) / 1_000_000, "USDC");

    // When: The oracle updates metrics to cross the 10% threshold
    console.log("\n📊 WHEN: Oracle atualiza métricas para 10% do alvo...");
    const newLikes = new anchor.BN(100); // 10% of targetLikes (1000)
    console.log("   - Target Likes:", targetLikes.toString());
    console.log("   - New Likes:", newLikes.toString(), "(10% do alvo)");

    await program.methods
      .updateCampaignMetrics(newLikes, new anchor.BN(0), new anchor.BN(0), new anchor.BN(0))
      .accounts({
        campaign: campaignPda,
        oracle: oracle.publicKey,
        campaignUsdcAccount: campaignUsdcAccount,
        influencerUsdcAccount: influencerUsdcAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([oracle])
      .rpc();
    console.log("✅ Métricas atualizadas com sucesso!");

    // Then: Verify all outcomes
    console.log("\n🔍 THEN: Verificando resultados...");
    const finalCampaignState = await program.account.campaign.fetch(campaignPda);
    const finalInfluencerBalance = (await getAccount(provider.connection, influencerUsdcAccount)).amount;
    const finalCampaignBalance = (await getAccount(provider.connection, campaignUsdcAccount)).amount;

    // 1. Metrics are updated
    console.log("\n   ✓ Verificando atualização de métricas...");
    expect(finalCampaignState.currentLikes.toString()).to.equal(newLikes.toString());
    console.log("     - Current Likes:", finalCampaignState.currentLikes.toString(), "✓");

    // 2. Influencer received the payment
    console.log("\n   ✓ Verificando pagamento ao influencer...");
    const paymentAmount = totalAmount.divn(10); // 10% payment
    const expectedInfluencerBalance = initialInfluencerBalance + BigInt(paymentAmount.toString());
    expect(finalInfluencerBalance.toString()).to.equal(expectedInfluencerBalance.toString());
    console.log("     - Pagamento esperado:", Number(paymentAmount) / 1_000_000, "USDC (10%)");
    console.log("     - Influencer balance final:", Number(finalInfluencerBalance) / 1_000_000, "USDC ✓");

    // 3. Campaign vault balance is reduced
    console.log("\n   ✓ Verificando redução no vault...");
    const expectedCampaignBalance = initialCampaignBalance - BigInt(paymentAmount.toString());
    expect(finalCampaignBalance.toString()).to.equal(expectedCampaignBalance.toString());
    console.log("     - Campaign vault final:", Number(finalCampaignBalance) / 1_000_000, "USDC ✓");

    // 4. Campaign paid_amount is updated
    console.log("\n   ✓ Verificando paid_amount...");
    expect(finalCampaignState.paidAmount.toString()).to.equal(paymentAmount.toString());
    console.log("     - Paid Amount:", Number(finalCampaignState.paidAmount) / 1_000_000, "USDC ✓");

    // 5. Payment milestone is marked as true
    console.log("\n   ✓ Verificando payment milestones...");
    expect(finalCampaignState.paymentMilestones[0]).to.be.true;
    expect(finalCampaignState.paymentMilestones.slice(1).every(m => m === false)).to.be.true;
    console.log("     - Milestone 0 (10%): true ✓");
    console.log("     - Outros milestones: false ✓");

    console.log("\n✅ Teste de Atualização de Métricas concluído com sucesso!\n");
  });
});