import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Hello } from "../target/types/hello";
import { SystemProgram } from "@solana/web3.js";
import * as chai from "chai";

describe("hello", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.hello as Program<Hello>;

  let user: anchor.web3.Keypair;

  it("Should return 'Hello {name}'", async () => {
    user = anchor.web3.Keypair.generate();
    const name = "Lucas";
    await program.methods
      .hello(name)
      .accounts({
        helloState: user.publicKey,
        user: program.provider.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    const helloState = await program.account.helloState.fetch(user.publicKey);
    console.log("HelloState message after hello:", helloState.message);
    chai.expect(helloState.message).to.equal("Hello, Lucas");
  });
});
