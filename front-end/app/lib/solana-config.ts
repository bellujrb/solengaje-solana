/**
 * Configuração centralizada do Solana
 * Garante consistência entre Privy provider e conexões diretas
 */

export type SolanaNetwork = 'devnet' | 'mainnet-beta';

export function getSolanaNetwork(): SolanaNetwork {
  const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet';
  
  // Normalizar para valores aceitos pelo Privy
  if (network === 'mainnet' || network === 'mainnet-beta') {
    return 'mainnet-beta';
  }
  
  return 'devnet';
}

export function getSolanaNetworkKey(): 'solana:mainnet' | 'solana:devnet' {
  const network = getSolanaNetwork();
  return network === 'mainnet-beta' 
    ? 'solana:mainnet' 
    : 'solana:devnet';
}

/**
 * Obtém a URL RPC baseada na rede configurada
 * Usa endpoints que suportam requisições via browser (sem bloqueio CORS)
 */
export function getSolanaRpcUrl(): string {
  const network = getSolanaNetwork();
  const envVar = network === 'mainnet-beta' 
    ? process.env.NEXT_PUBLIC_SOLANA_MAINNET_RPC_URL 
    : process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
  
  // URLs padrão com suporte a browser
  // Pode ser substituído por serviços como Helius, Triton, QuickNode, etc.
  if (envVar) {
    return envVar;
  }
  
  // URLs padrão públicos (podem ter limitações/rate limit)
  if (network === 'mainnet-beta') {
    return 'https://api.mainnet-beta.solana.com';
  }
  
  // Devnet - usar RPC pool customizado
  return 'https://supertea-solanan-66b1.devnet.rpcpool.com/d914275f-7a7d-491c-9f0e-61cb6466f39a';
}

/**
 * Obtém a URL WebSocket para subscriptions
 */
export function getSolanaWebSocketUrl(): string {
  const rpcUrl = getSolanaRpcUrl();
  
  // Converter http para ws e https para wss
  if (rpcUrl.startsWith('https://')) {
    return rpcUrl.replace(/^https:\/\//, 'wss://');
  }
  
  if (rpcUrl.startsWith('http://')) {
    return rpcUrl.replace(/^http:\/\//, 'ws://');
  }
  
  // Se já começar com ws/wss, retornar como está
  if (rpcUrl.startsWith('wss://') || rpcUrl.startsWith('ws://')) {
    return rpcUrl;
  }
  
  // Fallback - se não conseguiu converter acima, usar o endpoint padrão
  return 'wss://supertea-solanan-66b1.devnet.rpcpool.com/d914275f-7a7d-491c-9f0e-61cb6466f39a';
}

