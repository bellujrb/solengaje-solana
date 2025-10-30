# 📚 Solengage Smart Contract - Technical Architecture

> **Decentralized Influencer Marketing Platform on Solana**

## 🎯 Overview

Solengage is a Solana program (smart contract) written in Rust using the Anchor framework, implementing an automatic progressive payment system for influencer marketing campaigns.

**Program ID:** `2e3n681eydMY7t35bHD53eLfaifH3yQzQEsmgfhKV7E5`

---

## 🏗️ System Architecture

### Main Components

```
┌─────────────────────────────────────────────────────────────┐
│                    SOLENGAGE PROGRAM                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Influencer  │  │    Brand     │  │   Oracle     │     │
│  │   (Creator)  │  │   (Payer)    │  │ (Validator)  │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                  │                  │             │
│         │   1. Create      │                  │             │
│         │   Campaign       │                  │             │
│         └─────────────────►│                  │             │
│                            │   2. Pay &       │             │
│                            │   Activate       │             │
│         ┌──────────────────┘                  │             │
│         │                                     │             │
│         │                     3. Update       │             │
│         │                     Metrics         │             │
│         │◄────────────────────────────────────┘             │
│         │                                                   │
│         │  4. Auto Payments (10%, 20%... 100%)            │
│         │                                                   │
│  ┌──────▼────────────────────────────────────────────┐    │
│  │           Campaign PDA (State Account)            │    │
│  │  - Metrics: Likes, Views, Comments, Shares        │    │
│  │  - Status: Draft → Active → Completed             │    │
│  │  - Payment Milestones: [bool; 10]                 │    │
│  │  - USDC Vault: Holds campaign budget              │    │
│  └───────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Data Structure

### Campaign Account (PDA)

Main account storing all campaign state.

**PDA Seeds:** `["campaign", influencer_pubkey, brand_pubkey, campaign_name]`

**Size:** 474 bytes

```rust
pub struct Campaign {
    // === Participants ===
    pub influencer: Pubkey,        // 32 bytes - Campaign creator
    pub brand: Pubkey,             // 32 bytes - Brand that pays
    pub oracle: Pubkey,            // 32 bytes - Metrics validator
    
    // === Identification ===
    pub name: String,              // 54 bytes (4 + 50) - Unique name
    pub nickname: String,          // 54 bytes - Influencer handle
    pub brand_name: String,        // 54 bytes - Brand name
    pub hashtag: String,           // 54 bytes - Campaign hashtag
    
    // === Targets (Set at Creation) ===
    pub target_likes: u64,         // 8 bytes
    pub target_comments: u64,      // 8 bytes
    pub target_views: u64,         // 8 bytes
    pub target_shares: u64,        // 8 bytes
    
    // === Current Metrics (Updated by Oracle) ===
    pub current_likes: u64,        // 8 bytes
    pub current_comments: u64,     // 8 bytes
    pub current_views: u64,        // 8 bytes
    pub current_shares: u64,       // 8 bytes
    
    // === Financial ===
    pub amount_usdc: u64,          // 8 bytes - Total budget (6 decimals)
    pub paid_amount: u64,          // 8 bytes - Already paid to influencer
    pub payment_milestones: [bool; 10], // 10 bytes - Paid milestones
    
    // === Metadata ===
    pub deadline: i64,             // 8 bytes - Unix timestamp
    pub status: CampaignStatus,    // 2 bytes - Current state
    pub created_at: i64,           // 8 bytes - Creation date
    pub last_updated: i64,         // 8 bytes - Last update
}
```

---

## 🔄 State Machine

```
                brand_pay_campaign
    Draft ──────────────────────────────► Active
      │                                      │
      │  cancel_campaign                    │  update_campaign_metrics
      │                                      │  (when progress = 100%)
      ▼                                      ▼
  Cancelled ◄───────────────────────── Completed
                cancel_campaign              │
                                             │ close_campaign
                                             ▼
                                          [Account Closed]
```

### Campaign States

| State | Description | Possible Transitions |
|--------|-----------|---------------------|
| **Draft** | Campaign created but not paid | `Active`, `Cancelled` |
| **Active** | Campaign paid and running | `Completed`, `Cancelled` |
| **Completed** | 100% of targets achieved | `[Account Closed]` |
| **Cancelled** | Cancelled by brand | `[Terminal]` |

---

## 🎯 Program Instructions

### 1. `create_campaign`

Creates a new campaign in Draft status.

**Parameters:**
```rust
name: String,           // Unique name (max 50 chars)
nickname: String,       // Influencer handle (max 50 chars)
brand_name: String,     // Brand name (max 50 chars)
hashtag: String,        // Campaign hashtag (max 50 chars)
target_likes: u64,      // Likes target
target_comments: u64,   // Comments target
target_views: u64,      // Views target
target_shares: u64,     // Shares target
amount_usdc: u64,       // Budget in USDC (6 decimals)
deadline: i64           // Expiration timestamp
```

**Accounts:**
- `campaign` (PDA, init) - Account to create
- `influencer` (Signer, Payer) - Campaign creator
- `brand` (SystemAccount) - Brand that will pay
- `oracle` (AccountInfo) - Metrics validator
- `system_program` - System program

**Validations:**
- ✅ Name ≤ 50 characters
- ✅ Nickname ≤ 50 characters
- ✅ Brand name ≤ 50 characters
- ✅ Hashtag ≤ 50 characters
- ✅ amount_usdc > 0
- ✅ deadline > now
- ✅ At least one target > 0

**Result:**
- Status: `Draft`
- Campaign registered on-chain
- Awaiting brand payment

---

### 2. `brand_pay_campaign`

Activates campaign by transferring USDC from brand to campaign vault.

**Parameters:** None (accounts contain all information)

**Accounts:**
- `campaign` (PDA, mut) - Campaign to activate
- `brand` (Signer, mut) - Paying brand
- `brand_usdc_account` (TokenAccount, mut) - USDC source
- `campaign_usdc_account` (TokenAccount, mut) - Destination (vault)
- `token_program` - SPL Token Program

**Flow:**
1. Validates campaign is in `Draft`
2. Validates deadline hasn't expired
3. **CPI Transfer**: Transfers `amount_usdc` from brand → vault
4. Updates status to `Active`
5. Updates `last_updated`

**Result:**
- Status: `Draft` → `Active`
- USDC in custody in campaign vault
- Campaign ready to receive metric updates

---

### 3. `update_campaign_metrics`

Updates campaign metrics and triggers automatic milestone payments.

**Parameters:**
```rust
likes: u64,      // Current likes
comments: u64,   // Current comments
views: u64,      // Current views
shares: u64      // Current shares
```

**Accounts:**
- `campaign` (PDA, mut) - Campaign to update
- `oracle` (Signer, mut) - Authorized validator
- `campaign_usdc_account` (TokenAccount, mut) - Vault (source)
- `influencer_usdc_account` (TokenAccount, mut) - Destination
- `token_program` - SPL Token Program
- `system_program` - System Program

**Flow:**

```rust
1. Validates status == Active
2. Validates deadline hasn't expired
3. Calculates old_progress (0-100%)
4. Updates metrics (current_likes, current_comments, etc.)
5. Calculates new_progress (0-100%)
6. Determines achieved milestones:
   old_milestones = old_progress / 10  // Ex: 25% → 2 milestones
   new_milestones = new_progress / 10  // Ex: 55% → 5 milestones
7. For each milestone between [old_milestones..new_milestones]:
   - Calculates payment amount (10% of budget per milestone)
   - Validates safety (no double payment)
   - CPI Transfer: vault → influencer
   - Marks milestone as paid
   - Increments paid_amount
8. If new_progress >= 100%:
   - Status → Completed
   - Closes campaign account
   - Refunds rent to oracle
```

**Progress Calculation:**

```rust
fn get_progress_percentage(&self) -> u64 {
    let mut total_target = 0;
    let mut total_current = 0;
    
    // Only metrics with target > 0 are included
    if self.target_likes > 0 {
        total_target += self.target_likes;
        // Cap current at target (prevents >100%)
        total_current += self.current_likes.min(self.target_likes);
    }
    // ... same for comments, views, shares
    
    if total_target == 0 { return 0; }
    
    ((total_current * 100) / total_target).min(100)
}
```

**Payment Example:**

```
Budget: 1000 USDC
Old Progress: 25% (2 milestones paid: 10%, 20%)
New Progress: 55% (5 milestones achieved: 10%, 20%, 30%, 40%, 50%)

Payments to process:
- Milestone 3 (30%): 100 USDC
- Milestone 4 (40%): 100 USDC  
- Milestone 5 (50%): 100 USDC
Total to pay now: 300 USDC

paid_amount: 200 → 500 USDC
payment_milestones: [T, T, T, T, T, F, F, F, F, F]
```

**Result:**
- Metrics updated
- Automatic payments processed
- If 100%: Status → `Completed`, account closed

---

### 4. `cancel_campaign`

Cancels campaign and refunds remaining USDC to brand.

**Parameters:** None

**Accounts:**
- `campaign` (PDA, mut) - Campaign to cancel
- `brand` (Signer, mut) - Authorized brand
- `brand_usdc_account` (TokenAccount, mut) - Refund destination
- `campaign_usdc_account` (TokenAccount, mut) - Vault (source)
- `token_program` - SPL Token Program

**Flow:**
1. Validates campaign is not `Completed`
2. Validates brand is the campaign owner
3. If status == `Active`:
   - Calculates: `remaining = amount_usdc - paid_amount`
   - CPI Transfer: vault → brand (refunds remaining)
4. Updates status to `Cancelled`
5. Updates `last_updated`

**Example:**
```
Budget: 1000 USDC
Already paid: 300 USDC
Refund: 700 USDC → brand
Status: Active → Cancelled
```

**Result:**
- Status → `Cancelled`
- Unused USDC returned to brand
- Influencer keeps what's been paid

---

### 5. `close_campaign`

Closes a completed campaign account.

**Parameters:** None

**Accounts:**
- `campaign` (PDA, mut, close) - Campaign to close
- `oracle` (AccountInfo, mut) - Receives rent

**Flow:**
1. Validates status == `Completed`
2. Closes campaign account
3. Refunds rent (~0.004 SOL) to oracle

**Note:** Usually called automatically by `update_campaign_metrics` when progress reaches 100%.

---

## 🔒 Security

### Implemented Protections

#### 1. **Anti-Double Payment**
```rust
pub payment_milestones: [bool; 10]
```
- Array tracks each paid milestone (10%, 20%, ..., 100%)
- Validation before each payment:
  ```rust
  require!(!self.payment_milestones[milestone], 
           ErrorCode::PaymentAlreadyProcessed);
  ```

#### 2. **Anti-Overpayment**
```rust
// Multiple validation layers
require!(
    self.paid_amount.saturating_add(amount) <= self.amount_usdc,
    ErrorCode::PaymentExceedsBudget
);

let safe_amount = amount.min(
    self.amount_usdc.saturating_sub(self.paid_amount)
);
```

#### 3. **Overflow Protection**
```rust
// All arithmetic operations use checked_*
let total = self.paid_amount
    .checked_add(amount)
    .ok_or(ErrorCode::MathOverflow)?;
```

#### 4. **Authority Validation**
```rust
#[account(
    has_one = oracle,  // Oracle signs updates
    has_one = brand    // Brand signs cancellation
)]
```

#### 5. **PDA Vault Authority**
- Campaign vault controlled by PDA
- Only program can authorize transfers
- No human has direct control

#### 6. **Progress Capping**
```rust
// Prevents over-performing metric from causing >100%
total_current += self.current_likes.min(self.target_likes);
```

---

## 💰 Payment Economics

### Milestone System

```
Progress    Milestone   Payment   Cumulative
─────────────────────────────────────────────
0-9%         -          0%        0%
10-19%       1          10%       10%
20-29%       2          10%       20%
30-39%       3          10%       30%
40-49%       4          10%       40%
50-59%       5          10%       50%
60-69%       6          10%       60%
70-79%       7          10%       70%
80-89%       8          10%       80%
90-99%       9          10%       90%
100%         10         10%       100%
```

### Calculation Formula

```rust
// Payment calculation per milestone
fn calculate_safe_payment(&self, milestone: usize) -> Result<u64> {
    let percentage = ((milestone + 1) * 10) as u64; // 10, 20, 30...
    
    // Total that should have been paid up to this milestone
    let total_to_pay = (self.amount_usdc * percentage) / 100;
    
    // Deduct what's already been paid
    let amount_to_transfer = total_to_pay - self.paid_amount;
    
    // Safety cap (never exceeds budget)
    let safe_amount = amount_to_transfer.min(
        self.amount_usdc - self.paid_amount
    );
    
    Ok(safe_amount)
}
```

### Practical Example

**Campaign:**
- Budget: 1000 USDC
- Target: 10,000 likes

**Timeline:**

| Update | Likes | Progress | Milestones | Payment | Total Paid |
|--------|-------|-----------|------------|-----------|------------|
| 1      | 1,500 | 15%       | 1 (10%) | 100 USDC | 100 USDC |
| 2      | 3,000 | 30%       | 2,3 (20%, 30%) | 200 USDC | 300 USDC |
| 3      | 6,000 | 60%       | 4,5,6 (40%-60%) | 300 USDC | 600 USDC |
| 4      | 10,000 | 100%      | 7,8,9,10 (70%-100%) | 400 USDC | 1000 USDC |

**Final Status:**
- Status: `Completed`
- Influencer received: 1000 USDC
- Account automatically closed

---

## 🧪 Tests

Tests are organized in sequential scenarios:

```
tests/
├── 01_create_campaign.ts       # Basic creation
├── 02_activate_campaign.ts     # Brand payment
├── 03_update_campaign_metrics.ts # Updates and payments
├── 04_micro_payments.ts        # Milestone validation
├── 05_fetch_campaign_info.ts   # Data queries
└── 06_complete_campaign.ts     # Closure
```

### Running Tests

```bash
# All tests
anchor test

# Specific test
anchor test -- --grep "create campaign"

# With detailed logs
anchor test -- --show-logs
```

---

## 🚀 Deployment

### Devnet

```bash
# Build
anchor build

# Deploy
anchor deploy --provider.cluster devnet

# Verify deployment
solana program show <PROGRAM_ID> --url devnet
```

### Mainnet

```bash
# Optimized build
anchor build --release

# Deploy (requires sufficient SOL)
anchor deploy --provider.cluster mainnet-beta

# Verify
solana program show <PROGRAM_ID> --url mainnet-beta
```

### Estimated Costs

- **Program deployment:** ~3-5 SOL (mainnet)
- **Create campaign:** ~0.004 SOL (rent)
- **Activate campaign:** Network fee (~0.000005 SOL)
- **Update metrics:** Network fee (~0.000005 SOL)

---

## 🔗 Integrations

### Frontend (TypeScript)

```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Solengage } from "./solengage";

// Initialize program
const program = anchor.workspace.Solengage as Program<Solengage>;

// Create campaign
const [campaignPDA] = PublicKey.findProgramAddressSync(
  [
    Buffer.from("campaign"),
    influencer.toBuffer(),
    brand.toBuffer(),
    Buffer.from(campaignName)
  ],
  program.programId
);

await program.methods
  .createCampaign(
    campaignName,
    nickname,
    brandName,
    hashtag,
    new anchor.BN(targetLikes),
    new anchor.BN(targetComments),
    new anchor.BN(targetViews),
    new anchor.BN(targetShares),
    new anchor.BN(amountUsdc),
    new anchor.BN(deadline)
  )
  .accounts({
    campaign: campaignPDA,
    influencer: influencerKeypair.publicKey,
    brand: brandPublicKey,
    oracle: oraclePublicKey,
    systemProgram: SystemProgram.programId,
  })
  .signers([influencerKeypair])
  .rpc();
```

### Oracle (Backend)

```typescript
// Update metrics periodically
async function updateCampaignMetrics(
  campaign: PublicKey,
  metrics: InstagramMetrics
) {
  await program.methods
    .updateCampaignMetrics(
      new anchor.BN(metrics.likes),
      new anchor.BN(metrics.comments),
      new anchor.BN(metrics.views),
      new anchor.BN(metrics.shares)
    )
    .accounts({
      campaign,
      oracle: oracleKeypair.publicKey,
      campaignUsdcAccount,
      influencerUsdcAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .signers([oracleKeypair])
    .rpc();
}
```

---

## 📊 Operation Costs

### Gas Fees (Devnet/Mainnet)

| Operation | Compute Units | Estimated Cost (SOL) |
|----------|---------------|----------------------|
| create_campaign | ~200k | 0.000005 |
| brand_pay_campaign | ~150k | 0.000005 |
| update_campaign_metrics | ~300k | 0.000005 |
| cancel_campaign | ~200k | 0.000005 |
| close_campaign | ~50k | 0.000005 |

**Note:** Actual costs vary with network congestion.

---

## 🛠️ Maintenance

### Program Upgrade

```bash
# Build new version
anchor build

# Upgrade (keeps program ID)
anchor upgrade <PROGRAM_PATH> --program-id <PROGRAM_ID>
```

### Monitoring

```bash
# Program logs
solana logs --url <CLUSTER> <PROGRAM_ID>

# Account state
solana account <CAMPAIGN_PDA> --url <CLUSTER>
```

---

## 📖 References

- [Anchor Framework](https://www.anchor-lang.com/)
- [Solana Documentation](https://docs.solana.com/)
- [SPL Token Program](https://spl.solana.com/token)
- [Solana Cookbook](https://solanacookbook.com/)

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a branch (`git checkout -b feature/amazing`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

---

## 📝 License

MIT License - see LICENSE for details.

---

**Built with ❤️ for the Solana community**
