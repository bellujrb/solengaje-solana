
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";
import { Connection, PublicKey } from "https://esm.sh/@solana/web3.js@1.91.1";
import { Program, AnchorProvider, Wallet } from "https://esm.sh/@coral-xyz/anchor@0.29.0";
import * as bs58 from "https://esm.sh/bs58@5.0.0";
import { decodeUTF8 } from "https://esm.sh/tweetnacl-util@0.15.1";
import { sign } from "https://esm.sh/tweetnacl@1.0.3";

// Helper function to get environment variables
function getEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Environment variable ${name} is not set.`);
  }
  return value;
}

const SUPABASE_URL = getEnv("SUPABASE_URL");
const SUPABASE_ANON_KEY = getEnv("SUPABASE_ANON_KEY");
const SOLANA_RPC = getEnv("SOLANA_RPC");
const PROGRAM_ID = getEnv("PROGRAM_ID");
const ORACLE_PUBLIC_KEY = getEnv("ORACLE_PUBLIC_KEY");

const connection = new Connection(SOLANA_RPC, "confirmed");
const programId = new PublicKey(PROGRAM_ID);
const oraclePublicKey = new PublicKey(ORACLE_PUBLIC_KEY);

// Placeholder for Anchor IDL - REPLACE WITH YOUR ACTUAL IDL
const idl = {
  "version": "0.1.0",
  "name": "solengage",
  "instructions": [],
  "accounts": [
    {
      "name": "Campaign",
      "type": {
        "kind": "struct",
        "fields": [
          {"name": "influencer", "type": "publicKey"},
          {"name": "brand", "type": "publicKey"},
          {"name": "name", "type": "string"},
          {"name": "status", "type": {"defined": "CampaignStatus"}},
          {"name": "targetLikes", "type": "u64"},
          {"name": "currentLikes", "type": "u64"},
          {"name": "paidAmount", "type": "u64"},
          {"name": "createdAt", "type": "i64"},
          {"name": "oracle", "type": "publicKey"},
        ]
      }
    }
  ],
  "types": [
    {
      "name": "CampaignStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {"name": "Pending"},
          {"name": "Active"},
          {"name": "Completed"},
          {"name": "Cancelled"}
        ]
      }
    }
  ]
};

// Dummy wallet for AnchorProvider
const dummyWallet = new Wallet(new Uint8Array(64));
const provider = new AnchorProvider(connection, dummyWallet, { commitment: "confirmed" });
const program = new Program(idl, programId, provider);

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { pda, likes, comments, views, shares, oracle_signature, message } = await req.json();

  if (!pda || !oracle_signature || !message) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // 1. Verify Oracle Signature
    const messageBytes = decodeUTF8(message);
    const signatureBytes = bs58.decode(oracle_signature);

    if (!sign.detached.verify(messageBytes, signatureBytes, oraclePublicKey.toBytes())) {
      return new Response(JSON.stringify({ error: "Invalid oracle signature" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 2. Fetch PDA on-chain to ensure it exists and is valid
    const pdaPublicKey = new PublicKey(pda);
    const onChainCampaign = await program.account.campaign.fetch(pdaPublicKey);

    if (!onChainCampaign) {
        return new Response(JSON.stringify({ error: "Campaign PDA not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
        });
    }

    // Optional: Add more validation against on-chain data
    // e.g., check if campaign is active, deadline not passed, etc.

    // 3. Log the event to campaign_events table
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { error: logError } = await supabase.from("campaign_events").insert({
      pda_address: pda,
      event_type: "METRICS_UPDATE",
      data: {
        likes,
        comments,
        views,
        shares,
        oracle_signature,
        verified: true,
      },
    });

    if (logError) {
      console.error("Failed to log metrics update:", logError);
      // Non-critical error, so we can continue
    }

    // 4. Trigger Supabase Realtime to notify frontend
    // This happens automatically when you insert into a table with Realtime enabled.

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in update-metrics function:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
