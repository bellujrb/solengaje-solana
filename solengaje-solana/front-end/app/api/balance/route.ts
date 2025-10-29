import { createPublicClient, http, formatEther } from "viem";
import { NextRequest, NextResponse } from "next/server";

const client = createPublicClient({
  transport: http(),
});

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
    const balance = await client.getBalance({
      address: address as `0x${string}`,
    });

    const formattedBalance = formatEther(balance);
    const numericBalance = parseFloat(formattedBalance);

    return NextResponse.json({
      balance: formattedBalance,
      numericBalance,
      wei: balance.toString(),
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