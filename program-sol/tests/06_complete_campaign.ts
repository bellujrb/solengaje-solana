import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Solengage } from "../target/types/solengage";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createMint,
  createAccount,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import { assert } from "chai";

describe("solengage - Auto Close Campaign on 100% Completion", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Solengage as Program<Solengage>;

  // Keypairs for our actors
  const influencer = anchor.web3.Keypair.generate();
  const brand = anchor.web3.Keypair.generate();
  const oracle = anchor.web3.Keypair.generate(); // Oracle will receive rent refund

  // Campaign details
  const campaignName = "Test Campaign Auto Close";
  const campaignNickname = "AutoClose";
  const brandName = "Test Brand";
  const hashtag = "#autoclose";
  const targetLikes = new anchor.BN(10);
  const targetComments = new anchor.BN(0);
  const targetViews = new anchor.BN(0);
  const targetShares = new anchor.BN(0);
  const amountUsdc = new anchor.BN(100_000_000); // 100 USDC (6 decimals)
  const deadline = new anchor.BN(
    Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 // 7 days from now
  );

  // USDC Mint and Token Accounts
  let usdcMint: anchor.web3.PublicKey;
  let brandUsdcAccount: anchor.web3.PublicKey;
  let influencerUsdcAccount: anchor.web3.PublicKey;
  let campaignUsdcAccount: anchor.web3.PublicKey;

  // PDA for the campaign account
  let campaignPda: anchor.web3.PublicKey;
  let campaignBump: number;

  before(async () => {
    // Airdrop SOL to all participants
    await provider.connection.requestAirdrop(
      influencer.publicKey,
      10 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.requestAirdrop(
      brand.publicKey,
      10 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.requestAirdrop(
      oracle.publicKey,
      10 * anchor.web3.LAMPORTS_PER_SOL
    );

    // Create USDC Mint
    usdcMint = await createMint(
      provider.connection,
      provider.wallet.payer, // Payer for the mint creation
      provider.wallet.publicKey, // Mint authority
      provider.wallet.publicKey, // Freeze authority
      6 // Decimals
    );

    // Get Associated Token Addresses
    brandUsdcAccount = await getAssociatedTokenAddress(
      usdcMint,
      brand.publicKey
    );
    influencerUsdcAccount = await getAssociatedTokenAddress(
      usdcMint,
      influencer.publicKey
    );

    // Create Brand's USDC Account
    await createAccount(
      provider.connection,
      brand, // Payer for the account creation
      usdcMint,
      brand.publicKey
    );

    // Create Influencer's USDC Account
    await createAccount(
      provider.connection,
      influencer, // Payer for the account creation
      usdcMint,
      influencer.publicKey
    );

    // Mint USDC to Brand's account
    await mintTo(
      provider.connection,
      provider.wallet.payer, // Payer for the mintTo transaction
      usdcMint,
      brandUsdcAccount,
      provider.wallet.payer, // Mint authority
      amountUsdc.mul(new anchor.BN(2)).toNumber() // Mint double the campaign amount
    );

    // Derive PDA for the campaign account
    [campaignPda, campaignBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("campaign"),
        influencer.publicKey.toBuffer(),
        brand.publicKey.toBuffer(),
        Buffer.from(campaignName),
      ],
      program.programId
    );

    // Derive PDA for the campaign's USDC vault
    campaignUsdcAccount = await getAssociatedTokenAddress(
      usdcMint,
      campaignPda,
      true // allowOwnerOffCurve - PDA can be owner
    );
  });

  it("should create, activate, complete, and auto-close a campaign, refunding rent to oracle", async () => {
    // --- 1. Create Campaign ---
    console.log("1. Creating campaign...");
    const initialOracleSolBalance = await provider.connection.getBalance(
      oracle.publicKey
    );

    await program.methods
      .createCampaign(
        campaignName,
        campaignNickname,
        brandName,
        hashtag,
        targetLikes,
        targetComments,
        targetViews,
        targetShares,
        amountUsdc,
        deadline
      )
      .accounts({
        campaign: campaignPda,
        influencer: influencer.publicKey, // Influencer is payer in current code
        brand: brand.publicKey,
        oracle: oracle.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([influencer]) // Influencer signs as payer
      .rpc();

    let campaignAccount = await program.account.campaign.fetch(campaignPda);
    assert.equal(campaignAccount.status.draft, true);
    console.log(
      "Campaign created with status:",
      Object.keys(campaignAccount.status)[0]
    );

    // --- 2. Brand Pays Campaign ---
    console.log("2. Brand paying campaign...");
    const initialBrandUsdcBalance = (
      await getAccount(provider.connection, brandUsdcAccount)
    ).amount;

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

    campaignAccount = await program.account.campaign.fetch(campaignPda);
    assert.equal(campaignAccount.status.active, true);
    assert.equal(campaignAccount.amountUsdc.toString(), amountUsdc.toString());
    assert.equal(
      (
        await getAccount(provider.connection, campaignUsdcAccount)
      ).amount.toString(),
      amountUsdc.toString()
    );
    assert.equal(
      (
        await getAccount(provider.connection, brandUsdcAccount)
      ).amount.toString(),
      initialBrandUsdcBalance.sub(amountUsdc).toString()
    );
    console.log(
      "Campaign paid and active. Campaign USDC balance:",
      (
        await getAccount(provider.connection, campaignUsdcAccount)
      ).amount.toString()
    );

    // --- 3. Oracle Updates Metrics to 100% and Triggers Closure ---
    console.log("3. Oracle updating metrics to 100% completion...");
    const initialInfluencerUsdcBalance = (
      await getAccount(provider.connection, influencerUsdcAccount)
    ).amount;

    // Get rent amount of the campaign account before it's closed
    const campaignAccountInfo = await provider.connection.getAccountInfo(
      campaignPda
    );
    const rentExemptAmount = campaignAccountInfo
      ? campaignAccountInfo.lamports
      : 0;
    console.log(
      "Rent exempt amount for campaign account:",
      rentExemptAmount / anchor.web3.LAMPORTS_PER_SOL,
      "SOL"
    );

    await program.methods
      .updateCampaignMetrics(
        targetLikes, // Set current likes to target likes for 100%
        targetComments,
        targetViews,
        targetShares
      )
      .accounts({
        campaign: campaignPda,
        oracle: oracle.publicKey,
        campaignUsdcAccount: campaignUsdcAccount,
        influencerUsdcAccount: influencerUsdcAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId, // Added for CPI
      })
      .signers([oracle])
      .rpc();

    console.log("Metrics updated. Checking for campaign closure...");

    // --- Assertions for Closure and Refunds ---

    // 1. Campaign account should no longer exist
    try {
      await program.account.campaign.fetch(campaignPda);
      assert.fail("Campaign account should have been closed.");
    } catch (e) {
      assert.include(
        e.message,
        "Account does not exist",
        "Campaign account was not closed correctly."
      );
      console.log("Campaign account successfully closed.");
    }

    // 2. Oracle's SOL balance should have increased by the rent amount
    const finalOracleSolBalance = await provider.connection.getBalance(
      oracle.publicKey
    );
    // Allow for transaction fees, so check if it's *approximately* increased by rent
    const expectedMinOracleSolIncrease = rentExemptAmount - 2 * 5000; // Subtracting estimated tx fees for 2 transactions (update + close CPI)
    assert.isAtLeast(
      finalOracleSolBalance,
      initialOracleSolBalance + expectedMinOracleSolIncrease,
      "Oracle did not receive the rent refund."
    );
    console.log(
      "Oracle final SOL balance:",
      finalOracleSolBalance / anchor.web3.LAMPORTS_PER_SOL
    );
    console.log(
      "Oracle initial SOL balance:",
      initialOracleSolBalance / anchor.web3.LAMPORTS_PER_SOL
    );
    console.log(
      "Expected min increase:",
      expectedMinOracleSolIncrease / anchor.web3.LAMPORTS_PER_SOL
    );

    // 3. Influencer's USDC balance should have increased by the full amount
    const finalInfluencerUsdcBalance = (
      await getAccount(provider.connection, influencerUsdcAccount)
    ).amount;
    assert.equal(
      finalInfluencerUsdcBalance.toString(),
      initialInfluencerUsdcBalance.add(amountUsdc).toString(),
      "Influencer did not receive full USDC payment."
    );
    console.log(
      "Influencer final USDC balance:",
      finalInfluencerUsdcBalance.toString()
    );

    // 4. Campaign USDC vault should be empty or closed (it's an ATA, so it might just be empty)
    const campaignUsdcAccountInfo = await provider.connection.getAccountInfo(
      campaignUsdcAccount
    );
    if (campaignUsdcAccountInfo) {
      const finalCampaignUsdcBalance = (
        await getAccount(provider.connection, campaignUsdcAccount)
      ).amount;
      assert.equal(
        finalCampaignUsdcBalance.toString(),
        "0",
        "Campaign USDC vault should be empty."
      );
      console.log("Campaign USDC vault is empty.");
    } else {
      console.log(
        "Campaign USDC vault was also closed (expected for ATAs when empty)."
      );
    }
  });
});
