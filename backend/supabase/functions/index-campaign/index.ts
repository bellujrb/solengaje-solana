import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";
import { verify } from "https://deno.land/x/djwt@v2.8/mod.ts";
import { Connection, PublicKey } from "https://esm.sh/@solana/web3.js@1.91.1";
import * as bs58 from "https://esm.sh/bs58@5.0.0";

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
const PRIVY_APP_ID = getEnv("PRIVY_APP_ID");
const SOLANA_RPC = getEnv("SOLANA_RPC");
const PROGRAM_ID = getEnv("PROGRAM_ID");
const CAMPAIGN_DISCRIM = getEnv("CAMPAIGN_DISCRIM"); // e.g., 3228310b9ddce5c0

const connection = new Connection(SOLANA_RPC, "confirmed");
const programId = new PublicKey(PROGRAM_ID);

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Authorization header missing" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const token = authHeader.split("Bearer ")[1];
  if (!token) {
    return new Response(JSON.stringify({ error: "Bearer token missing" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let privyUserId: string;
  let walletInfluencer: string;

  try {
    const privyJwks = await fetch(`https://auth.privy.io/jwks`).then((res) => res.json());
    const jwk = privyJwks.keys[0];

    const payload = await verify(token, jwk, { algorithms: ["ES256"] });

    if (payload.iss !== "privy.io" || payload.aud !== PRIVY_APP_ID) {
      return new Response(JSON.stringify({ error: "Invalid issuer or audience" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    privyUserId = payload.sub as string;
    walletInfluencer = (payload.wallet?.address as string).toLowerCase();

    if (!privyUserId || !walletInfluencer) {
      return new Response(JSON.stringify({ error: "Privy user ID or wallet not found in token" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("JWT verification failed:", error);
    return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { pda_address, tx_signature, brand_pubkey, name, nickname, brand_name } = await req.json();

  if (!pda_address || !tx_signature) {
    return new Response(JSON.stringify({ error: "Missing pda_address or tx_signature" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  try {
    // 2. Verify TX: getTransaction → sucesso + CreateCampaign + signed by wallet_influencer
    const tx = await connection.getTransaction(tx_signature, { commitment: "confirmed" });

    if (!tx || !tx.meta || tx.meta.err) {
      return new Response(JSON.stringify({ error: "Transaction failed or not found" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Check if transaction is recent (within 5 minutes)
    const fiveMinutesAgo = Date.now() / 1000 - 5 * 60;
    if (!tx.blockTime || tx.blockTime < fiveMinutesAgo) {
      return new Response(JSON.stringify({ error: "Transaction is too old" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verify wallet_influencer signed the transaction
    const signerKeys = tx.transaction.message.accountKeys.map(key => key.toBase58().toLowerCase());
    if (!signerKeys.includes(walletInfluencer)) {
      return new Response(JSON.stringify({ error: "Influencer wallet did not sign the transaction" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Check for CreateCampaign instruction (simplified check by looking at logs)
    const createCampaignLog = tx.meta.logMessages?.some(log => log.includes("Program log: Instruction: CreateCampaign"));
    if (!createCampaignLog) {
      return new Response(JSON.stringify({ error: "Transaction is not a CreateCampaign instruction" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 3. Verify PDA: getAccountInfo → discriminator + owner=program
    const pdaPublicKey = new PublicKey(pda_address);
    const accountInfo = await connection.getAccountInfo(pdaPublicKey);

    if (!accountInfo) {
      return new Response(JSON.stringify({ error: "PDA account not found" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!accountInfo.owner.equals(programId)) {
      return new Response(JSON.stringify({ error: "PDA account not owned by the program" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verify discriminator
    const accountData = accountInfo.data;
    const discriminator = bs58.encode(accountData.slice(0, 8));

    if (discriminator !== CAMPAIGN_DISCRIM) {
      return new Response(JSON.stringify({ error: "PDA discriminator mismatch" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 4. Upsert DB: privy_user_id = userId, pda_address
    const { data, error } = await supabase
      .from("user_campaigns")
      .upsert(
        {
          privy_user_id: privyUserId,
          pda_address: pda_address,
          tx_signature: tx_signature,
          influencer_pubkey: walletInfluencer,
          brand_pubkey: brand_pubkey,
          name: name,
          nickname: nickname,
          brand_name: brand_name,
        },
        { onConflict: "pda_address" },
      )
      .select();

    if (error) {
      console.error("Supabase upsert error:", error);
      return new Response(JSON.stringify({ error: "Failed to index campaign" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        pda: pda_address,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error in index-campaign function:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});