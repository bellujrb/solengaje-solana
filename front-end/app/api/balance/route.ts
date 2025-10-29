import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { NextRequest, NextResponse } from "next/server";
import { getSolanaRpcUrl } from "@/app/lib/solana-config";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json(
      { error: "Address parameter is required" },
      { status: 400 }
    );
  }

  try {
    const rpcUrl = getSolanaRpcUrl();
    const connection = new Connection(rpcUrl, "confirmed");
    
    let publicKey: PublicKey;
    try {
      publicKey = new PublicKey(address);
    } catch {
      return NextResponse.json(
        { error: "Invalid Solana address" },
        { status: 400 }
      );
    }

    const balance = await connection.getBalance(publicKey);
    const formattedBalance = balance / LAMPORTS_PER_SOL;

    return NextResponse.json({
      balance: formattedBalance.toFixed(9),
      numericBalance: formattedBalance,
      lamports: balance.toString(),
      address,
    });
  } catch (error) {
    console.error("Error fetching balance:", error);
    return NextResponse.json(
      { error: "Failed to fetch balance" },
      { status: 500 }
    );
  }
} 