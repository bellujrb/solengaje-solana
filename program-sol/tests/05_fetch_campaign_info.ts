/**
 * Testes Solengage - Especificação BDD
 * 
 * Feature: Leitura de Dados da Campanha
 * 
 * Cenário: Cliente busca o estado de uma campanha após várias atualizações.
 * Given uma campanha que foi criada, ativada e teve suas métricas atualizadas.
 * When um cliente busca os dados da conta da campanha.
 * Then os dados buscados devem refletir com precisão o estado atual da campanha, incluindo:
 *   - Status "Active".
 *   - `paid_amount` refletindo os pagamentos feitos.
 *   - `current_likes` refletindo a última atualização de métricas.
 *   - `payment_milestones` marcados corretamente.
 */

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Solengage } from "../target/types/solengage";
import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount, createMint, TOKEN_PROGRAM_ID, mintTo } from "@solana/spl-token";
import { expect } from "chai";

describe("Solengage - 05 Fetch Campaign Info", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.solengage as Program<Solengage>;
  const provider = anchor.getProvider() as anchor.AnchorProvider;

  let influencer: Keypair, brand: Keypair, oracle: Keypair;
  let usdcMint: PublicKey;
  let campaignPda: PublicKey;

  // Test Data
  const campaignName = "Fetch Info Test";
  const brandName = "Fetch Test Brand";
  const hashtag = "#fetchtest";
  const totalAmount = new anchor.BN(500 * 1_000_000); // 500 USDC
  const targetLikes = new anchor.BN(1000);
  const deadline = new anchor.BN(Math.floor(Date.now() / 1000) + 86400);
  const updatedLikes = new anchor.BN(150); // 15% progress

  beforeEach(async () => {
    // GIVEN: A campaign that is created, activated, and updated
    influencer = Keypair.generate();
    brand = Keypair.generate();
    oracle = Keypair.generate();

    await Promise.all([
        provider.connection.requestAirdrop(influencer.publicKey, 2 * LAMPORTS_PER_SOL).then(sig => provider.connection.confirmTransaction(sig, "confirmed")),
        provider.connection.requestAirdrop(brand.publicKey, 2 * LAMPORTS_PER_SOL).then(sig => provider.connection.confirmTransaction(sig, "confirmed")),
        provider.connection.requestAirdrop(oracle.publicKey, 2 * LAMPORTS_PER_SOL).then(sig => provider.connection.confirmTransaction(sig, "confirmed")),
    ]);

    usdcMint = await createMint(provider.connection, brand, brand.publicKey, null, 6);

    const brandUsdcAccount = await getOrCreateAssociatedTokenAccount(provider.connection, brand, usdcMint, brand.publicKey).then(acc => acc.address);
    const influencerUsdcAccount = await getOrCreateAssociatedTokenAccount(provider.connection, influencer, usdcMint, influencer.publicKey).then(acc => acc.address);
    
    [campaignPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("campaign"), influencer.publicKey.toBuffer(), brand.publicKey.toBuffer(), Buffer.from(campaignName)],
      program.programId
    );
    const campaignUsdcAccount = await getOrCreateAssociatedTokenAccount(provider.connection, brand, usdcMint, campaignPda, true).then(acc => acc.address);

    await mintTo(provider.connection, brand, usdcMint, brandUsdcAccount, brand, totalAmount.muln(2).toNumber());

    // Create
    await program.methods
      .createCampaign(campaignName, "test-nickname", brandName, hashtag, targetLikes, new anchor.BN(0), new anchor.BN(0), new anchor.BN(0), totalAmount, deadline)
      .accounts({ campaign: campaignPda, influencer: influencer.publicKey, brand: brand.publicKey, oracle: oracle.publicKey, systemProgram: SystemProgram.programId })
      .signers([influencer])
      .rpc();

    // Activate
    await program.methods
      .brandPayCampaign()
      .accounts({ campaign: campaignPda, brand: brand.publicKey, brandUsdcAccount, campaignUsdcAccount, tokenProgram: TOKEN_PROGRAM_ID })
      .signers([brand])
      .rpc();

    // Update Metrics
    await program.methods
      .updateCampaignMetrics(updatedLikes, new anchor.BN(0), new anchor.BN(0), new anchor.BN(0))
      .accounts({ campaign: campaignPda, oracle: oracle.publicKey, campaignUsdcAccount, influencerUsdcAccount, tokenProgram: TOKEN_PROGRAM_ID })
      .signers([oracle])
      .rpc();
  });

  it("Scenario: Should fetch and verify the complete state of an updated campaign", async () => {
    // WHEN: A client fetches the campaign account data
    const campaignState = await program.account.campaign.fetch(campaignPda);

    // THEN: The fetched data should accurately reflect the campaign's current state
    expect(campaignState.status).to.deep.equal({ active: {} });
    expect(campaignState.name).to.equal(campaignName);
    expect(campaignState.brandName).to.equal(brandName);
    expect(campaignState.hashtag).to.equal(hashtag);
    expect(campaignState.influencer.equals(influencer.publicKey)).to.be.true;
    expect(campaignState.brand.equals(brand.publicKey)).to.be.true;
    expect(campaignState.oracle.equals(oracle.publicKey)).to.be.true;
    expect(campaignState.amountUsdc.toString()).to.equal(totalAmount.toString());
    expect(campaignState.deadline.toString()).to.equal(deadline.toString());

    // Verify metrics
    expect(campaignState.targetLikes.toString()).to.equal(targetLikes.toString());
    expect(campaignState.currentLikes.toString()).to.equal(updatedLikes.toString());

    // Verify payment state
    const expectedPaidAmount = totalAmount.divn(10); // 10% milestone paid
    expect(campaignState.paidAmount.toString()).to.equal(expectedPaidAmount.toString());
    expect(campaignState.paymentMilestones[0]).to.be.true;
    expect(campaignState.paymentMilestones.slice(1).every(m => m === false)).to.be.true;
  });
});