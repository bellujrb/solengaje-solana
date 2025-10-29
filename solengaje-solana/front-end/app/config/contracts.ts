// Configuração mockada - não conecta a nenhum smart contract real
export const CONTRACT_ADDRESSES = {
  CAMPAIGN_MANAGER: '0x0000000000000000000000000000000000000000',
  PAYMENT_VAULT: '0x0000000000000000000000000000000000000000',
  ORACLE_CONNECTOR: '0x0000000000000000000000000000000000000000',
  USDC: '0x0000000000000000000000000000000000000000',
} as const;

// Configuração mockada de rede
export const NETWORK_CONFIG = {
  chainId: 0,
  name: 'Mock Network',
  rpcUrl: 'http://localhost:8545',
  blockExplorer: 'http://localhost:3000',
} as const; 