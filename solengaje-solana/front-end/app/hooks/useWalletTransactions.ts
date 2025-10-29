import { useState, useEffect } from "react";

interface Transaction {
  id: string;
  hash: string;
  from: string;
  to: string;
  value: string;
  timestamp: number;
  type: 'incoming' | 'outgoing';
  amount: string;
  date: string;
  icon: 'star' | 'plus' | 'arrow-right';
}

// Transações mockadas
const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: "1",
    hash: "0x123abc456def789ghi012jkl345mno678pqr901stu234vwx567yza890bcd123",
    from: "0x1234567890abcdef1234567890abcdef12345678",
    to: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    value: "2.5",
    timestamp: Date.now() - 86400000, // 1 dia atrás
    type: 'incoming',
    amount: "+2.5",
    date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    icon: 'star'
  },
  {
    id: "2", 
    hash: "0x456def789ghi012jkl345mno678pqr901stu234vwx567yza890bcd123efg456",
    from: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    to: "0x8765432109fedcba8765432109fedcba87654321",
    value: "1.2",
    timestamp: Date.now() - 172800000, // 2 dias atrás
    type: 'outgoing',
    amount: "-1.2",
    date: new Date(Date.now() - 172800000).toISOString().split('T')[0],
    icon: 'plus'
  },
  {
    id: "3",
    hash: "0x789ghi012jkl345mno678pqr901stu234vwx567yza890bcd123efg456hij789",
    from: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    to: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
    value: "0.5",
    timestamp: Date.now() - 259200000, // 3 dias atrás
    type: 'outgoing',
    amount: "-0.5",
    date: new Date(Date.now() - 259200000).toISOString().split('T')[0],
    icon: 'arrow-right'
  },
  {
    id: "4",
    hash: "0x012jkl345mno678pqr901stu234vwx567yza890bcd123efg456hij789klm012",
    from: "0xfedcbafedcbafedcbafedcbafedcbafedcbafed",
    to: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    value: "3.8",
    timestamp: Date.now() - 345600000, // 4 dias atrás
    type: 'incoming',
    amount: "+3.8",
    date: new Date(Date.now() - 345600000).toISOString().split('T')[0],
    icon: 'star'
  },
  {
    id: "5",
    hash: "0x345mno678pqr901stu234vwx567yza890bcd123efg456hij789klm012nop345",
    from: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    to: "0x9876543210fedcba9876543210fedcba98765432",
    value: "0.75",
    timestamp: Date.now() - 432000000, // 5 dias atrás
    type: 'outgoing',
    amount: "-0.75",
    date: new Date(Date.now() - 432000000).toISOString().split('T')[0],
    icon: 'plus'
  }
];

export function useWalletTransactions() {
  const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'; // Endereço mockado
  const isConnected = true; // Sempre conectado no modo mock
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransactions = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Simular delay de rede
        await new Promise(resolve => setTimeout(resolve, 300));
        
        setTransactions(MOCK_TRANSACTIONS);
      } catch (err) {
        console.error('Error fetching transactions:', err);
        setError('Failed to load transactions');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  return {
    transactions,
    isLoading,
    error,
    isConnected,
    address,
  };
} 