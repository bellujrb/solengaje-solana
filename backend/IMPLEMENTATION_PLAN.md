# Implementation Plan: Influnest Backend

This document outlines the step-by-step plan to implement the backend for Influnest using Supabase Edge Functions.

## 1. Authentication with Privy

Before implementing the core application logic, we need a robust authentication mechanism.

*   **Objective:** Secure all Edge Functions by verifying a user's identity using Privy.
*   **Mechanism:** The frontend will obtain a JWT from Privy upon user login. This JWT will be passed in the `Authorization` header of all requests to the backend. The backend will verify the JWT's signature and extract the user's wallet address from its claims.
*   **Tasks:**
    1.  **Create a Privy Authentication Utility:** Create a reusable module (`/backend/auth/privy.ts`) that exports a function to verify the Privy JWT. This function will:
        *   Fetch Privy's public keys from their JWKS (JSON Web Key Set) endpoint.
        *   Decode and verify the JWT.
        *   Extract the `wallet_address` from the JWT claims.
        *   Return the authenticated wallet address or throw an error.
    2.  **Integrate into Edge Functions:** All Edge Functions will call this utility to authenticate the user at the beginning of their execution.

## 2. Database Schema Update

The current `campaigns_cache` table is missing several fields required to store all the campaign data.

*   **Objective:** Update the database schema to match the data from the `create_campaign` smart contract instruction.
*   **Tasks:**
    1.  **Create a New Migration:** Create a new SQL migration file in the `backend/migrations` directory.
    2.  **Update `campaigns_cache` Table:** The migration will add the following columns to the `campaigns_cache` table:
        *   `name`: `TEXT`
        *   `nickname`: `TEXT`
        *   `brand_name`: `TEXT`
        *   `brand_wallet`: `TEXT`
        *   `hashtag`: `TEXT`
        *   `target_likes`: `BIGINT`
        *   `target_comments`: `BIGINT`
        *   `target_views`: `BIGINT`
        *   `target_shares`: `BIGINT`
        *   `amount_usdc`: `BIGINT`
        *   `deadline`: `TIMESTAMPTZ`

## 3. `create-campaign` Edge Function

This function will be responsible for creating a new campaign.

*   **Objective:** Create a campaign on the Solana blockchain and save its data to the Supabase database.
*   **Frontend Responsibility:** The frontend will be responsible for:
    *   Collecting all the campaign data from the user.
    *   Creating the `create_campaign` transaction.
    *   Having the user sign the transaction with their wallet.
    *   Serializing the signed transaction.
    *   Sending the serialized transaction to the `create-campaign` Edge Function.
*   **Backend Tasks:**
    1.  **Create `create-campaign` Edge Function:** Create a new Edge Function at `backend/functions/create-campaign/index.ts`.
    2.  **Authentication:** Authenticate the user using the Privy authentication utility.
    3.  **Receive Serialized Transaction:** The function will receive the base64-encoded serialized transaction from the frontend.
    4.  **Broadcast Transaction:** The function will decode the transaction and broadcast it to the Solana network.
    5.  **Get Campaign Pubkey:** After the transaction is confirmed, the function will derive the campaign's public key (PDA).
    6.  **Save to Database:** The function will save all the campaign data, including the `campaign_pubkey`, to the `campaigns_cache` table.
    7.  **Return Campaign Pubkey:** The function will return the `campaign_pubkey` to the frontend.

## 4. `get-campaigns` Edge Function

This function will retrieve all campaigns for a given influencer.

*   **Objective:** Fetch all campaigns for the authenticated influencer from the Supabase database.
*   **Tasks:**
    1.  **Create `get-campaigns` Edge Function:** Create a new Edge Function at `backend/functions/get-campaigns/index.ts`.
    2.  **Authentication:** Authenticate the user using the Privy authentication utility.
    3.  **Fetch Campaigns:** The function will query the `campaigns_cache` table to get all campaigns where the `influencer_wallet` matches the authenticated user's wallet address.
    4.  **Return Campaigns:** The function will return an array of campaign objects.

## 5. Environment Variables

The following environment variables need to be configured in the Supabase project:

*   `SUPABASE_URL`
*   `SUPABASE_SERVICE_ROLE_KEY`
*   `SOLANA_RPC_URL`
*   `PRIVY_APP_ID`
*   `PRIVY_JWKS_URL`
