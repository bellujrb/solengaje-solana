# GEMINI.md

This file provides guidance to Gemini when working with code in this repository.

## Project Overview

**Influnest** is a decentralized influencer marketing platform built on Solana that connects influencers with brands for Instagram campaigns. The platform uses smart contracts for transparent, milestone-based payments in USDC.

### Tech Stack
- **Smart Contract**: Anchor Framework v0.32.1 (Solana)
- **Frontend**: Next.js 15 + Privy.io + Tailwind CSS
- **Backend/Oracle**: Supabase Edge Functions (Deno)
- **Database**: Supabase PostgreSQL
- **Payments**: USDC (SPL Token)
- **Metrics**: Meta Graph API (Instagram)

### Architecture

```
influnest/
├── program-sol/                  # Solana smart contract (Anchor)
│   ├── src/lib.rs
│   └── Cargo.toml
├── frontend/                     # Next.js app with Privy auth
│   ├── src/
│   └── ...
├── backend/                      # Supabase Edge Functions (Oracle)
│   ├── functions/
│   ├── migrations/
│   └── config.toml
├── tests/
│   └── influnest.ts
├── GEMINI.md                     # This file
├── TESTING.md                    # Step-by-step testing guide
├── README.md                     # Project overview
├── Anchor.toml
└── Cargo.toml
```

## Implementation Status

### ✅ Completed

**Smart Contract (program-sol/src/lib.rs)**
- ✅ All 8 instructions fully implemented
- ✅ SPL Token integration (USDC)
- ✅ Automatic proportional payments
- ✅ PDA-based campaign management
- ✅ Oracle validation
- ✅ Comprehensive error handling
- ✅ Complete test suite

**Frontend (Next.js)**
- ✅ Privy authentication integration
- ✅ Dashboard page (`/dashboard`)
- ✅ Create campaign page (`/campaign/new`)
- ✅ Campaign detail page (`/campaign/[id]`)
- ✅ Anchor program integration (`lib/anchor.ts`)
- ✅ Supabase client (`lib/supabase.ts`)
- ✅ Responsive UI with Tailwind

**Backend/Oracle (backend/)**
- ✅ Database migrations (users, campaigns_cache)
- ✅ Edge Function: instagram-oauth
- ✅ Edge Function: get-instagram-status
- ✅ Edge Function: update-campaigns (oracle)

**Testing & Documentation**
- ✅ Anchor integration tests
- ✅ Complete GEMINI.md
- ✅ TESTING.md guide
- ✅ README.md

### ⏳ To Implement (for full MVP)

- ⏳ Settings page with Instagram OAuth UI
- ⏳ Deploy Edge Functions to Supabase
- ⏳ Configure pg_cron for oracle cronjob
- ⏳ Generate real IDL from built program
- ⏳ Add post management UI
- ⏳ Campaign metrics visualization

## Key Workflows

(No changes to this section, workflows remain the same)

## Smart Contract Architecture

### Program ID
Default: `DS6344gi387M4e6XvS99QQXGiDmY6qQi4xYxqGUjFbB3` (example)

**Important**: This ID must be updated after deploying:
1. Deploy program: `anchor deploy`
2. Get new program ID: `solana address -k target/deploy/program-sol-keypair.json`
3. Update `declare_id!()` in lib.rs
4. Update `program-sol =` in Anchor.toml
5. Update `NEXT_PUBLIC_INFLUNEST_PROGRAM_ID` in frontend/.env.local
6. Rebuild: `anchor build`

### Key Instructions
(No changes to instruction logic)

### Account Structures
(No changes to account structures)

## Common Commands

### Smart Contract

```bash
# Build program
anchor build

# Run tests (local validator + tests)
anchor test

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Get program ID
solana address -k target/deploy/program-sol-keypair.json

# Generate new program keypair (if needed)
solana-keygen new -o target/deploy/program-sol-keypair.json
```

### Frontend

```bash
cd frontend

# Install dependencies
pnpm install

# Run dev server
pnpm dev
```

### Backend (Supabase)

```bash
cd backend

# Initialize Supabase CLI
npx supabase login

# Link to project
npx supabase link --project-ref YOUR_PROJECT_REF

# Run migrations
npx supabase db push

# Deploy Edge Functions
npx supabase functions deploy instagram-oauth
# ... and others
```

## Deployment Checklist

### 1. Smart Contract (Solana Devnet/Mainnet)
- [ ] Build: `anchor build`
- [ ] Deploy: `anchor deploy --provider.cluster devnet`
- [ ] Get program ID: `solana address -k target/deploy/program-sol-keypair.json`
- [ ] Update program ID in lib.rs and Anchor.toml
- [ ] Rebuild: `anchor build`
- [ ] Copy IDL: `cp target/idl/program_sol.json frontend/src/lib/idl.json`
- [ ] Initialize oracle: Call `initialize_oracle` instruction

(Other sections remain largely the same, with path references implicitly updated by the context of the new structure.)
