-- ============================================================
-- Automotive Service Platform – Database Init Script
-- Runs automatically when PostgreSQL container starts fresh
-- ============================================================

-- ── Extensions ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For LIKE optimization

-- ── Used Cars ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS used_cars (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand       VARCHAR(100) NOT NULL,
    model       VARCHAR(200) NOT NULL,
    year        SMALLINT NOT NULL CHECK (year BETWEEN 1990 AND 2030),
    price       NUMERIC(15,0) NOT NULL CHECK (price >= 0),
    mileage     INTEGER CHECK (mileage >= 0),
    color       VARCHAR(50),
    fuel_type   VARCHAR(30) DEFAULT 'gasoline',  -- gasoline, diesel, electric, hybrid
    transmission VARCHAR(20) DEFAULT 'automatic', -- automatic, manual, cvt
    body_type   VARCHAR(30),                      -- sedan, suv, hatchback, truck, van
    location    VARCHAR(200),
    description TEXT,
    images      TEXT[],                           -- Array of image URLs
    seller_id   UUID,
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_used_cars_brand   ON used_cars(LOWER(brand));
CREATE INDEX IF NOT EXISTS idx_used_cars_price   ON used_cars(price);
CREATE INDEX IF NOT EXISTS idx_used_cars_year    ON used_cars(year);
CREATE INDEX IF NOT EXISTS idx_used_cars_active  ON used_cars(is_active);

-- ── Garages ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS garages (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(200) NOT NULL,
    address     TEXT NOT NULL,
    city        VARCHAR(100) NOT NULL DEFAULT 'Hà Nội',
    phone       VARCHAR(20),
    email       VARCHAR(200),
    rating      NUMERIC(2,1) DEFAULT 5.0 CHECK (rating BETWEEN 0 AND 5),
    services    TEXT[],
    open_time   TIME DEFAULT '08:00',
    close_time  TIME DEFAULT '18:00',
    slot_duration_minutes INTEGER DEFAULT 60,
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Bookings ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    garage_id       UUID NOT NULL REFERENCES garages(id),
    booking_date    DATE NOT NULL,
    time_slot       TIME NOT NULL,
    service_type    VARCHAR(100) NOT NULL,
    customer_name   VARCHAR(200) NOT NULL,
    phone           VARCHAR(20) NOT NULL,
    notes           TEXT,
    status          VARCHAR(20) DEFAULT 'confirmed'
                    CHECK (status IN ('confirmed', 'cancelled', 'completed', 'no_show')),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (garage_id, booking_date, time_slot)
);

CREATE INDEX IF NOT EXISTS idx_bookings_garage_date ON bookings(garage_id, booking_date);

-- ── Damage Reports ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS damage_reports (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id      VARCHAR(100),
    image_url       TEXT,
    overall_severity VARCHAR(20),
    num_detections  INTEGER,
    damages_json    JSONB,         -- Full detection payload
    processing_ms   NUMERIC(8,2),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Seed Data ────────────────────────────────────────────────

-- Sample garages
INSERT INTO garages (id, name, address, city, phone, services)
VALUES
  ('11111111-1111-1111-1111-111111111111',
   'AutoCare Garage Hà Nội', '123 Nguyễn Trãi, Thanh Xuân', 'Hà Nội',
   '024-1234-5678', ARRAY['oil_change','tire_rotation','full_inspection','brake_service']),
  ('22222222-2222-2222-2222-222222222222',
   'Minh Tuấn Auto', '456 Lê Văn Lương, Cầu Giấy', 'Hà Nội',
   '024-8765-4321', ARRAY['oil_change','ac_service','full_inspection','glass_repair'])
ON CONFLICT DO NOTHING;

-- Sample used cars
INSERT INTO used_cars (brand, model, year, price, mileage, color, location, fuel_type, transmission)
VALUES
  ('Toyota', 'Camry 2.5Q', 2022, 1180000000, 25000, 'Trắng ngọc trai', 'Hà Nội', 'gasoline', 'automatic'),
  ('Honda',  'CR-V 1.5L', 2021, 920000000, 38000, 'Xanh titan', 'TP.HCM', 'gasoline', 'automatic'),
  ('Hyundai','Tucson 2.0', 2020, 790000000, 52000, 'Đỏ garnet', 'Hà Nội', 'gasoline', 'automatic'),
  ('Mazda',  'CX-5 2.0', 2023, 850000000, 12000, 'Trắng ngọc', 'Đà Nẵng', 'gasoline', 'automatic'),
  ('Ford',   'Ranger XLS', 2021, 720000000, 65000, 'Xanh navy', 'TP.HCM', 'diesel', 'automatic'),
  ('Kia',    'Sorento 2.2', 2022, 1050000000, 30000, 'Đen bóng', 'Hà Nội', 'diesel', 'automatic'),
  ('VinFast','VF8 Plus', 2023, 1200000000, 8000, 'Trắng', 'Hà Nội', 'electric', 'automatic'),
  ('Toyota', 'Fortuner 2.7', 2020, 1050000000, 55000, 'Bạc', 'TP.HCM', 'gasoline', 'automatic')
ON CONFLICT DO NOTHING;

