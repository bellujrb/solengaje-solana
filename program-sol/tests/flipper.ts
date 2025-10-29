import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Flipper } from "../target/types/flipper";
import { SystemProgram } from "@solana/web3.js";
import * as chai from "chai";

describe("flipper", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Flipper as Program<Flipper>;

  let flipperAccount: anchor.web3.Keypair;

  beforeEach(async () => {
    flipperAccount = anchor.web3.Keypair.generate();
    await program.methods
      .initialize(true)
      .accounts({
        flipper: flipperAccount.publicKey,
        user: program.provider.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([flipperAccount])
      .rpc();
  });

  it("Is initialized with true!", async () => {
    const flipper = await program.account.flipper.fetch(flipperAccount.publicKey);
    console.log("Flipper initialized with:", flipper.value);
    chai.expect(flipper.value).to.equal(true);
  });

  it("Flips the value to false!", async () => {
    await program.methods
      .flip()
      .accounts({
        flipper: flipperAccount.publicKey,
        user: program.provider.publicKey,
      })
      .rpc();

    const flipper = await program.account.flipper.fetch(flipperAccount.publicKey);
    console.log("Flipper flipped to:", flipper.value);
    chai.expect(flipper.value).to.equal(false);
  });

  it("Flips the value to true again!", async () => {
    await program.methods
      .flip()
      .accounts({
        flipper: flipperAccount.publicKey,
        user: program.provider.publicKey,
      })
      .rpc();

    await program.methods
      .flip()
      .accounts({
        flipper: flipperAccount.publicKey,
        user: program.provider.publicKey,
      })
      .rpc();

    const flipper = await program.account.flipper.fetch(flipperAccount.publicKey);
    console.log("Flipper flipped to:", flipper.value);
    chai.expect(flipper.value).to.equal(true);
  });
});