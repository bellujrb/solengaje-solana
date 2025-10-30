# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Solengage** is a decentralized influencer marketing platform built on Solana that connects influencers with brands for social media campaigns. The platform uses smart contracts for transparent, milestone-based payments in USDC with automatic progressive payments based on engagement metrics.

### Tech Stack
- **Smart Contract**: Anchor Framework v0.32.1 (Solana)
- **Testing**: Mocha + Chai + ts-mocha
- **Payments**: USDC (SPL Token)
- **Metrics Oracle**: External service (to be implemented)

### Architecture

```
program-sol/
├── programs/solengage/          # Solana smart contract (Anchor)
│   ├── src/lib.rs              # 482 lines - Complete implementation
│   └── Cargo.toml
├── tests/                      # BDD-style integration tests
│   ├── 01_create_campaign.ts
│   ├── 02_activate_campaign.ts
│   ├── 03_update_campaign_metrics.ts
│   ├── 04_micro_payments.ts
│   ├── 05_fetch_campaign_info.ts
│   └── 06_auto_close_campaign.ts
├── target/                     # Build artifacts and IDL
│   ├── deploy/
│   │   └── solengage-keypair.json
│   ├── types/
│   │   └── solengage.ts
│   └── idl/
│       └── solengage.json
├── CLAUDE.md                   # This file
├── README.md                   # Project overview
├── Anchor.toml                 # Anchor configuration
├── Cargo.toml                  # Rust workspace config
├── package.json                # Node dependencies
└── tsconfig.json               # TypeScript config
```

## Implementation Status

### ✅ Completed

**Smart Contract (programs/solengage/src/lib.rs)**
- ✅ 5 core instructions fully implemented
- ✅ SPL Token integration (USDC)
- ✅ Automatic progressive payments (10% milestones)
- ✅ PDA-based campaign management
- ✅ Oracle signature validation
- ✅ Comprehensive error handling with custom error codes
- ✅ Payment safety validations (prevent overpayment)
- ✅ Auto-close campaign on completion

**Testing**
- ✅ BDD-style test suite with 6 test files
- ✅ Complete campaign lifecycle coverage
- ✅ Token account setup and management
- ✅ Metrics update and payment validation

### ⏳ To Implement

- ⏳ Frontend application (brand/influencer dashboards)
- ⏳ Oracle backend service for metrics updates
- ⏳ Social media API integrations
- ⏳ Campaign monitoring and analytics

## Common Commands

### Building & Testing

```bash
# Build the Anchor program
anchor build

# Run all tests
anchor test

# Run tests with verbose output
anchor test -- --nocapture

# Run a specific test file
yarn run ts-mocha -p ./tsconfig.json -t 1000000 "tests/01_create_campaign.ts"

# Lint code
yarn lint

# Fix linting issues
yarn lint:fix
```

### Deployment

```bash
# Deploy to localnet (default in Anchor.toml)
anchor deploy

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Get program ID
solana address -k target/deploy/solengage-keypair.json

# Generate new program keypair
solana-keygen new -o target/deploy/solengage-keypair.json
```

### Program ID Management

**Current Program ID**: `2e3n681eydMY7t35bHD53eLfaifH3yQzQEsmgfhKV7E5`

After deploying to a new environment:
1. Deploy: `anchor deploy`
2. Get new ID: `solana address -k target/deploy/solengage-keypair.json`
3. Update `declare_id!()` in `programs/solengage/src/lib.rs:4`
4. Update `solengage =` in `Anchor.toml:9` under `[programs.localnet]`
5. Rebuild: `anchor build`

## Key Workflows

### 1. Campaign Creation Flow
1. Influencer creates campaign with parameters:
   - Campaign details (name, brand name, hashtag)
   - Target metrics (likes, comments, views, shares)
   - Payment amount (USDC) and deadline
2. Calls `create_campaign` instruction
3. Campaign PDA created with status **Draft**
4. Campaign seeds: `["campaign", influencer_pubkey, brand_pubkey, name]`

### 2. Campaign Activation Flow
1. Brand receives campaign details from influencer
2. Brand calls `brand_pay_campaign` instruction
3. USDC transferred from brand → campaign vault (token account)
4. Campaign status changes: **Draft → Active**
5. Campaign is now live and ready for metrics updates

### 3. Metrics Update & Payment Flow
1. Oracle monitors campaign progress
2. Oracle calls `update_campaign_metrics` with current metrics
3. **Smart contract automatically calculates and pays**:
   - Progress % = average of (current/target) for all metrics
   - Milestones = progress / 10 (10 total milestones at 10%, 20%, ..., 100%)
   - Payment = (amount_usdc × milestones / 10) - paid_amount
   - USDC transferred from vault → influencer
4. Campaign marked **Completed** when progress ≥ 100%
5. Campaign account automatically closed, rent returned to oracle

### 4. Campaign Cancellation
1. Brand can cancel campaign before completion
2. Calls `cancel_campaign` instruction
3. If **Draft**: Campaign marked as Cancelled (no refund needed)
4. If **Active**: Remaining USDC returned to brand
5. Campaign status → **Cancelled**

## Smart Contract Architecture

### Key Instructions (5 total)

1. **create_campaign** - Influencer creates campaign
   - Seeds: `["campaign", influencer_pubkey, brand_pubkey, name]`
   - Initial status: **Draft**
   - Parameters: name, nickname, brand_name, hashtag, targets, amount, deadline
   - Creates Campaign PDA account
   - Stores oracle pubkey for future validation

2. **brand_pay_campaign** - Brand funds campaign
   - Validates: status = Draft, deadline not expired
   - Transfers USDC from brand token account → campaign token account (vault)
   - Status: **Draft → Active**
   - Campaign becomes active and ready for metrics updates

3. **update_campaign_metrics** - Oracle updates metrics and triggers payments
   - Validates: oracle signature matches campaign.oracle
   - Updates: current_likes, current_comments, current_views, current_shares
   - Calculates progress: average of (current/target) across all non-zero targets
   - **Automatically processes payments**:
     - Calculates milestones achieved (progress / 10)
     - For each new milestone: transfers 10% of total amount to influencer
     - Uses `payment_milestones` array to prevent double-payment
   - Status: **Active → Completed** when progress ≥ 100%
   - **Auto-closes campaign** via CPI when completed

4. **close_campaign** - Closes campaign account and returns rent
   - Called automatically by `update_campaign_metrics` when completed
   - Transfers account rent lamports to oracle
   - Can only be called when campaign status is **Completed**

5. **cancel_campaign** - Brand cancels campaign
   - Validates: brand signature, campaign not already completed
   - If **Active**: refunds remaining USDC to brand
   - Status: **Draft/Active → Cancelled**

### Account Structures

**Campaign** (PDA)
```rust
pub struct Campaign {
    pub influencer: Pubkey,         // Campaign creator
    pub brand: Pubkey,              // Brand funding the campaign
    pub name: String,               // max 50 chars
    pub nickname: String,           // max 50 chars (influencer handle)
    pub brand_name: String,         // max 50 chars
    pub hashtag: String,            // max 50 chars
    pub target_likes: u64,          // Target engagement metrics
    pub target_comments: u64,
    pub target_views: u64,
    pub target_shares: u64,
    pub current_likes: u64,         // Current metrics (updated by oracle)
    pub current_comments: u64,
    pub current_views: u64,
    pub current_shares: u64,
    pub amount_usdc: u64,           // Total campaign budget (6 decimals)
    pub deadline: i64,              // Unix timestamp
    pub status: CampaignStatus,     // Draft | Active | Completed | Cancelled
    pub paid_amount: u64,           // Cumulative payments made
    pub oracle: Pubkey,             // Authorized oracle for this campaign
    pub created_at: i64,            // Creation timestamp
    pub last_updated: i64,          // Last update timestamp
    pub payment_milestones: [bool; 10], // Track which 10% milestones paid
}
```

**Space Calculation**: `8 + 32 + 32 + (4+50) + (4+50) + (4+50) + (4+50) + 8*8 (metrics) + 8 + 8 + (1+1) (status) + 8 + 32 + 8 + 8 + 10 = 474 bytes`

**CampaignStatus** (Enum):
```rust
pub enum CampaignStatus {
    Draft,      // Created, awaiting funding
    Active,     // Funded and running
    Completed,  // Reached 100% progress
    Cancelled,  // Cancelled by brand
}
```

**Campaign Methods**:
- `get_progress_percentage()` - Calculates average progress across all target metrics (caps at 100%)
- `validate_payment_safety()` - Validates milestone payment is safe to process
- `calculate_safe_payment()` - Calculates payment amount with overflow protection

### PDA Seeds & Accounts

**Campaign PDA**:
- Seeds: `["campaign", influencer_pubkey, brand_pubkey, campaign_name]`
- Bump stored in account (not in struct, handled by Anchor)

**Token Accounts**:
- Campaign vault: Associated Token Account owned by Campaign PDA
- Brand/Influencer accounts: Standard ATAs for USDC
- All use USDC mint (6 decimals)

## Important Implementation Details

### Progress Calculation (lib.rs:343-370)
Progress is the **average** of all target metrics that are > 0. Current values are **capped** at target to prevent >100%:

```rust
fn get_progress_percentage(&self) -> u64 {
    let mut total_target = 0;
    let mut total_current = 0;

    if self.target_likes > 0 {
        total_target += self.target_likes;
        total_current += self.current_likes.min(self.target_likes); // Capped
    }
    // ... same for comments, views, shares

    if total_target == 0 { return 0; }

    ((total_current * 100) / total_target).min(100) // Cap at 100%
}
```

**Example**:
- Targets: 1000 likes, 100 comments
- Current: 500 likes, 50 comments
- Progress: ((500 + 50) / (1000 + 100)) × 100 = 50%

### Milestone Payment Logic (lib.rs:84-173)
Progressive payments at 10% intervals with safety checks:

```rust
let old_progress = campaign.get_progress_percentage();
// Update metrics...
let new_progress = campaign.get_progress_percentage();

let old_milestones = (old_progress / 10) as usize; // e.g., 2 (for 20-29%)
let new_milestones = (new_progress / 10) as usize; // e.g., 4 (for 40-49%)

// Pay for milestones 2 and 3 (indices in payment_milestones array)
for milestone_index in old_milestones..new_milestones {
    let amount = campaign.calculate_safe_payment(milestone_index)?;

    if amount > 0 && campaign.validate_payment_safety(milestone_index, amount).is_ok() {
        // Transfer USDC from vault to influencer
        token::transfer(cpi_ctx, amount)?;
        campaign.paid_amount += amount;
        campaign.payment_milestones[milestone_index] = true;
    }
}
```

**Payment Safety Validations**:
1. Milestone index < 10
2. Milestone not already paid (`payment_milestones[i] == false`)
3. Amount > 0
4. Total paid won't exceed campaign budget
5. Progress justifies payment (e.g., 30% progress for milestone 2)

### Auto-Close Mechanism (lib.rs:146-170)
When campaign reaches 100% completion:
```rust
if new_progress >= 100 {
    campaign.status = CampaignStatus::Completed;

    // CPI to close_campaign instruction
    // Transfers rent lamports to oracle
    crate::cpi::close_campaign(cpi_ctx)?;
}
```

## Error Codes

The program defines 15 custom error codes (lib.rs:441-481):

| Code | Error | Description |
|------|-------|-------------|
| 6000 | UnauthorizedOracle | Oracle signature doesn't match campaign.oracle |
| 6001 | NameTooLong | Campaign name > 50 characters |
| 6002 | NicknameTooLong | Nickname > 50 characters |
| 6003 | BrandNameTooLong | Brand name > 50 characters |
| 6004 | HashtagTooLong | Hashtag > 50 characters |
| 6005 | InvalidAmount | Amount must be > 0 |
| 6006 | InvalidDeadline | Deadline must be in future |
| 6007 | NoTargetsSet | At least one target metric required |
| 6008 | CampaignNotDraft | Can only fund campaigns in Draft status |
| 6009 | CampaignExpired | Campaign deadline has passed |
| 6010 | CampaignNotActive | Campaign must be Active |
| 6011 | UnauthorizedBrand | Only brand can perform this action |
| 6012 | CampaignAlreadyCompleted | Cannot cancel completed campaign |
| 6013 | MathOverflow | Arithmetic operation overflow |
| 6014 | InvalidMilestone | Milestone index must be < 10 |
| 6015 | PaymentAlreadyProcessed | This milestone already paid |
| 6016 | InsufficientFunds | Not enough funds for payment |
| 6017 | PaymentExceedsBudget | Payment would exceed total budget |
| 6018 | CampaignNotInTerminalState | Campaign not Completed/Cancelled |

## Test Suite Structure

The test suite follows BDD (Behavior-Driven Development) methodology with 6 test files:

1. **01_create_campaign.ts** - Campaign creation with Draft status
2. **02_activate_campaign.ts** - Brand payment and activation
3. **03_update_campaign_metrics.ts** - Oracle updates and payment triggers
4. **04_micro_payments.ts** - Milestone payment calculations
5. **05_fetch_campaign_info.ts** - Account data retrieval
6. **06_auto_close_campaign.ts** - Automatic campaign closure

Each test includes:
- Setup with fresh keypairs and token accounts
- SOL airdrops and USDC minting
- Transaction execution and verification
- Account state validation

## Troubleshooting

### Common Build/Test Issues

**"Program error: Invalid account data"**
- **Cause**: Program ID mismatch between deployed program and `declare_id!()`
- **Solution**:
  1. Get program ID: `solana address -k target/deploy/solengage-keypair.json`
  2. Update `declare_id!()` in lib.rs:4
  3. Update Anchor.toml:9
  4. Rebuild: `anchor build`

**"Account does not have enough SOL"**
- **Cause**: Insufficient SOL for rent or transaction fees
- **Solution**: Airdrop SOL on localnet/devnet:
  ```bash
  solana airdrop 2 <WALLET_ADDRESS> --url devnet
  ```

**"Airdrop failed" in tests**
- **Cause**: Rate limiting on devnet or localnet not running
- **Solution**:
  - For localnet: Ensure `anchor test` starts fresh validator
  - For devnet: Wait a few seconds between airdrop requests
  - Add delays: `await new Promise(resolve => setTimeout(resolve, 2000))`

**"Token account not found"**
- **Cause**: USDC token account not created before use
- **Solution**: Create associated token account first:
  ```typescript
  import { createAccount } from "@solana/spl-token";
  const tokenAccount = await createAccount(connection, payer, mint, owner);
  ```

**"Transaction too large"**
- **Cause**: Campaign account size exceeds limit
- **Solution**: Verify `Campaign::INIT_SPACE` calculation is correct (currently ~474 bytes)

### Oracle Issues

**Error 6000: UnauthorizedOracle**
- **Cause**: Oracle signature doesn't match `campaign.oracle` pubkey
- **Solution**: Ensure oracle keypair used in `update_campaign_metrics` matches the one provided during campaign creation

### Payment Issues

**Error 6015: PaymentAlreadyProcessed**
- **Cause**: Trying to pay the same milestone twice
- **Solution**: This is a safety feature. Check `payment_milestones` array state

**Error 6017: PaymentExceedsBudget**
- **Cause**: Calculated payment would exceed `campaign.amount_usdc`
- **Solution**: Bug in payment logic - review `calculate_safe_payment()` implementation

**Payments not triggering**
- **Cause**: Progress not reaching next 10% milestone
- **Solution**: Check `get_progress_percentage()` calculation. At least one target metric must be > 0.

## Key Design Decisions

1. **Per-Campaign Oracle**: Each campaign stores its own oracle pubkey (instead of global OracleConfig). This allows flexibility for different oracle services.

2. **Capped Progress**: Current metrics are capped at target values to prevent >100% progress and overpayment.

3. **Payment Milestones Array**: Boolean array `[bool; 10]` prevents double-payment even if oracle sends duplicate updates.

4. **Auto-Close on Completion**: Campaign account automatically closes when reaching 100%, returning rent to oracle as compensation.

5. **Brand-Initiated Cancellation**: Only brand can cancel (not influencer), protecting against bad actors.

## Security Considerations

- **Oracle Validation**: Every metric update validates oracle signature via `has_one = oracle` constraint
- **PDA Authority**: Campaign PDA is vault authority - only smart contract can transfer USDC
- **Overflow Protection**: All arithmetic uses `checked_*` operations or `saturating_*`
- **Payment Caps**: Multiple validations prevent overpayment (milestones array, budget checks, progress caps)
- **Deadline Enforcement**: `brand_pay_campaign` checks deadline hasn't passed
- **Status Guards**: Each instruction validates campaign status is appropriate for the action

## Development Notes

- **Anchor Version**: 0.32.1 (do not upgrade without testing)
- **Rust Toolchain**: Solana default (typically 1.75+)
- **Test Timeout**: Set to 1000000ms in package.json due to airdrop delays
- **Cluster**: Configured for localnet in Anchor.toml (change for devnet deployment)
