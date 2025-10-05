-- Create the hospitals table
CREATE TABLE IF NOT EXISTS hospitals (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    latitude REAL,
    longitude REAL
);

-- Insert real NYC hospitals with addresses and GPS coordinates
INSERT OR REPLACE INTO hospitals (id, name, address, latitude, longitude) VALUES
    ('hosp1', 'NewYork-Presbyterian Hospital', '525 E 68th St, New York, NY 10065', 40.7648, -73.9536),
    ('hosp2', 'Mount Sinai Hospital', '1468 Madison Ave, New York, NY 10029', 40.7900, -73.9524),
    ('hosp3', 'NYU Langone Medical Center', '550 1st Ave, New York, NY 10016', 40.7420, -73.9740),
    ('hosp4', 'Bellevue Hospital', '462 1st Ave, New York, NY 10016', 40.7397, -73.9753),
    ('hosp5', 'Lenox Hill Hospital', '100 E 77th St, New York, NY 10075', 40.7736, -73.9608);
