# Integração Privy - Solengaje

A integração Privy foi adicionada ao projeto front-end. Aqui está o que foi feito:

## Arquivos Criados/Modificados

### Novos Arquivos
1. **`app/lib/privyWalletAdapter.ts`** - Adaptador para carteira Privy/Anchor
2. **`app/lib/anchor.ts`** - Utilitários para interagir com o programa Solana
3. **`app/lib/idl.json`** - IDL do programa Solana (copiado)
4. **`app/hooks/usePrivyWallet.ts`** - Hook para operações de carteira
5. **`README-PRIVY.md`** - Documentação de configuração

### Arquivos Modificados
1. **`app/providers.tsx`** - Agora usa PrivyProvider
2. **`app/hooks/useAccount.ts`** - Agora usa hooks do Privy
3. **`app/components/ConnectButton.tsx`** - Atualizado para usar Privy
4. **`package.json`** - Adicionadas dependências do Privy e Solana

## Próximos Passos

### 1. Instalar Dependências
```bash
cd /Users/joaorubensbelluzzoneto/Documents/solengaje-solana/front-end
npm install
```

### 2. Configurar Variáveis de Ambiente
Crie um arquivo `.env.local` na raiz do projeto `front-end/`:

```env
# Privy Configuration
NEXT_PUBLIC_PRIVY_APP_ID=seu_app_id_privy_aqui

# Solana Configuration
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_SOLANA_MAINNET_RPC_URL=https://api.mainnet-beta.solana.com

# Program Configuration
NEXT_PUBLIC_INFLUNEST_PROGRAM_ID=HtbFBjrFofeiVN3fhP8Urp1upxyRLHEVPcXRahJFtLgg
NEXT_PUBLIC_USDC_MINT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
```

### 3. Obter App ID do Privy
1. Visite https://privy.io
2. Crie uma conta ou faça login
3. Crie um novo aplicativo
4. Copie o App ID para o arquivo `.env.local`

### 4. Testar a Integração
```bash
npm run dev
```

## Como Usar

### Hooks Disponíveis

#### useAccount()
Para verificar o status da conexão:
```typescript
const { address, isConnected, status } = useAccount();
```

#### usePrivyWallet()
Para acessar a carteira e assinar transações:
```typescript
const { publicKey, signTransaction, isConnected } = usePrivyWallet();

const tx = new Transaction().add(...);
const signed = await signTransaction(tx);
```

#### useDisconnect()
Para desconectar a carteira:
```typescript
const { disconnect } = useDisconnect();
await disconnect();
```

## Exemplo de Uso Completo

```typescript
"use client";

import { usePrivy } from "@privy-io/react-auth";
import { usePrivyWallet } from "@/app/hooks/usePrivyWallet";
import { getProgram, getCampaignPDA } from "@/app/lib/anchor";
import { PublicKey } from "@solana/web3.js";

export default function MyComponent() {
  const { authenticated, login } = usePrivy();
  const { publicKey, signTransaction, isConnected } = usePrivyWallet();

  const handleCreateCampaign = async () => {
    if (!publicKey || !isConnected) {
      await login();
      return;
    }

    try {
      // Criar wallet adapter
      const wallet = {
        publicKey,
        signTransaction,
        signAllTransactions: async (txs) => {
          return Promise.all(txs.map(tx => signTransaction(tx)));
        },
      };

      // Obter programa
      const program = getProgram(wallet);

      // Chamar instrução
      const txHash = await program.methods
        .createCampaign(
          "Nome da Campanha",
          "Descrição",
          new BN(1000000), // 1 USDC
          // ... outros argumentos
        )
        .rpc();

      console.log("Transaction hash:", txHash);
    } catch (error) {
      console.error("Error creating campaign:", error);
    }
  };

  return (
    <div>
      {!authenticated ? (
        <button onClick={login}>Connect Wallet</button>
      ) : (
        <div>
          <p>Connected: {publicKey?.toString()}</p>
          <button onClick={handleCreateCampaign}>Create Campaign</button>
        </div>
      )}
    </div>
  );
}
```

## Dependências Adicionadas

- `@privy-io/react-auth` - SDK Privy
- `@solana/kit` - Utilitários Solana
- `@coral-xyz/anchor` - Framework Anchor
- `@solana/web3.js` - Biblioteca Web3 Solana
- `@solana/spl-token` - Tokens SPL
- `bs58` - Codificação base58
- `react-toastify` - Notificações toast

## Estrutura do Provider

O `PrivyProvider` está configurado com:
- Embedded wallets para Ethereum e Solana
- Suporte para carteiras externas (Phantom, Solflare, etc)
- RPC endpoints para mainnet e devnet
- Auto-criação de carteiras para usuários sem wallet

## Troubleshooting

### Erro: "Privy not initialized"
- Verifique se o `NEXT_PUBLIC_PRIVY_APP_ID` está configurado
- Reinicie o servidor de desenvolvimento

### Erro: "Cannot find module '@privy-io/react-auth'"
- Execute `npm install` para instalar as dependências

### Carteira não conecta
- Verifique se o App ID está correto
- Certifique-se de que as RPC URLs estão acessíveis

## Documentação Adicional

Consulte `README-PRIVY.md` para mais detalhes sobre a configuração e uso dos hooks.
