import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";
import { verify } from "https://deno.land/x/djwt@v2.8/mod.ts";
import { Connection, PublicKey } from "https://esm.sh/@solana/web3.js@1.91.1";
import { Program, AnchorProvider, Wallet } from "https://esm.sh/@coral-xyz/anchor@0.29.0";
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

const connection = new Connection(SOLANA_RPC, "confirmed");
const programId = new PublicKey(PROGRAM_ID);

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

// Deno KV for caching
const kv = await Deno.openKv();

serve(async (req) => {
  if (req.method !== "GET") {
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

    if (!privyUserId) {
      return new Response(JSON.stringify({ error: "Privy user ID not found in token" }), {
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

  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "20");
  const statusFilter = url.searchParams.get("status");

  const cacheKey = `campaigns:${privyUserId}:${page}:${limit}:${statusFilter || "all"}`;
  const cachedData = await kv.get(cacheKey);

  if (cachedData.value) {
    return new Response(JSON.stringify(cachedData.value), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  try {
    let query = supabase
      .from("user_campaigns")
      .select("pda_address, name, nickname, brand_name, tx_signature, influencer_pubkey, brand_pubkey")
      .eq("privy_user_id", privyUserId)
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (statusFilter) {
      // This would require a status field in the user_campaigns table or filtering after fetching on-chain
      // For now, we'll assume status filtering happens after fetching on-chain data.
      // Or, if you add a status column to user_campaigns, you can uncomment the line below:
      // query = query.eq("status", statusFilter);
    }

    const { data: indexedCampaigns, error } = await query;

    if (error) {
      console.error("Supabase query error:", error);
      return new Response(JSON.stringify({ error: "Failed to fetch indexed campaigns" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!indexedCampaigns || indexedCampaigns.length === 0) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const fullCampaigns = await Promise.all(
      indexedCampaigns.map(async (campaign) => {
        try {
          const pdaPublicKey = new PublicKey(campaign.pda_address);
          const onChainCampaign = await program.account.campaign.fetch(pdaPublicKey);

          // Convert BigInts to numbers for JSON serialization
          const currentLikes = Number(onChainCampaign.currentLikes);
          const targetLikes = Number(onChainCampaign.targetLikes);
          const paidAmount = Number(onChainCampaign.paidAmount);

          const progress = targetLikes > 0 ? (currentLikes / targetLikes) * 100 : 0;

          const statusMap = {
            "pending": "Pending",
            "active": "Active",
            "completed": "Completed",
            "cancelled": "Cancelled",
          };
          const status = statusMap[Object.keys(onChainCampaign.status)[0].toLowerCase()] || "Unknown";

          return {
            ...campaign,
            status: status,
            progress: parseFloat(progress.toFixed(2)),
            current_likes: currentLikes,
            target_likes: targetLikes,
            paid_amount: paidAmount,
            // Add other on-chain fields as needed
          };
        } catch (onChainError) {
          console.warn(`Failed to fetch on-chain data for PDA ${campaign.pda_address}:`, onChainError);
          return { ...campaign, status: "Error", progress: 0, current_likes: 0, paid_amount: 0 }; // Return partial data
        }
      }),
    );

    // Apply status filter if provided (after fetching on-chain data)
    const filteredCampaigns = statusFilter
      ? fullCampaigns.filter((campaign) => campaign.status.toLowerCase() === statusFilter.toLowerCase())
      : fullCampaigns;

    // Cache the result for 30 seconds
    await kv.set(cacheKey, filteredCampaigns, { expireIn: 30 * 1000 });

    return new Response(JSON.stringify(filteredCampaigns), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in get-my-campaigns function:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});