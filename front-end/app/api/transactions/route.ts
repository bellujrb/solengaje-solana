import { NextRequest, NextResponse } from "next/server";

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
    const transactions = [
      {
        id: "1",
        hash: "0x123...abc",
        from: "0x1234...5678",
        to: address,
        value: "0.1",
        timestamp: Date.now() - 86400000,
        type: 'incoming' as const,
        amount: "+0.1 ETH",
        date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
        icon: 'star' as const
      },
      {
        id: "2",
        hash: "0x456...def", 
        from: address,
        to: "0x8765...4321",
        value: "0.05",
        timestamp: Date.now() - 172800000,
        type: 'outgoing' as const,
        amount: "-0.05 ETH",
        date: new Date(Date.now() - 172800000).toISOString().split('T')[0],
        icon: 'plus' as const
      }
    ];

    // Ordenar por timestamp (mais recente primeiro)
    transactions.sort((a, b) => b.timestamp - a.timestamp);

    return NextResponse.json({
      transactions,
      address,
      total: transactions.length
    });

  } catch (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
} 