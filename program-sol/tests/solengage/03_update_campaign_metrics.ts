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
    // 1. Setup: Create accounts, mint tokens, and create an ACTIVE campaign
    influencer = Keypair.generate();
    brand = Keypair.generate();
    oracle = Keypair.generate();

    console.log("Influencer PK:", influencer.publicKey.toBase58());
    console.log("Brand PK:", brand.publicKey.toBase58());
    console.log("Oracle PK:", oracle.publicKey.toBase58());

    await provider.connection.requestAirdrop(influencer.publicKey, 2 * LAMPORTS_PER_SOL).then(sig => provider.connection.confirmTransaction(sig));
    await provider.connection.requestAirdrop(brand.publicKey, 2 * LAMPORTS_PER_SOL).then(sig => provider.connection.confirmTransaction(sig));
    await provider.connection.requestAirdrop(oracle.publicKey, 2 * LAMPORTS_PER_SOL).then(sig => provider.connection.confirmTransaction(sig));

    usdcMint = await createMint(provider.connection, brand, brand.publicKey, null, 6);

    [campaignPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("campaign"), influencer.publicKey.toBuffer(), brand.publicKey.toBuffer(), Buffer.from(campaignName)],
      program.programId
    );

    brandUsdcAccount = await getOrCreateAssociatedTokenAccount(provider.connection, brand, usdcMint, brand.publicKey).then(acc => acc.address);
    influencerUsdcAccount = await getOrCreateAssociatedTokenAccount(provider.connection, influencer, usdcMint, influencer.publicKey).then(acc => acc.address);
    campaignUsdcAccount = await getOrCreateAssociatedTokenAccount(provider.connection, brand, usdcMint, campaignPda, true).then(acc => acc.address);

    await mintTo(provider.connection, brand, usdcMint, brandUsdcAccount, brand, totalAmount.muln(2).toNumber());

    // Create Campaign
    await program.methods
      .createCampaign(
        campaignName, "Brand", "#metrics", targetLikes, new anchor.BN(0), new anchor.BN(0), new anchor.BN(0),
        totalAmount, new anchor.BN(Date.now() / 1000 + 86400)
      )
      .accounts({ 
          campaign: campaignPda, influencer: influencer.publicKey, brand: brand.publicKey, 
          oracle: oracle.publicKey, systemProgram: SystemProgram.programId 
      })
      .signers([influencer])
      .rpc();

    // Activate Campaign
    await program.methods
      .brandPayCampaign()
      .accounts({ 
          campaign: campaignPda, brand: brand.publicKey, brandUsdcAccount, 
          campaignUsdcAccount, tokenProgram: TOKEN_PROGRAM_ID 
      })
      .signers([brand])
      .rpc();
  });

  it("Scenario: Oracle updates metrics, triggering the first milestone payment", async () => {
    // Given: An active campaign (from beforeEach)
    const initialCampaignState = await program.account.campaign.fetch(campaignPda);
    expect(initialCampaignState.status).to.deep.equal({ active: {} });
    const initialInfluencerBalance = (await getAccount(provider.connection, influencerUsdcAccount)).amount;
    const initialCampaignBalance = (await getAccount(provider.connection, campaignUsdcAccount)).amount;

    // When: The oracle updates metrics to cross the 10% threshold
    const newLikes = new anchor.BN(100); // 10% of targetLikes (1000)
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

    // Then: Verify all outcomes
    const finalCampaignState = await program.account.campaign.fetch(campaignPda);
    const finalInfluencerBalance = (await getAccount(provider.connection, influencerUsdcAccount)).amount;
    const finalCampaignBalance = (await getAccount(provider.connection, campaignUsdcAccount)).amount;

    // 1. Metrics are updated
    expect(finalCampaignState.currentLikes.toString()).to.equal(newLikes.toString());

    // 2. Influencer received the payment
    const paymentAmount = totalAmount.divn(10); // 10% payment
    const expectedInfluencerBalance = initialInfluencerBalance + BigInt(paymentAmount.toString());
    expect(finalInfluencerBalance.toString()).to.equal(expectedInfluencerBalance.toString());

    // 3. Campaign vault balance is reduced
    const expectedCampaignBalance = initialCampaignBalance - BigInt(paymentAmount.toString());
    expect(finalCampaignBalance.toString()).to.equal(expectedCampaignBalance.toString());

    // 4. Campaign paid_amount is updated
    expect(finalCampaignState.paidAmount.toString()).to.equal(paymentAmount.toString());

    // 5. Payment milestone is marked as true
    expect(finalCampaignState.paymentMilestones[0]).to.be.true;
    expect(finalCampaignState.paymentMilestones.slice(1).every(m => m === false)).to.be.true;
  });
});