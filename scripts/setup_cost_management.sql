-- scripts/setup_cost_management.sql

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Business Profiles Table
CREATE TABLE IF NOT EXISTS business_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID, -- Optional: link to auth user
    business_type TEXT NOT NULL DEFAULT 'individual', -- individual, corporate, tax_exempt, simplified
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Assets: Vehicles
CREATE TABLE IF NOT EXISTS assets_vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE,
    model TEXT NOT NULL,
    number TEXT NOT NULL,
    fuel_type TEXT NOT NULL,
    alias TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Assets: Accounts (Bank)
CREATE TABLE IF NOT EXISTS assets_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE,
    bank_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    alias TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Assets: Cards
CREATE TABLE IF NOT EXISTS assets_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE,
    card_company TEXT NOT NULL,
    card_number_last4 TEXT NOT NULL,
    alias TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Optional: RLS Policies (Simple Public/Anon for now as per project style)
ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read/write for all" ON business_profiles FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE assets_vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read/write for all" ON assets_vehicles FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE assets_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read/write for all" ON assets_accounts FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE assets_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read/write for all" ON assets_cards FOR ALL USING (true) WITH CHECK (true);
