-- Create the medications table with hospital_id
CREATE TABLE IF NOT EXISTS medications (
    id TEXT PRIMARY KEY,
    hospital_id TEXT,
    name TEXT NOT NULL,
    type TEXT,
    dosage TEXT,
    usage TEXT,
    stock_quantity INTEGER,
    expiration_date DATE,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
);

-- Insert sample medication data for car accident scenarios, varying by hospital
INSERT OR REPLACE INTO medications (id, hospital_id, name, type, dosage, usage, stock_quantity, expiration_date) VALUES
    ('med1', 'hosp1', 'Morphine', 'Painkiller', '5-10mg IV', 'For severe pain in trauma patients', 60, '2026-06-30'),
    ('med2', 'hosp1', 'Tranexamic Acid', 'Hemostatic', '1g IV over 10 min', 'To reduce bleeding in hemorrhagic shock', 80, '2025-12-31'),
    ('med3', 'hosp2', 'Cefazolin', 'Antibiotic', '2g IV', 'Prophylaxis for open fractures', 50, '2026-03-15'),
    ('med4', 'hosp2', 'Epinephrine', 'Vasopressor', '1mg IV', 'For anaphylaxis or shock in trauma', 30, '2025-11-20'),
    ('med5', 'hosp3', 'Ketamine', 'Anesthetic', '1-2mg/kg IV', 'For rapid induction in emergency surgery', 40, '2026-01-10'),
    ('med6', 'hosp3', 'Fentanyl', 'Painkiller', '50-100mcg IV', 'For acute pain management in multi-trauma', 55, '2025-10-05'),
    ('med7', 'hosp4', 'Propofol', 'Sedative', '1-2mg/kg IV', 'For intubation in critical patients', 25, '2026-04-25'),
    ('med8', 'hosp4', 'Vancomycin', 'Antibiotic', '15mg/kg IV', 'For suspected MRSA in open wounds', 20, '2025-09-30'),
    ('med9', 'hosp5', 'Lidocaine', 'Local Anesthetic', '1-2mg/kg IV', 'For arrhythmia or local anesthesia', 70, '2026-02-28'),
    ('med10', 'hosp5', 'Diazepam', 'Sedative', '5-10mg IV', 'For seizures or agitation in head injury', 35, '2025-08-15');
