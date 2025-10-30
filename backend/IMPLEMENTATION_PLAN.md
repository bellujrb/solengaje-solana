# Plano Completo: 4 Edge Functions + Arquitetura

## Princípios do Plano

- **Segurança**: Todo endpoint verifica Privy JWT → extrai `privy_user_id` + `wallet` → só influencer vê/edita SEUS dados
- **DB Leve**: Tabela `user_campaigns` só index (PDA + metadados). Métricas ALWAYS LIVE on-chain
- **Performance**: List retorna FULL dados (Edge fetch on-chain → JSON pronto pro frontend)
- **Oracle Update**: Edge auxilia bot (verifica sig → bot faz tx fora, Edge não precisa)

## Fluxo Geral

```
Influencer (Privy Wallet A):
1. Login Privy
2. /verify-auth → confirma wallet
3. Frontend Anchor: deriva PDA + .createCampaign.rpc() → tx_sig
4. /index-campaign {tx_sig, pda} → salva index
5. /get-my-campaigns → lista FULL (live metrics!)

Oracle Bot (Wallet B):
4. Monitor TikTok/Twitter → pega metrics
5. Anchor: .updateCampaignMetrics.rpc() → auto atualiza on-chain
6. Frontend refetch → vê progresso/pagamentos REAL-TIME
```

## Tabela Supabase

- `user_campaigns`: `privy_user_id` (owner), `pda_address` (ID), `tx_signature`, `influencer_pubkey`, etc
- `campaign_events` (opcional, pra logs oracle)

## Secrets (Dashboard)

- PRIVY_*
- SUPABASE_*
- SOLANA_RPC
- PROGRAM_ID
- CAMPAIGN_DISCRIM = `3228310b9ddce5c0`

## Plano das 4 Functions (Edge Functions)

### 1. /verify-auth
- **Method**: POST
- **Auth**: Privy `Authorization: Bearer <token>`
- **Input**: `{}` (só token)
- **Output**: `{success: true, privy_user_id: "did:...", wallet: "ABC123...", verified: true}`
- **Lógica**: Verify JWT → Return user info
- **Validações**: Token válido? Issuer/audience OK?

### 2. /index-campaign  
- **Method**: POST
- **Auth**: Privy token
- **Input**: `{pda_address: "PDA_base58", tx_signature: "sig_base58", brand_pubkey: "brand_wallet", name: "Campanha X", nickname?: "...", brand_name?: "..."}`
- **Output**: `{success: true, pda: "PDA"}`
- **Lógica**: Verify token → Verify TX → Verify PDA → Upsert DB → Duplicate check
- **Validações**: TX recente (<5min)? PDA matches seeds? Não duplicado?

### 3. /get-my-campaigns
- **Method**: GET
- **Auth**: Privy token
- **Input**: `{}`
- **Output**: Array com todos campos Campaign + dados on-chain
- **Lógica**: Verify token → Query DB → LOOP fetch on-chain → Merge data → Sort
- **Validações**: Limite 50 (paginação)? Cache? (TTL 30s via Deno KV)

### 4. /update-metrics
- **Method**: POST
- **Auth**: Oracle Sig (NO PRIVY!)
- **Input**: `{pda: "...", likes: 1234, comments: 56, views: 10000, shares: 10, oracle_signature: "base58_sig", message: "update:PDA:1234:56:10000:10"}`
- **Output**: `{success: true, tx_sig?: "..."}`
- **Lógica**: Fetch PDA on-chain → Verify Sig → Simulate TX → Log event → Trigger Realtime
- **Validações**: Sig matches oracle? Metrics < targets? Deadline OK?

## Destaques do Plano

- **Auth**: Opcional, mas útil pra debug/frontend "check login"
- **Create**: Frontend cria tx → Edge só indexa (seguro, auditável)
- **Retrieve**: ZERO trabalho frontend – recebe dados prontos (progresso, pagamentos LIVE)
- **Update**: Seguro pro oracle bot com validação prévia
- **Paginação/Filtros**: Adicione `?status=Active&limit=10&page=1` no #3
- **Error Handling**: Sempre `{error: "msg clara"}` + HTTP 400
- **CORS**: `*` pra dev, depois domínio
- **Deploy**: `supabase functions deploy * --no-verify-jwt`

---

## ✅ Checklist Acionável

### [ ] Pré-requisitos
- [ ] Configurar secrets no dashboard Supabase
- [ ] Verificar conectividade com RPC Solana
- [ ] Confirmar PROGRAM_ID e CAMPAIGN_DISCRIMINATOR

### [ ] Desenvolvimento Edge Functions
- [ ] Implementar `/verify-auth` com validação JWT Privy
- [ ] Criar `/index-campaign` com verificação de transação
- [ ] Desenvolver `/get-my-campaigns` com fetch on-chain
- [ ] Construir `/update-metrics` com verificação de assinatura

### [ ] Banco de Dados
- [ ] Criar tabela `user_campaigns` com índices adequados
- [ ] Opcional: Criar tabela `campaign_events` para logs
- [ ] Configurar Supabase Realtime para updates

### [ ] Validações e Segurança
- [ ] Implementar rate limiting nas functions
- [ ] Adicionar error handling consistente
- [ ] Configurar CORS para domínios permitidos
- [ ] Validar todos os inputs em cada endpoint

### [ ] Testes
- [ ] Testar fluxo completo na Devnet
- [ ] Validar autenticação Privy
- [ ] Verificar fetch de dados on-chain
- [ ] Testar assinatura do oracle bot

### [ ] Deploy e Monitoramento
- [ ] Deploy das functions no Supabase
- [ ] Configurar logging e monitoramento
- [ ] Testar em produção
- [ ] Documentar API para frontend

### [ ] Frontend Integration
- [ ] Criar hooks React para cada endpoint
- [ ] Implementar tratamento de erro no frontend
- [ ] Adicionar loading states
- [ ] Testar integração completa

### [ ] Oracle Bot
- [ ] Desenvolver bot de monitoramento
- [ ] Implementar assinatura de mensagens
- [ ] Testar fluxo de update de métricas
- [ ] Configurar agendamento de verificações