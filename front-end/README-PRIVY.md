# Integração Privy - Guia de Configuração

Este projeto utiliza a integração Privy para autenticação e gerenciamento de carteiras Solana.

## Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto `front-end/` com as seguintes variáveis:

```env
# Privy Configuration
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id_here

# Solana Configuration
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_SOLANA_MAINNET_RPC_URL=https://api.mainnet-beta.solana.com

# Program Configuration
NEXT_PUBLIC_INFLUNEST_PROGRAM_ID=DS6344gi387M4e6XvS99QQXGiDmY6qQi4xYxqGUjFbB3
NEXT_PUBLIC_USDC_MINT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
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
