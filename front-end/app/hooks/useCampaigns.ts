import { useState, useEffect, useCallback } from 'react';

export interface Campaign {
  id: string;
  brand: string;
  creator: string;
  totalValue: string;
  deadline: string;
  targetLikes: string;
  targetViews: string;
  currentLikes: string;
  currentViews: string;
  paidAmount: string;
  status: 'ACTIVE' | 'COMPLETED' | 'PENDING' | 'EXPIRED' | 'CANCELLED';
  progress: number;
  title: string;
  endDate: string;
}

// Dados mockados de campanhas
const MOCK_CAMPAIGNS: Campaign[] = [
  {
    id: '1',
    brand: '0x1234...5678',
    creator: '0x8765...4321',
    totalValue: '5.0',
    deadline: (Date.now() / 1000 + 30 * 24 * 60 * 60).toString(), // 30 dias
    targetLikes: '10000',
    targetViews: '50000',
    currentLikes: '7500',
    currentViews: '42000',
    paidAmount: '3.75',
    status: 'ACTIVE',
    progress: 75,
    title: 'Nike Summer Collection',
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  },
  {
    id: '2',
    brand: '0x2345...6789',
    creator: '0x9876...5432',
    totalValue: '3.5',
    deadline: (Date.now() / 1000 + 15 * 24 * 60 * 60).toString(), // 15 dias
    targetLikes: '5000',
    targetViews: '25000',
    currentLikes: '2000',
    currentViews: '12000',
    paidAmount: '1.4',
    status: 'ACTIVE',
    progress: 40,
    title: 'Adidas Boost Launch',
    endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  },
  {
    id: '3',
    brand: '0x3456...7890',
    creator: '0x0987...6543',
    totalValue: '10.0',
    deadline: (Date.now() / 1000 + 45 * 24 * 60 * 60).toString(), // 45 dias
    targetLikes: '20000',
    targetViews: '100000',
    currentLikes: '20000',
    currentViews: '100000',
    paidAmount: '10.0',
    status: 'COMPLETED',
    progress: 100,
    title: 'Apple iPhone Promo',
    endDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  },
  {
    id: '4',
    brand: '0x4567...8901',
    creator: '0x1098...7654',
    totalValue: '2.0',
    deadline: (Date.now() / 1000 + 7 * 24 * 60 * 60).toString(), // 7 dias
    targetLikes: '3000',
    targetViews: '15000',
    currentLikes: '300',
    currentViews: '1500',
    paidAmount: '0.2',
    status: 'ACTIVE',
    progress: 10,
    title: 'Samsung Galaxy Watch',
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  },
  {
    id: '5',
    brand: '0x5678...9012',
    creator: '0x2109...8765',
    totalValue: '7.5',
    deadline: (Date.now() / 1000 - 5 * 24 * 60 * 60).toString(), // Expirada há 5 dias
    targetLikes: '15000',
    targetViews: '75000',
    currentLikes: '8000',
    currentViews: '40000',
    paidAmount: '4.0',
    status: 'EXPIRED',
    progress: 53,
    title: 'Tesla Model Y',
    endDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  },
];

export function useCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(true); // Sempre conectado no modo mock

  // Simular carregamento de campanhas
  const fetchAllCampaigns = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Simular delay de rede
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setCampaigns(MOCK_CAMPAIGNS);
    } catch (err) {
      console.error('Error fetching campaigns:', err);
      setError('Failed to fetch campaigns');
    } finally {
      setLoading(false);
    }
  }, []);

  // Carregar campanhas ao montar o componente
  useEffect(() => {
    fetchAllCampaigns();
  }, [fetchAllCampaigns]);

  // Função para recarregar campanhas
  const refetch = () => {
    fetchAllCampaigns();
  };

  return {
    campaigns,
    loading,
    error,
    refetch,
    isConnected,
  };
} 