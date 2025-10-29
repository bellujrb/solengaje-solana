# Integração Privy - Guia de Configuração

Este projeto utiliza a integração Privy para autenticação e gerenciamento de carteiras Solana.

## Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto `front-end/` com as seguintes variáveis:

```env
# Privy Configuration
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id_here

# Solana Network Configuration
# Valores aceitos: 'devnet' ou 'mainnet-beta'
NEXT_PUBLIC_SOLANA_NETWORK=devnet

# Solana RPC URLs
# IMPORTANTE: Use endpoints que suportam requisições via browser (sem bloqueio CORS)
# Para devnet, configurado para usar RPC pool customizado
# Se não especificado, usa: https://supertea-solanan-66b1.devnet.rpcpool.com/d914275f-7a7d-491c-9f0e-61cb6466f39a
NEXT_PUBLIC_SOLANA_RPC_URL=https://supertea-solanan-66b1.devnet.rpcpool.com/d914275f-7a7d-491c-9f0e-61cb6466f39a

# Para mainnet, use um serviço RPC confiável:
# - https://api.mainnet-beta.solana.com (público, pode ter rate limits)
# - Helius, Triton, QuickNode, Chainstack (recomendado para produção)
NEXT_PUBLIC_SOLANA_MAINNET_RPC_URL=https://api.mainnet-beta.solana.com

# Program Configuration
NEXT_PUBLIC_INFLUNEST_PROGRAM_ID=DS6344gi387M4e6XvS99QQXGiDmY6qQi4xYxqGUjFbB3
NEXT_PUBLIC_USDC_MINT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
```

## Configuração de RPC

**IMPORTANTE**: O projeto usa configuração centralizada de rede Solana em `app/lib/solana-config.ts`. Isso garante que:
- Todas as conexões (Privy, Anchor, Connection direta) usem a mesma rede
- O parâmetro `chain` esteja correto nas transações do Privy
- Não haja inconsistências entre rede configurada e rede usada

### Recomendações de RPC

Para evitar erros 403 (forbidden) e bloqueios de CORS:

**Devnet (desenvolvimento)**:
- Padrão: `https://supertea-solanan-66b1.devnet.rpcpool.com/d914275f-7a7d-491c-9f0e-61cb6466f39a`
- Alternativas: Helius Devnet, QuickNode Devnet, ou outros serviços com suporte a browser

**Mainnet (produção)**:
- **NÃO use** o endpoint público sem proxy/proxy reverso
- Use serviços pagos com suporte a browser:
  - [Helius](https://www.helius.dev/) - RPC API com plano gratuito
  - [QuickNode](https://www.quicknode.com/) - Solana RPC
  - [Triton](https://triton.one/) - Solana RPC
  - [Chainstack](https://chainstack.com/) - Solana RPC

Exemplo com Helius:
```env
NEXT_PUBLIC_SOLANA_RPC_URL=https://devnet.helius-rpc.com/?api-key=YOUR_API_KEY
NEXT_PUBLIC_SOLANA_MAINNET_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY
```

## Configuração

1. **Obter App ID do Privy**
   - Visite https://privy.io
   - Crie uma conta ou faça login
   - Crie um novo aplicativo
   - Copie o App ID e configure no `.env.local`

2. **Instalar Dependências**
   ```bash
   cd front-end
   npm install
   ```

3. **Hooks Disponíveis**

   ### `useAccount()`
   Hook para verificar o status da conexão:
   ```typescript
   const { address, isConnected } = useAccount();
   ```

   ### `usePrivyWallet()`
   Hook para acessar a carteira Solana:
   ```typescript
   const { publicKey, signTransaction, signAllTransactions } = usePrivyWallet();
   ```

   ### `useDisconnect()`
   Hook para desconectar a carteira:
   ```typescript
   const { disconnect } = useDisconnect();
   ```

## Arquivos Importantes

- `app/providers.tsx` - Provider principal com PrivyProvider
- `app/lib/privyWalletAdapter.ts` - Adaptador para carteira Privy/Anchor
- `app/lib/anchor.ts` - Utilities para interagir com o programa Solana
- `app/lib/idl.json` - IDL do programa Solana
- `app/hooks/useAccount.ts` - Hook para status da conta
- `app/hooks/usePrivyWallet.ts` - Hook para operações de carteira

## Uso Exemplo

```typescript
"use client";

import { usePrivy } from "@privy-io/react-auth";
import { usePrivyWallet } from "@/app/hooks/usePrivyWallet";

export default function MyComponent() {
  const { login, authenticated } = usePrivy();
  const { publicKey, isConnected } = usePrivyWallet();

  return (
    <div>
      {!authenticated ? (
        <button onClick={login}>Connect Wallet</button>
      ) : (
        <div>
          <p>Connected: {publicKey?.toString()}</p>
        </div>
      )}
    </div>
  );
}
```
