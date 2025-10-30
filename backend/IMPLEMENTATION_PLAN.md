# 📋 **PLANO COMPLETO: 4 EDGE FUNCTIONS + ARQUITETURA**

Antes de codar, vamos **mapear EXATAMENTE** cada function: **inputs/outputs, auth, validações, fluxo**.

**🎯 Princípios do Plano**:

- **Segurança**: **Todo endpoint verifica Privy JWT** → extrai `privy_user_id` + `wallet` → **só influencer vê/edita SEUS dados**.
- **DB Leve**: Tabela `user_campaigns` **só index** (PDA + metadados). **Métricas ALWAYS LIVE on-chain**.
- **Performance**: List retorna **FULL dados** (Edge fetch on-chain → JSON pronto pro frontend).
- **Oracle Update**: **Edge auxilia bot** (verifica sig → **broadcast tx raw**? Não: **bot faz tx fora**, Edge **não precisa**).
- **Fluxo Geral**:

  ```
  Influencer (Privy Wallet A):
  1. Login Privy
  2. /verify-auth → confirma wallet
  3. Frontend Anchor: deriva PDA + .createCampaign.rpc() → tx_sig
  4. /index-campaign {tx_sig, pda} → salva index
  5. /get-my-campaigns → lista FULL (live metrics!)

  Oracle Bot (Wallet B):
  4. Monitor TikTok/Twitter → pega metrics
  5. Anchor: .updateCampaignMetrics.rpc() → **auto atualiza on-chain**
  6. Frontend refetch → vê progresso/pagamentos **REAL-TIME**!
  ```

- **NÃO precisa RLS/RLS**: Lógica no Edge.
- **Realtime Bonus**: Supabase **Realtime** no DB index → frontend subscribe updates (ex: nova campanha).

## 🗄️ **Tabela Supabase (já definida antes)**

- `user_campaigns`: `privy_user_id` (owner), `pda_address` (ID), `tx_signature`, `influencer_pubkey`, etc.
- **Nova**: `campaign_events` (opcional, pra logs oracle).

## 🔑 **Secrets (Dashboard)**

- PRIVY\_\*
- SUPABASE\_\*
- SOLANA_RPC
- PROGRAM_ID
- CAMPAIGN_DISCRIM = `3228310b9ddce5c0` (**calculei do Anchor: sha256("account:Campaign").slice(0,8)**)

## 📊 **PLANO DAS 4 FUNCTIONS** (Edge Functions)

| #     | **Endpoint**        | **Method** | **Auth**                              | **Input (JSON)**                                                                                                                                                                                                 | **Output (JSON)**                                                                                                                                                                                    | **Lógica Principal**                                                                                                                                                                                                                                                                                                                                             | **Validações**                                                               |
| ----- | ------------------- | ---------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **1** | `/verify-auth`      | **POST**   | Privy `Authorization: Bearer <token>` | `{}` (só token)                                                                                                                                                                                                  | `{<br>  "success": true,<br>  "privy_user_id": "did:...",<br>  "wallet": "ABC123...",<br>  "verified": true<br>}`                                                                                    | 1. Verify JWT<br>2. Return user info                                                                                                                                                                                                                                                                                                                             | - Token válido?<br>- Issuer/audience OK?                                     |
| **2** | `/index-campaign`   | **POST**   | Privy token                           | `{<br>  "pda_address": "PDA_base58",<br>  "tx_signature": "sig_base58",<br>  "brand_pubkey": "brand_wallet",<br>  "name": "Campanha X",<br>  "nickname"?: "...",<br>  "brand_name"?: "..."<br>}`                 | `{<br>  "success": true,<br>  "pda": "PDA"<br>}`                                                                                                                                                     | 1. Verify token → `userId`, `wallet_influencer`<br>2. **Verify TX**: getTransaction → sucesso + CreateCampaign + signed by `wallet_influencer`<br>3. **Verify PDA**: getAccountInfo → discriminator + owner=program<br>4. **Upsert DB**: `privy_user_id = userId, pda_address`<br>5. **Duplicate check**: unique(userId, pda)                                    | - TX recente (<5min)?<br>- PDA matches seeds?<br>- Não duplicado?            |
| **3** | `/get-my-campaigns` | **GET**    | Privy token                           | `{}`                                                                                                                                                                                                             | **Array**:<br>`[{<br>  "pda": "...",<br>  "name": "...",<br>  "status": "Active",<br>  "progress": 45%,<br>  "current_likes": 1234,<br>  **// TODOS campos Campaign**<br>  "paid_amount": 500<br>}]` | 1. Verify token → `userId`<br>2. **Query DB**: PDAs onde `privy_user_id = userId`<br>3. **LOOP (max 50)**: Para cada PDA → `program.account.campaign.fetch(pda)` **(fetch RPC)**<br>4. **Merge**: index + on-chain → retorna **FULL JSON**<br>5. **Sort**: created_at desc                                                                                       | - Limite 50 (paginação `?page=1&limit=20`)<br>- Cache? (TTL 30s via Deno KV) |
| **4** | `/update-metrics`   | **POST**   | **Oracle Sig** (NO PRIVY!)            | `{<br>  "pda": "...",<br>  "likes": 1234,<br>  "comments": 56,<br>  "views": 10000,<br>  "shares": 10,<br>  "oracle_signature": "base58_sig",<br>  "message": "update:PDA:1234:56:10000:10" **(auto-gen)**<br>}` | `{<br>  "success": true,<br>  "tx_sig"?: "..." **(se broadcast)**<br>}`                                                                                                                              | **AUXILIA BOT**:<br>1. **Fetch PDA on-chain** → pega `oracle_pubkey`<br>2. **Verify Sig**: `nacl.sign.detached.verify(message, sig, oracle_pubkey)`<br>3. **Simulate TX** (opcional: getRecentPrioritizationFees + simulate)<br>4. **Log event** DB `campaign_events`<br>5. **Trigger Realtime** Supabase (notify influencers)<br>**// BOT faz .rpc() separado** | - Sig matches oracle?<br>- Metrics < targets?<br>- Deadline OK?              |

## ⚙️ **DESTAQUES DO PLANO**

- **#1 Auth**: **Opcional**, mas útil pra debug/frontend "check login".
- **#2 Create**: **Frontend cria tx** → Edge **só indexa** (seguro, auditável).
- **#3 Retrieve**: **ZERO trabalho frontend** – recebe **dados prontos** (progresso, pagamentos LIVE).
- **#4 Update**: **Seguro pro oracle bot**:
  ```
  Bot (Node.js):
  const message = `update:${pda}:${likes}:${comments}:${views}:${shares}`;
  const sig = nacl.sign.detached(message, oracleKeyPair.secretKey);
  await fetch('/update-metrics', {body: {pda,likes,...,signature: bs58(sig), message}});
  // THEN: program.methods.updateCampaignMetrics(...).rpc();  // Broadcast!
  ```
  - Edge **valida antes** → previne spam.
- **Paginação/Filtros**: Adicione `?status=Active&limit=10&page=1` no #3.
- **Error Handling**: **Sempre** `{error: "msg clara"}` + HTTP 400.
- **CORS**: `*` pra dev, depois domínio.
- **Deploy**: `supabase functions deploy * --no-verify-jwt`

## 🚀 **Próximo Passo**

1. **Aprova este plano?** (ajustes?)
2. **Eu gero TODO código**:
   - SQL tabela
   - 4 TS files prontos
   - Frontend hooks (React/TSX)
   - Oracle bot exemplo (Node)
3. **Teste**: Devnet → Mainnet.
