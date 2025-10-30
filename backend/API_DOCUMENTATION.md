# Backend API Documentation

This document provides a detailed overview of the Supabase Edge Functions created for the Influnest platform, based on the `IMPLEMENTATION_PLAN.md`.

## Base URL

All endpoint URLs are relative to your Supabase project URL:
`https://<YOUR-PROJECT-REF>.supabase.co/functions/v1/`

---

## 1. `/verify-auth`

Verifies a user's Privy JWT to confirm their authentication status and retrieve their wallet information.

- **Method**: `POST`
- **Authentication**: Privy `Authorization: Bearer <token>` header.
- **Request Body**: Empty.
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "verified": true,
    "privy_user_id": "did:privy:clynz15a10037l80fpj068buv",
    "wallet": "0x..."
  }
  ```
- **Error Responses**:
  - `401 Unauthorized`: If the token is missing, invalid, or expired.
  - `405 Method Not Allowed`: If the request method is not `POST`.

---

## 2. `/index-campaign`

Indexes a newly created on-chain campaign by verifying the creation transaction and storing its metadata in the Supabase database.

- **Method**: `POST`
- **Authentication**: Privy `Authorization: Bearer <token>` header.
- **Request Body**:
  ```json
  {
    "pda_address": "<PDA_BASE58>",
    "tx_signature": "<SIGNATURE_BASE58>",
    "brand_pubkey": "<BRAND_WALLET_BASE58>",
    "name": "My Awesome Campaign",
    "nickname": "Insta-Campaign",
    "brand_name": "Super Brand"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "pda": "<PDA_BASE58>"
  }
  ```
- **Logic & Validations**:
  1. Verifies the user's Privy JWT.
  2. Fetches the Solana transaction using `tx_signature`.
  3. Confirms the transaction was successful, recent (within 5 minutes), and signed by the influencer's wallet from the JWT.
  4. Verifies the `pda_address` account is owned by the program and has the correct discriminator.
  5. Upserts the campaign metadata into the `user_campaigns` table.

---

## 3. `/get-my-campaigns`

Retrieves all campaigns associated with the authenticated user, combining off-chain metadata from Supabase with live on-chain data from Solana.

- **Method**: `GET`
- **Authentication**: Privy `Authorization: Bearer <token>` header.
- **Query Parameters**:
  - `page` (optional, default: `1`): For pagination.
  - `limit` (optional, default: `20`): For pagination.
  - `status` (optional): To filter by campaign status (e.g., `Active`, `Completed`).
- **Success Response (200 OK)**: An array of campaign objects.
  ```json
  [
    {
      "pda_address": "...",
      "name": "My Awesome Campaign",
      "nickname": "Insta-Campaign",
      "brand_name": "Super Brand",
      "tx_signature": "...",
      "influencer_pubkey": "...",
      "brand_pubkey": "...",
      "status": "Active",
      "progress": 55.2,
      "current_likes": 5520,
      "target_likes": 10000,
      "paid_amount": 150
    }
  ]
  ```
- **Logic & Caching**:
  1. Verifies the user's Privy JWT.
  2. Fetches indexed campaigns for the user from the `user_campaigns` table.
  3. For each campaign, it fetches the live data from the on-chain PDA.
  4. Merges the off-chain and on-chain data.
  5. Results are cached for 30 seconds using Deno KV for improved performance.

---

## 4. `/update-metrics`

An oracle-only endpoint to log campaign performance metrics. This is not intended for direct use by frontend clients.

- **Method**: `POST`
- **Authentication**: Verifies a cryptographic signature from a designated oracle public key.
- **Request Body**:
  ```json
  {
    "pda": "<PDA_BASE58>",
    "likes": 1234,
    "comments": 56,
    "views": 10000,
    "shares": 10,
    "oracle_signature": "<SIGNATURE_BASE58>",
    "message": "update:<PDA>:<likes>:<comments>:<views>:<shares>"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true
  }
  ```
- **Logic & Validations**:
  1. Verifies that the `oracle_signature` was created by the trusted oracle signing the `message`.
  2. Fetches the campaign PDA to ensure it exists.
  3. Logs the metrics update as an event in the `campaign_events` table.
  4. This table insertion automatically triggers Supabase Realtime to notify connected clients of the update.
