CREATE TABLE IF NOT EXISTS user_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    privy_user_id TEXT NOT NULL,
    pda_address TEXT NOT NULL UNIQUE,
    tx_signature TEXT NOT NULL,
    influencer_pubkey TEXT NOT NULL,
    brand_pubkey TEXT,
    name TEXT,
    nickname TEXT,
    brand_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_campaigns_privy_user_id ON user_campaigns (privy_user_id);
CREATE INDEX IF NOT EXISTS idx_user_campaigns_pda_address ON user_campaigns (pda_address);

CREATE TABLE IF NOT EXISTS campaign_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pda_address TEXT NOT NULL REFERENCES user_campaigns(pda_address) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data JSONB
);

CREATE INDEX IF NOT EXISTS idx_campaign_events_pda_address ON campaign_events (pda_address);