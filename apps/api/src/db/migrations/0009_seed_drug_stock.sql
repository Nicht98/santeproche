-- Migration 0009: Seed drug stock at facilities

-- Seed stock at known facilities for seeded drugs
-- Uses subqueries so it works even with random UUIDs

INSERT INTO drug_stock (facility_id, drug_id, quantity, price_xaf, is_available, is_in_stock, location_in_store)
SELECT 
    f.id as facility_id,
    d.id as drug_id,
    (10 + floor(random() * 90))::int as quantity,
    CASE d.category
        WHEN 'painkiller' THEN 500
        WHEN 'antibiotic' THEN 2000
        WHEN 'antimalarial' THEN 3000
        WHEN 'antidiabetic' THEN 2500
        WHEN 'cardiovascular' THEN 3500
        WHEN 'vitamin' THEN 1500
        WHEN 'antihistamine' THEN 1000
        WHEN 'rehydration' THEN 200
        ELSE 500
    END as price_xaf,
    true, true,
    'Shelf A' || (floor(random() * 5) + 1)::int
FROM facilities f
CROSS JOIN drugs d
WHERE f.kind = 'pharmacy'
    AND d.name IN ('Paracetamol 500mg', 'Ibuprofen 400mg', 'ORS Sachet', 'Vitamin C 500mg', 'Cetirizine 10mg', 'Chlorpheniramine 4mg')
ON CONFLICT (facility_id, drug_id) DO NOTHING;

-- Also seed some prescription drugs at pharmacies (fewer stock)
INSERT INTO drug_stock (facility_id, drug_id, quantity, price_xaf, is_available, is_in_stock, location_in_store)
SELECT 
    f.id as facility_id,
    d.id as drug_id,
    (5 + floor(random() * 20))::int as quantity,
    CASE d.name
        WHEN 'Amoxicillin 500mg' THEN 3500
        WHEN 'Artemether-Lumefantrine 20/120mg' THEN 5000
        WHEN 'Metformin 500mg' THEN 4000
        WHEN 'Amlodipine 5mg' THEN 4500
        ELSE 2000
    END as price_xaf,
    true, true,
    'Prescription Counter'
FROM facilities f
CROSS JOIN drugs d
WHERE f.kind = 'pharmacy'
    AND d.requires_prescription = true
ON CONFLICT (facility_id, drug_id) DO NOTHING;

-- Add some hospital stock as well (including injections and broader range)
INSERT INTO drug_stock (facility_id, drug_id, quantity, price_xaf, is_available, is_in_stock, location_in_store)
SELECT 
    f.id as facility_id,
    d.id as drug_id,
    (20 + floor(random() * 80))::int as quantity,
    CASE d.category
        WHEN 'painkiller' THEN 500
        WHEN 'antibiotic' THEN 2000
        WHEN 'antimalarial' THEN 3000
        WHEN 'antidiabetic' THEN 2500
        WHEN 'cardiovascular' THEN 3500
        WHEN 'vitamin' THEN 1500
        WHEN 'antihistamine' THEN 1000
        WHEN 'rehydration' THEN 200
        ELSE 500
    END + (floor(random() * 200))::int as price_xaf,
    true, true,
    'Pharmacy Block B'
FROM facilities f
CROSS JOIN drugs d
WHERE f.kind IN ('hospital', 'clinic')
ON CONFLICT (facility_id, drug_id) DO NOTHING;
