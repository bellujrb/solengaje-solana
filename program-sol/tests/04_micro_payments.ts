/**
 * Testes Solengage - Especificação BDD
 * 
 * Feature: Micro Pagamentos Progressivos
 * 
 * Cenário: Múltiplos pagamentos de marco são acionados por atualizações sucessivas de métricas.
 * Given uma campanha ativa com uma meta de 1000 likes e um valor total de 1000 USDC.
 * When o oracle atualiza as métricas para 150 likes (15% de progresso).
 * Then o primeiro marco (10%) é pago (100 USDC).
 * And o `paid_amount` da campanha é 100 USDC e `payment_milestones[0]` é verdadeiro.
 * When o oracle atualiza as métricas para 320 likes (32% de progresso).
 * Then mais dois marcos (20% e 30%) são pagos (totalizando 200 USDC nesta transação).
 * And o `paid_amount` da campanha agora é 300 USDC.
 * And `payment_milestones[1]` e `payment_milestones[2]` são verdadeiros.
 * And o saldo do influenciador aumentou em um total de 300 USDC desde o início.
 */

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Solengage } from "../target/types/solengage";
import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js";
import { getAccount, getOrCreateAssociatedTokenAccount, createMint, TOKEN_PROGRAM_ID, mintTo } from "@solana/spl-token";
import { expect } from "chai";

describe("Solengage - 04 Micro Payments", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.solengage as Program<Solengage>;
  const provider = anchor.getProvider() as anchor.AnchorProvider;

  let influencer: Keypair, brand: Keypair, oracle: Keypair;
  let usdcMint: PublicKey;
  let influencerUsdcAccount: PublicKey, campaignUsdcAccount: PublicKey;
  let campaignPda: PublicKey;

  const campaignName = "Micro Payments Test";
  const totalAmount = new anchor.BN(1000 * 1_000_000); // 1000 USDC
  const targetLikes = new anchor.BN(1000);

  beforeEach(async () => {
    console.log("\n========================================");
    console.log("🔧 SETUP: Inicializando ambiente de teste");
    console.log("========================================\n");

    console.log("📝 Gerando keypairs...");
    influencer = Keypair.generate();
    brand = Keypair.generate();
    oracle = Keypair.generate();
    console.log("✅ Keypairs gerados");

    console.log("\n💰 Solicitando airdrops de SOL...");
    await Promise.all([
        provider.connection.requestAirdrop(influencer.publicKey, 2 * LAMPORTS_PER_SOL).then(sig => provider.connection.confirmTransaction(sig, "confirmed")),
        provider.connection.requestAirdrop(brand.publicKey, 2 * LAMPORTS_PER_SOL).then(sig => provider.connection.confirmTransaction(sig, "confirmed")),
        provider.connection.requestAirdrop(oracle.publicKey, 2 * LAMPORTS_PER_SOL).then(sig => provider.connection.confirmTransaction(sig, "confirmed")),
    ]);
    console.log("✅ Airdrops confirmados");

    console.log("\n🪙 Criando USDC mint...");
    usdcMint = await createMint(provider.connection, brand, brand.publicKey, null, 6);
    console.log("✅ USDC mint criado");

    console.log("\n💼 Criando token accounts...");
    const brandUsdcAccount = await getOrCreateAssociatedTokenAccount(provider.connection, brand, usdcMint, brand.publicKey).then(acc => acc.address);
    influencerUsdcAccount = await getOrCreateAssociatedTokenAccount(provider.connection, influencer, usdcMint, influencer.publicKey).then(acc => acc.address);

    console.log("\n🔍 Calculando Campaign PDA...");
    [campaignPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("campaign"), influencer.publicKey.toBuffer(), brand.publicKey.toBuffer(), Buffer.from(campaignName)],
      program.programId
    );
    campaignUsdcAccount = await getOrCreateAssociatedTokenAccount(provider.connection, brand, usdcMint, campaignPda, true).then(acc => acc.address);
    console.log("✅ Campaign PDA e vault criados");

    console.log("\n💵 Mintando USDC...");
    await mintTo(provider.connection, brand, usdcMint, brandUsdcAccount, brand, totalAmount.muln(2).toNumber());
    console.log("✅ USDC mintado:", totalAmount.muln(2).toNumber() / 1_000_000, "USDC");

    console.log("\n📋 Criando campanha...");
    await program.methods
      .createCampaign(campaignName, "test-nickname", "Brand", "#micropayments", targetLikes, new anchor.BN(0), new anchor.BN(0), new anchor.BN(0), totalAmount, new anchor.BN(Date.now() / 1000 + 86400))
      .accounts({ campaign: campaignPda, influencer: influencer.publicKey, brand: brand.publicKey, oracle: oracle.publicKey, systemProgram: SystemProgram.programId })
      .signers([influencer])
      .rpc();
    console.log("✅ Campanha criada");

    console.log("\n💰 Ativando campanha...");
    await program.methods
      .brandPayCampaign()
      .accounts({ campaign: campaignPda, brand: brand.publicKey, brandUsdcAccount, campaignUsdcAccount, tokenProgram: TOKEN_PROGRAM_ID })
      .signers([brand])
      .rpc();
    console.log("✅ Campanha ativada - Status: Active");
    console.log("\n✅ Setup completo!\n");
  });

  it("Scenario: Should process multiple payment milestones across several updates", async () => {
    console.log("\n========================================");
    console.log("🧪 TESTE: Múltiplos Pagamentos Progressivos");
    console.log("========================================\n");

    console.log("✅ GIVEN: Campanha ativa com target de 1000 likes e 1000 USDC");
    const initialInfluencerBalance = (await getAccount(provider.connection, influencerUsdcAccount)).amount;
    console.log("   - Influencer balance inicial:", Number(initialInfluencerBalance) / 1_000_000, "USDC");

    // WHEN: First update to 15% progress (150 likes)
    console.log("\n📊 WHEN (1ª atualização): Oracle atualiza para 150 likes (15% do alvo)...");
    await program.methods
      .updateCampaignMetrics(new anchor.BN(150), new anchor.BN(0), new anchor.BN(0), new anchor.BN(0))
      .accounts({ campaign: campaignPda, oracle: oracle.publicKey, campaignUsdcAccount, influencerUsdcAccount, tokenProgram: TOKEN_PROGRAM_ID })
      .signers([oracle])
      .rpc();
    console.log("✅ Métricas atualizadas para 15%");

    // THEN: 10% milestone should be paid
    console.log("\n🔍 THEN: Verificando primeiro pagamento (10%)...");
    let campaignState = await program.account.campaign.fetch(campaignPda);
    let influencerBalance = (await getAccount(provider.connection, influencerUsdcAccount)).amount;
    const payment10percent = totalAmount.divn(10);

    expect(campaignState.paidAmount.toString()).to.equal(payment10percent.toString());
    expect(campaignState.paymentMilestones[0]).to.be.true;
    expect(campaignState.paymentMilestones[1]).to.be.false;
    expect(influencerBalance.toString()).to.equal((initialInfluencerBalance + BigInt(payment10percent.toString())).toString());

    console.log("   ✓ Paid Amount:", Number(campaignState.paidAmount) / 1_000_000, "USDC ✓");
    console.log("   ✓ Milestone 0 (10%): true ✓");
    console.log("   ✓ Milestone 1 (20%): false ✓");
    console.log("   ✓ Influencer recebeu:", Number(payment10percent) / 1_000_000, "USDC ✓");

    // WHEN: Second update to 32% progress (320 likes)
    console.log("\n📊 WHEN (2ª atualização): Oracle atualiza para 320 likes (32% do alvo)...");
    await program.methods
      .updateCampaignMetrics(new anchor.BN(320), new anchor.BN(0), new anchor.BN(0), new anchor.BN(0))
      .accounts({ campaign: campaignPda, oracle: oracle.publicKey, campaignUsdcAccount, influencerUsdcAccount, tokenProgram: TOKEN_PROGRAM_ID })
      .signers([oracle])
      .rpc();
    console.log("✅ Métricas atualizadas para 32%");

    // THEN: 20% and 30% milestones should be paid
    console.log("\n🔍 THEN: Verificando pagamentos adicionais (20% e 30%)...");
    campaignState = await program.account.campaign.fetch(campaignPda);
    influencerBalance = (await getAccount(provider.connection, influencerUsdcAccount)).amount;
    const payment30percent = totalAmount.muln(3).divn(10);

    expect(campaignState.paidAmount.toString()).to.equal(payment30percent.toString());
    expect(campaignState.paymentMilestones[0]).to.be.true;
    expect(campaignState.paymentMilestones[1]).to.be.true;
    expect(campaignState.paymentMilestones[2]).to.be.true;
    expect(campaignState.paymentMilestones[3]).to.be.false;
    expect(influencerBalance.toString()).to.equal((initialInfluencerBalance + BigInt(payment30percent.toString())).toString());

    console.log("   ✓ Paid Amount total:", Number(campaignState.paidAmount) / 1_000_000, "USDC (30%) ✓");
    console.log("   ✓ Milestone 0 (10%): true ✓");
    console.log("   ✓ Milestone 1 (20%): true ✓");
    console.log("   ✓ Milestone 2 (30%): true ✓");
    console.log("   ✓ Milestone 3 (40%): false ✓");
    console.log("   ✓ Influencer recebeu total:", Number(payment30percent) / 1_000_000, "USDC ✓");

    console.log("\n✅ Teste de Múltiplos Pagamentos Progressivos concluído com sucesso!\n");
  });
});