-- Create the blood_plasma table with hospital_id
CREATE TABLE IF NOT EXISTS blood_plasma (
    id TEXT PRIMARY KEY,
    hospital_id TEXT,
    blood_type TEXT NOT NULL,
    volume INTEGER,
    usage TEXT,
    stock_quantity INTEGER,
    expiration_date DATE,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
);

-- Insert sample blood plasma data, varying by hospital
INSERT OR REPLACE INTO blood_plasma (id, hospital_id, blood_type, volume, usage, stock_quantity, expiration_date) VALUES
    ('plasma1', 'hosp1', 'O-', 500, 'Universal donor for emergency transfusion', 25, '2025-10-20'),
    ('plasma2', 'hosp1', 'A+', 500, 'For A+ patients in hemorrhagic shock', 20, '2025-11-15'),
    ('plasma3', 'hosp2', 'O-', 500, 'Universal donor for emergency transfusion', 15, '2025-10-30'),
    ('plasma4', 'hosp2', 'B+', 500, 'For B+ patients with internal bleeding', 10, '2025-11-05'),
    ('plasma5', 'hosp3', 'O+', 500, 'Common donor for positive blood types', 30, '2025-10-25'),
    ('plasma6', 'hosp3', 'A-', 500, 'For A- patients requiring transfusion', 12, '2025-11-10'),
    ('plasma7', 'hosp4', 'O-', 500, 'Universal donor for emergency transfusion', 8, '2025-10-28'),
    ('plasma8', 'hosp4', 'AB+', 500, 'Universal plasma recipient for multi-trauma', 5, '2025-11-02'),
    ('plasma9', 'hosp5', 'Fresh Frozen Plasma (FFP)', 250, 'For coagulation support in massive bleeding', 15, '2025-10-18'),
    ('plasma10', 'hosp5', 'Cryoprecipitate', 100, 'For fibrinogen replacement in hemorrhagic shock', 10, '2025-11-08');
