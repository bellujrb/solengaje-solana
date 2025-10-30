/**
 * Testes Solengage - Especificação BDD
 *
 * Feature: Fechamento Automático de Campanha ao Atingir 100% de Conclusão
 *
 * Cenário: Campanha é automaticamente fechada quando atinge 100% das metas
 * Given uma campanha ativa com metas definidas (ex: 10 likes)
 * And o influenciador já recebeu pagamentos parciais
 * When o oracle atualiza as métricas para atingir 100% das metas
 * Then todos os marcos de pagamento pendentes devem ser processados (até completar 100% do valor)
 * And o status da campanha deve mudar para "Completed"
 * And a conta da campanha deve ser automaticamente fechada
 * And o aluguel (rent) da conta deve ser devolvido para o oracle
 * And o saldo do influenciador deve refletir o pagamento total da campanha
 */

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
  getOrCreateAssociatedTokenAccount,
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
    console.log("\n========================================");
    console.log("🔧 SETUP: Inicializando ambiente de teste");
    console.log("========================================\n");

    // Airdrop SOL to all participants
    console.log("💰 Solicitando airdrops de SOL...");
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
    console.log("✅ Airdrops solicitados para todos os participantes");

    // Create USDC Mint
    console.log("\n🪙 Criando USDC mint (6 decimals)...");
    usdcMint = await createMint(
      provider.connection,
      provider.wallet.payer, // Payer for the mint creation
      provider.wallet.publicKey, // Mint authority
      provider.wallet.publicKey, // Freeze authority
      6 // Decimals
    );
    console.log("✅ USDC mint criado:", usdcMint.toBase58());

    // Get Associated Token Addresses
    console.log("\n🔍 Calculando Associated Token Addresses...");
    brandUsdcAccount = await getAssociatedTokenAddress(
      usdcMint,
      brand.publicKey
    );
    influencerUsdcAccount = await getAssociatedTokenAddress(
      usdcMint,
      influencer.publicKey
    );
    console.log("✅ ATAs calculados");

    // Create Brand's USDC Account
    console.log("\n💼 Criando token accounts...");
    await createAccount(
      provider.connection,
      brand, // Payer for the account creation
      usdcMint,
      brand.publicKey
    );
    console.log("✅ Brand USDC account criado");

    // Create Influencer's USDC Account
    await createAccount(
      provider.connection,
      influencer, // Payer for the account creation
      usdcMint,
      influencer.publicKey
    );
    console.log("✅ Influencer USDC account criado");

    // Mint USDC to Brand's account
    console.log("\n💵 Mintando USDC para brand...");
    const mintAmount = amountUsdc.mul(new anchor.BN(2)).toNumber();
    await mintTo(
      provider.connection,
      provider.wallet.payer, // Payer for the mintTo transaction
      usdcMint,
      brandUsdcAccount,
      provider.wallet.payer, // Mint authority
      mintAmount // Mint double the campaign amount
    );
    console.log("✅ USDC mintado:", mintAmount / 1_000_000, "USDC");

    // Derive PDA for the campaign account
    console.log("\n🔍 Calculando Campaign PDA...");
    [campaignPda, campaignBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("campaign"),
        influencer.publicKey.toBuffer(),
        brand.publicKey.toBuffer(),
        Buffer.from(campaignName),
      ],
      program.programId
    );
    console.log("✅ Campaign PDA:", campaignPda.toBase58());

    // Create Campaign's USDC Account (vault) - using getOrCreateAssociatedTokenAccount for PDA
    console.log("\n💼 Criando Campaign USDC vault...");
    const campaignUsdcAccountInfo = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      brand,
      usdcMint,
      campaignPda,
      true // allowOwnerOffCurve - PDA can be owner
    );
    campaignUsdcAccount = campaignUsdcAccountInfo.address;
    console.log("✅ Campaign USDC vault criado:", campaignUsdcAccount.toBase58());
    console.log("\n✅ Setup completo!\n");
  });

  it("should create, activate, complete, and auto-close a campaign, refunding rent to oracle", async () => {
    console.log("\n========================================");
    console.log("🧪 TESTE: Fechamento Automático ao Atingir 100%");
    console.log("========================================\n");

    // --- 1. Create Campaign ---
    console.log("📋 ETAPA 1: Criando campanha...");
    const initialOracleSolBalance = await provider.connection.getBalance(
      oracle.publicKey
    );
    console.log("   - Oracle SOL balance inicial:", initialOracleSolBalance / anchor.web3.LAMPORTS_PER_SOL, "SOL");

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
      .accountsStrict({
        campaign: campaignPda,
        influencer: influencer.publicKey,
        brand: brand.publicKey,
        oracle: oracle.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([influencer])
      .rpc();

    let campaignAccount = await program.account.campaign.fetch(campaignPda);
    assert.deepEqual(campaignAccount.status, { draft: {} });
    console.log("✅ Campanha criada com status:", Object.keys(campaignAccount.status)[0]);

    // --- 2. Brand Pays Campaign ---
    console.log("\n💰 ETAPA 2: Brand ativando campanha...");
    const initialBrandUsdcBalance = (
      await getAccount(provider.connection, brandUsdcAccount)
    ).amount;

    await program.methods
      .brandPayCampaign()
      .accountsStrict({
        campaign: campaignPda,
        brand: brand.publicKey,
        brandUsdcAccount: brandUsdcAccount,
        campaignUsdcAccount: campaignUsdcAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([brand])
      .rpc();

    campaignAccount = await program.account.campaign.fetch(campaignPda);
    assert.deepEqual(campaignAccount.status, { active: {} });
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
      (initialBrandUsdcBalance - BigInt(amountUsdc.toString())).toString()
    );
    console.log("✅ Campanha ativada com sucesso!");
    console.log(
      "   - Campaign USDC vault balance:",
      Number((await getAccount(provider.connection, campaignUsdcAccount)).amount) / 1_000_000,
      "USDC"
    );

    // --- 3. Oracle Updates Metrics to 100% and Triggers Closure ---
    console.log("\n📊 ETAPA 3: Oracle atualizando métricas para 100%...");
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
      "   - Rent da campaign account:",
      rentExemptAmount / anchor.web3.LAMPORTS_PER_SOL,
      "SOL"
    );
    console.log("   - Atualizando para target likes:", targetLikes.toString(), "(100%)");

    await program.methods
      .updateCampaignMetrics(
        targetLikes, // Set current likes to target likes for 100%
        targetComments,
        targetViews,
        targetShares
      )
      .accountsStrict({
        campaign: campaignPda,
        oracle: oracle.publicKey,
        campaignUsdcAccount: campaignUsdcAccount,
        influencerUsdcAccount: influencerUsdcAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([oracle])
      .rpc();

    console.log("✅ Métricas atualizadas para 100%!");

    // --- Assertions for Closure and Refunds ---
    console.log("\n🔍 VERIFICAÇÕES: Validando fechamento automático...\n");

    // 1. Campaign account should no longer exist
    console.log("   ✓ Verificando fechamento da campaign account...");
    try {
      await program.account.campaign.fetch(campaignPda);
      assert.fail("Campaign account should have been closed.");
    } catch (e) {
      assert.include(
        e.message,
        "Account does not exist",
        "Campaign account was not closed correctly."
      );
      console.log("     - Campaign account fechada com sucesso ✓");
    }

    // 2. Oracle's SOL balance should have increased by the rent amount
    console.log("\n   ✓ Verificando refund de rent para oracle...");
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
    console.log("     - Oracle SOL balance inicial:", initialOracleSolBalance / anchor.web3.LAMPORTS_PER_SOL, "SOL");
    console.log("     - Oracle SOL balance final:", finalOracleSolBalance / anchor.web3.LAMPORTS_PER_SOL, "SOL");
    console.log("     - Aumento mínimo esperado:", expectedMinOracleSolIncrease / anchor.web3.LAMPORTS_PER_SOL, "SOL");
    console.log("     - Oracle recebeu rent refund ✓");

    // 3. Influencer's USDC balance should have increased by the full amount
    console.log("\n   ✓ Verificando pagamento completo ao influencer...");
    const finalInfluencerUsdcBalance = (
      await getAccount(provider.connection, influencerUsdcAccount)
    ).amount;
    assert.equal(
      finalInfluencerUsdcBalance.toString(),
      (initialInfluencerUsdcBalance + BigInt(amountUsdc.toString())).toString(),
      "Influencer did not receive full USDC payment."
    );
    console.log("     - Influencer recebeu:", Number(finalInfluencerUsdcBalance) / 1_000_000, "USDC");
    console.log("     - Valor esperado:", Number(amountUsdc) / 1_000_000, "USDC");
    console.log("     - Influencer recebeu pagamento completo ✓");

    // 4. Campaign USDC vault should be empty or closed (it's an ATA, so it might just be empty)
    console.log("\n   ✓ Verificando campaign vault...");
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
      console.log("     - Campaign USDC vault está vazio ✓");
    } else {
      console.log("     - Campaign USDC vault foi fechado (esperado para ATAs vazios) ✓");
    }

    console.log("\n✅ Teste de Fechamento Automático concluído com sucesso!\n");
  });
});
