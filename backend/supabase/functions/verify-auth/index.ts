import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";
import { verify } from "https://deno.land/x/djwt@v2.8/mod.ts";

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

serve(async (req: Request) => {
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

    const privyUserId = payload.sub as string;
    const walletAddress = payload.wal as string; // Assuming 'wal' field contains the wallet address

    if (!privyUserId || !walletAddress) {
      return new Response(JSON.stringify({ error: "Privy user ID or wallet address not found in token" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ privyUserId, walletAddress }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("JWT verification failed:", error);
    return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
});