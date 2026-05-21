-- Migration 0008: Drugs and drug stock at facilities

-- Drug catalog (generic medicines)
CREATE TABLE IF NOT EXISTS drugs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,           -- e.g. "Paracetamol 500mg"
    generic_name VARCHAR(200) NOT NULL,   -- e.g. "Paracetamol"
    category VARCHAR(100),                -- e.g. "painkiller", "antibiotic", "vitamin"
    form VARCHAR(50),                     -- e.g. "tablet", "syrup", "injection", "cream"
    unit VARCHAR(50),                     -- e.g. "mg", "ml", "g"
    dosage VARCHAR(100),                  -- e.g. "500mg"
    description TEXT,
    manufacturer VARCHAR(200),
    requires_prescription BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drugs_name ON drugs(name);
CREATE INDEX IF NOT EXISTS idx_drugs_generic ON drugs(generic_name);
CREATE INDEX IF NOT EXISTS idx_drugs_category ON drugs(category);

-- Drug stock at each facility
CREATE TABLE IF NOT EXISTS drug_stock (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    drug_id UUID NOT NULL REFERENCES drugs(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 0,
    price_xaf INTEGER,                    -- price in CFA francs
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    is_in_stock BOOLEAN NOT NULL DEFAULT TRUE,
    location_in_store VARCHAR(100),       -- shelf, section, etc.
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(facility_id, drug_id)
);

CREATE INDEX IF NOT EXISTS idx_drug_stock_facility ON drug_stock(facility_id);
CREATE INDEX IF NOT EXISTS idx_drug_stock_drug ON drug_stock(drug_id);
CREATE INDEX IF NOT EXISTS idx_drug_stock_available ON drug_stock(is_available) WHERE is_available = TRUE AND is_in_stock = TRUE;

-- Seed some common drugs in Cameroon
INSERT INTO drugs (name, generic_name, category, form, unit, dosage, description, manufacturer, requires_prescription)
VALUES
    ('Paracetamol 500mg', 'Paracetamol', 'painkiller', 'tablet', 'mg', '500mg', 'Pain relief and fever reduction', 'Sanofi', FALSE),
    ('Ibuprofen 400mg', 'Ibuprofen', 'painkiller', 'tablet', 'mg', '400mg', 'Anti-inflammatory pain relief', 'Novartis', FALSE),
    ('Amoxicillin 500mg', 'Amoxicillin', 'antibiotic', 'capsule', 'mg', '500mg', 'Broad-spectrum antibiotic', 'GSK', TRUE),
    ('Artemether-Lumefantrine 20/120mg', 'Artemether-Lumefantrine', 'antimalarial', 'tablet', 'mg', '20/120mg', 'Malaria treatment (Coartem)', 'Novartis', TRUE),
    ('ORS Sachet', 'Oral Rehydration Salts', 'rehydration', 'powder', 'g', '4.2g', 'Rehydration for diarrhea', 'WHO/UNICEF', FALSE),
    ('Metformin 500mg', 'Metformin', 'antidiabetic', 'tablet', 'mg', '500mg', 'Type 2 diabetes medication', 'Merck', TRUE),
    ('Amlodipine 5mg', 'Amlodipine', 'cardiovascular', 'tablet', 'mg', '5mg', 'Hypertension treatment', 'Pfizer', TRUE),
    ('Vitamin C 500mg', 'Ascorbic Acid', 'vitamin', 'tablet', 'mg', '500mg', 'Immune support', 'Nature Made', FALSE),
    ('Cetirizine 10mg', 'Cetirizine', 'antihistamine', 'tablet', 'mg', '10mg', 'Allergy relief', 'UCB', FALSE),
    ('Chlorpheniramine 4mg', 'Chlorpheniramine', 'antihistamine', 'tablet', 'mg', '4mg', 'Cold and allergy symptoms', 'Various', FALSE)
ON CONFLICT DO NOTHING;
