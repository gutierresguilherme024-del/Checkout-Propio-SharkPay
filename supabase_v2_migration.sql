-- SQL for Supabase Editor - Checkout v2.0
-- Run this in your SQL Editor to update for Version 2.0

-- 1. Update produtos table
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS stripe_product_id TEXT;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS checkout_slug VARCHAR(255) UNIQUE;

-- Generate slugs for existing products
UPDATE produtos SET checkout_slug = LOWER(REPLACE(nome, ' ', '-')) WHERE checkout_slug IS NULL;

-- 2. Update pedidos table
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS cpf_comprador VARCHAR(20);
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS pago_em TIMESTAMPTZ;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS entrega_iniciada_em TIMESTAMPTZ;

-- 3. Ensure bucket exists (Manual instruction: Create 'produtos-pdf' in Storage)
