
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Influnest } from "../../target/types/influnest";
import {
  Keypair,
  SystemProgram,
  PublicKey,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  getOrCreateAssociatedTokenAccount,
  createMint,
  mintTo,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { assert } from "chai";

describe("influnest", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.influnest as Program<Influnest>;

  // Keypairs for accounts
  const authority = Keypair.generate();
  const oracle = Keypair.generate();
  const influencer = Keypair.generate();
  const brand = Keypair.generate();

  let usdcMint: PublicKey;
  let influencerTokenAccount: PublicKey;
  let brandTokenAccount: PublicKey;
  let vaultTokenAccount: PublicKey;

  const campaignCreatedAt = new anchor.BN(Date.now());
  let campaignPda: PublicKey;
  let campaignBump: number;

  let oracleConfigPda: PublicKey;
  let oracleConfigBump: number;

  // Helper function to airdrop SOL
  const airdrop = async (to: PublicKey, amount: number) => {
    await provider.connection.requestAirdrop(to, amount * LAMPORTS_PER_SOL);
    const latestBlockhash = await provider.connection.getLatestBlockhash();
    await provider.connection.confirmTransaction({
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      signature: await provider.connection.requestAirdrop(to, amount * LAMPORTS_PER_SOL),
    });
  };

  before(async () => {
    // Airdrop SOL to all accounts
    await Promise.all([
      airdrop(authority.publicKey, 2),
      airdrop(oracle.publicKey, 2),
      airdrop(influencer.publicKey, 2),
      airdrop(brand.publicKey, 2),
    ]);

    // Create USDC Mint
    usdcMint = await createMint(
      provider.connection,
      authority,
      authority.publicKey,
      null,
      6
    );

    // Create token accounts
    const [_brandTokenAccount, _influencerTokenAccount] = await Promise.all([
       getOrCreateAssociatedTokenAccount(
        provider.connection,
        brand,
        usdcMint,
        brand.publicKey
      ),
       getOrCreateAssociatedTokenAccount(
        provider.connection,
        influencer,
        usdcMint,
        influencer.publicKey
      )
    ]);

    brandTokenAccount = _brandTokenAccount.address;
    influencerTokenAccount = _influencerTokenAccount.address;


    // Mint some USDC to the brand
    await mintTo(
      provider.connection,
      authority,
      usdcMint,
      brandTokenAccount,
      authority,
      1_000_000_000 // 1000 USDC
    );

    // Find PDAs
    [oracleConfigPda, oracleConfigBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("oracle-config")],
      program.programId
    );

    [campaignPda, campaignBump] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("campaign"),
        influencer.publicKey.toBuffer(),
        campaignCreatedAt.toBuffer("le", 8),
      ],
      program.programId
    );

    const associatedToken = await anchor.utils.token.associatedAddress({
        mint: usdcMint,
        owner: campaignPda
    });
    vaultTokenAccount = associatedToken;
  });

  it("Initializes the oracle", async () => {
    await program.methods
      .initializeOracle(oracle.publicKey)
      .accounts({
        oracleConfig: oracleConfigPDA,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([authority])
      .rpc();

    const oracleConfigAccount = await program.account.oracleConfig.fetch(
      oracleConfigPda
    );
    assert.ok(oracleConfigAccount.authority.equals(authority.publicKey));
    assert.ok(oracleConfigAccount.oracle.equals(oracle.publicKey));
  });

  it("Creates a campaign", async () => {
    const name = "My Awesome Campaign";
    const description = "This is a test campaign.";
    const amountUsdc = new anchor.BN(100_000_000); // 100 USDC
    const targetLikes = new anchor.BN(1000);
    const targetComments = new anchor.BN(100);
    const targetViews = new anchor.BN(10000);
    const targetShares = new anchor.BN(50);
    const deadlineTs = new anchor.BN(Date.now() / 1000 + 3600); // 1 hour from now
    const instagramUsername = "test_influencer";


    await program.methods
      .createCampaign(
        name,
        description,
        amountUsdc,
        targetLikes,
        targetComments,
        targetViews,
        targetShares,
        deadlineTs,
        instagramUsername,
        campaignCreatedAt
      )
      .accounts({
        campaign: campaignPda,
        influencer: influencer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([influencer])
      .rpc();

    const campaignAccount = await program.account.campaign.fetch(campaignPda);
    assert.equal(campaignAccount.name, name);
    assert.ok(campaignAccount.influencer.equals(influencer.publicKey));
    assert.equal(campaignAccount.amountUsdc.toNumber(), amountUsdc.toNumber());
    assert.equal(campaignAccount.status.hasOwnProperty("pending"), true);
  });

  it("Funds a campaign", async () => {
    await program.methods
      .fundCampaign()
      .accounts({
        campaign: campaignPda,
        brand: brand.publicKey,
        brandTokenAccount: brandTokenAccount,
        vaultTokenAccount: vaultTokenAccount,
        usdcMint: usdcMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([brand])
      .rpc();

    const campaignAccount = await program.account.campaign.fetch(campaignPda);
    assert.ok(campaignAccount.brand.equals(brand.publicKey));
    assert.equal(campaignAccount.status.hasOwnProperty("active"), true);

    const vaultBalance = await provider.connection.getTokenAccountBalance(
      vaultTokenAccount
    );
    assert.equal(vaultBalance.value.uiAmount, 100);
  });

    it("Adds a post to the campaign", async () => {
        const postUrl = "https://instagram.com/p/123";
        const postId = "123456789";

        await program.methods
            .addPost(postUrl, postId)
            .accounts({
                campaign: campaignPda,
                influencer: influencer.publicKey,
            })
            .signers([influencer])
            .rpc();

        const campaignAccount = await program.account.campaign.fetch(campaignPda);
        assert.equal(campaignAccount.posts.length, 1);
        assert.equal(campaignAccount.posts[0].postUrl, postUrl);
        assert.equal(campaignAccount.posts[0].postId, postId);
    });


  it("Updates metrics and triggers partial payment", async () => {
    // Simulate 50% progress
    const newLikes = new anchor.BN(500); // 50% of 1000
    const newComments = new anchor.BN(50); // 50% of 100
    const newViews = new anchor.BN(5000); // 50% of 10000
    const newShares = new anchor.BN(25); // 50% of 50

    const influencerTokenAccountInfo = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        oracle,
        usdcMint,
        influencer.publicKey
    );

    await program.methods
      .updateCampaignMetrics(newLikes, newComments, newViews, newShares)
      .accounts({
        campaign: campaignPda,
        influencer: influencer.publicKey,
        oracleConfig: oracleConfigPda,
        oracle: oracle.publicKey,
        vaultTokenAccount: vaultTokenAccount,
        influencerTokenAccount: influencerTokenAccountInfo.address,
        usdcMint: usdcMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([oracle])
      .rpc();

    const campaignAccount = await program.account.campaign.fetch(campaignPda);
    const influencerBalance = await provider.connection.getTokenAccountBalance(
      influencerTokenAccountInfo.address
    );

    // Progress is 50%, so 5 milestones (5 * 10%) are achieved.
    // Payment should be 50% of 100 USDC = 50 USDC.
    assert.equal(campaignAccount.amountPaid.toNumber(), 50_000_000);
    assert.equal(influencerBalance.value.uiAmount, 50);
    assert.equal(campaignAccount.status.hasOwnProperty("active"), true);
  });

  it("Updates metrics to completion", async () => {
    // Simulate 100% progress
    const newLikes = new anchor.BN(1000);
    const newComments = new anchor.BN(100);
    const newViews = new anchor.BN(10000);
    const newShares = new anchor.BN(50);

     const influencerTokenAccountInfo = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        oracle,
        usdcMint,
        influencer.publicKey
    );

    await program.methods
      .updateCampaignMetrics(newLikes, newComments, newViews, newShares)
      .accounts({
        campaign: campaignPda,
        influencer: influencer.publicKey,
        oracleConfig: oracleConfigPda,
        oracle: oracle.publicKey,
        vaultTokenAccount: vaultTokenAccount,
        influencerTokenAccount: influencerTokenAccountInfo.address,
        usdcMint: usdcMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([oracle])
      .rpc();

    const campaignAccount = await program.account.campaign.fetch(campaignPda);
    const influencerBalance = await provider.connection.getTokenAccountBalance(
      influencerTokenAccountInfo.address
    );
    const vaultBalance = await provider.connection.getTokenAccountBalance(
      vaultTokenAccount
    );

    // Total paid should be 100 USDC
    assert.equal(campaignAccount.amountPaid.toNumber(), 100_000_000);
    assert.equal(influencerBalance.value.uiAmount, 100);
    assert.equal(vaultBalance.value.uiAmount, 0);
    assert.equal(campaignAccount.status.hasOwnProperty("completed"), true);
  });

   it("Prevents unauthorized oracle from updating metrics", async () => {
    const unauthorizedOracle = Keypair.generate();
    await airdrop(unauthorizedOracle.publicKey, 1);

    try {
        await program.methods
            .updateCampaignMetrics(new anchor.BN(0), new anchor.BN(0), new anchor.BN(0), new anchor.BN(0))
            .accounts({
                 campaign: campaignPda,
                influencer: influencer.publicKey,
                oracleConfig: oracleConfigPda,
                oracle: unauthorizedOracle.publicKey,
                vaultTokenAccount: vaultTokenAccount,
                influencerTokenAccount: influencerTokenAccount,
                usdcMint: usdcMint,
                tokenProgram: TOKEN_PROGRAM_ID,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            })
            .signers([unauthorizedOracle])
            .rpc();
        assert.fail("Should have failed with UnauthorizedOracle error");
    } catch (err) {
        assert.equal(err.error.errorCode.code, "UnauthorizedOracle");
    }
  });

  it("Allows brand to withdraw from expired campaign", async () => {
    // Create a new campaign that will expire
    const newCampaignCreatedAt = new anchor.BN(Date.now() + 1000);
    const [newCampaignPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("campaign"),
        influencer.publicKey.toBuffer(),
        newCampaignCreatedAt.toBuffer("le", 8),
      ],
      program.programId
    );
    const newVaultAta = await anchor.utils.token.associatedAddress({
        mint: usdcMint,
        owner: newCampaignPda
    });


    await program.methods
      .createCampaign(
        "Expired Campaign", "desc", new anchor.BN(50_000_000),
        new anchor.BN(100), new anchor.BN(10), new anchor.BN(1000), new anchor.BN(5),
        new anchor.BN(Math.floor(Date.now() / 1000) + 1), // Expires in 1 second
        "exp_influencer",
        newCampaignCreatedAt
      )
      .accounts({
        campaign: newCampaignPda,
        influencer: influencer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([influencer])
      .rpc();

    await program.methods
      .fundCampaign()
      .accounts({
        campaign: newCampaignPda,
        brand: brand.publicKey,
        brandTokenAccount: brandTokenAccount,
        vaultTokenAccount: newVaultAta,
        usdcMint: usdcMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([brand])
      .rpc();

    // Wait for campaign to expire
    await new Promise(resolve => setTimeout(resolve, 2000));

    const brandTokenAccountBefore = await provider.connection.getTokenAccountBalance(brandTokenAccount);

    await program.methods
        .withdrawExpiredStake()
        .accounts({
            campaign: newCampaignPda,
            brand: brand.publicKey,
            vaultTokenAccount: newVaultAta,
            brandTokenAccount: brandTokenAccount,
            usdcMint: usdcMint,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
        })
        .signers([brand])
        .rpc();

    const campaignAccount = await program.account.campaign.fetch(newCampaignPda);
    const brandTokenAccountAfter = await provider.connection.getTokenAccountBalance(brandTokenAccount);

    assert.equal(campaignAccount.status.hasOwnProperty("expired"), true);
    assert.isAbove(brandTokenAccountAfter.value.uiAmount, brandTokenAccountBefore.value.uiAmount);
  });

});
