-- =====================================================
-- CHARLA MEDICS V1.2 - ADVANCED FEATURES
-- 7 New Features
-- =====================================================

-- =====================================================
-- MEDICAL_CERTIFICATES TABLE (Feature 1: Medical certificates)
-- =====================================================
CREATE TABLE medical_certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    certificate_number VARCHAR(50) UNIQUE NOT NULL, -- CMC-2026-XXXXXX format
    
    patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    
    -- Certificate details
    diagnosis TEXT NOT NULL,
    recommendations TEXT,
    days_off INTEGER,
    
    start_date DATE NOT NULL,
    end_date DATE,
    
    -- Document
    certificate_url TEXT, -- PDF file path
    
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_certificates_patient ON medical_certificates(patient_id);
CREATE INDEX idx_certificates_doctor ON medical_certificates(doctor_id);
CREATE INDEX idx_certificates_number ON medical_certificates(certificate_number);
CREATE INDEX idx_certificates_status ON medical_certificates(status);

-- =====================================================
-- HOME_COLLECTIONS TABLE (Feature 2: Home sample collection)
-- =====================================================
CREATE TABLE home_collections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lab_test_id UUID REFERENCES lab_tests(id) ON DELETE SET NULL,
    
    -- Collection details
    collection_address TEXT NOT NULL,
    collection_date DATE NOT NULL,
    collection_time TIME NOT NULL,
    
    -- Phlebotomist assignment
    phlebotomist_id UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP,
    
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_transit', 'collected', 'completed', 'cancelled')),
    
    -- Tracking
    phlebotomist_arrived_at TIMESTAMP,
    sample_collected_at TIMESTAMP,
    
    -- Payment
    collection_fee DECIMAL(10,2) DEFAULT 15000.00,
    payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
    
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_home_collections_patient ON home_collections(patient_id);
CREATE INDEX idx_home_collections_phlebotomist ON home_collections(phlebotomist_id);
CREATE INDEX idx_home_collections_status ON home_collections(status);
CREATE INDEX idx_home_collections_date ON home_collections(collection_date);

-- =====================================================
-- PHLEBOTOMIST_APPLICATIONS TABLE (Feature 2: Gig economy)
-- =====================================================
CREATE TABLE phlebotomist_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Credentials
    certification_number VARCHAR(100) NOT NULL,
    certification_document_url TEXT,
    
    years_of_experience INTEGER,
    previous_employer TEXT,
    
    -- Availability
    availability_zones JSONB, -- Array of areas/regions
    working_hours JSONB, -- {monday: "9-17", ...}
    
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP,
    review_notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_phlebotomist_apps_user ON phlebotomist_applications(user_id);
CREATE INDEX idx_phlebotomist_apps_status ON phlebotomist_applications(status);

-- =====================================================
-- MEDICATION_SCHEDULES TABLE (Feature 3: Improved reminders)
-- =====================================================
CREATE TABLE medication_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    prescription_id UUID REFERENCES prescriptions(id) ON DELETE CASCADE,
    
    medication_name VARCHAR(255) NOT NULL,
    dosage VARCHAR(100) NOT NULL,
    
    -- Schedule
    frequency VARCHAR(50) NOT NULL, -- 'once_daily', 'twice_daily', 'three_times_daily', 'custom'
    times JSONB NOT NULL, -- Array of time strings ["08:00", "14:00", "20:00"]
    
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    
    -- Reminders
    reminder_enabled BOOLEAN DEFAULT true,
    reminder_method VARCHAR(50) DEFAULT 'sms' CHECK (reminder_method IN ('sms', 'email', 'push', 'all')),
    
    -- Adherence tracking
    total_doses INTEGER,
    taken_doses INTEGER DEFAULT 0,
    missed_doses INTEGER DEFAULT 0,
    adherence_percentage DECIMAL(5,2) DEFAULT 0.00,
    
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_medication_schedules_patient ON medication_schedules(patient_id);
CREATE INDEX idx_medication_schedules_status ON medication_schedules(status);
CREATE INDEX idx_medication_schedules_dates ON medication_schedules(start_date, end_date);

-- =====================================================
-- MEDICATION_DOSES TABLE (Feature 3: Dose tracking)
-- =====================================================
CREATE TABLE medication_doses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    schedule_id UUID NOT NULL REFERENCES medication_schedules(id) ON DELETE CASCADE,
    
    scheduled_time TIMESTAMP NOT NULL,
    taken_at TIMESTAMP,
    
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'taken', 'missed', 'skipped')),
    
    -- Reminder
    reminder_sent BOOLEAN DEFAULT false,
    reminder_sent_at TIMESTAMP,
    
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_medication_doses_schedule ON medication_doses(schedule_id);
CREATE INDEX idx_medication_doses_status ON medication_doses(status);
CREATE INDEX idx_medication_doses_scheduled_time ON medication_doses(scheduled_time);

-- =====================================================
-- FACILITY_LINKS TABLE (Feature 4: Professional-facility linking)
-- =====================================================
CREATE TABLE facility_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    professional_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- Doctor, nurse, etc.
    facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    
    -- Revenue split
    professional_percentage DECIMAL(5,2) DEFAULT 60.00,
    facility_percentage DECIMAL(5,2) DEFAULT 30.00,
    platform_percentage DECIMAL(5,2) DEFAULT 10.00,
    
    -- Status
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('pending', 'active', 'suspended', 'terminated')),
    
    start_date DATE NOT NULL,
    end_date DATE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_facility_links_professional ON facility_links(professional_id);
CREATE INDEX idx_facility_links_facility ON facility_links(facility_id);
CREATE INDEX idx_facility_links_status ON facility_links(status);

-- =====================================================
-- FACILITIES TABLE (Feature 4: Healthcare facilities)
-- =====================================================
CREATE TABLE facilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    name VARCHAR(255) NOT NULL,
    facility_type VARCHAR(100) CHECK (facility_type IN ('hospital', 'clinic', 'pharmacy', 'lab', 'imaging_center')),
    
    -- Location
    address TEXT NOT NULL,
    city VARCHAR(100),
    region VARCHAR(100),
    
    -- Contact
    phone VARCHAR(20),
    email VARCHAR(255),
    
    -- Registration
    registration_number VARCHAR(100) UNIQUE,
    
    -- Owner
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'closed')),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_facilities_type ON facilities(facility_type);
CREATE INDEX idx_facilities_region ON facilities(region);
CREATE INDEX idx_facilities_status ON facilities(status);

-- =====================================================
-- PAYMENT_TRANSACTIONS TABLE (Feature 5: Multi-provider payments)
-- =====================================================
CREATE TABLE payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Payment details
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'TZS',
    
    -- Provider (Selcom)
    provider VARCHAR(50) DEFAULT 'selcom',
    payment_method VARCHAR(50) CHECK (payment_method IN ('mpesa', 'tigopesa', 'airtelmoney', 'halopesa', 'tpesa')),
    
    -- Transaction tracking
    external_transaction_id VARCHAR(255), -- From Selcom
    internal_transaction_id VARCHAR(255) UNIQUE,
    
    -- Phone number used
    phone_number VARCHAR(20),
    
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded')),
    
    -- Related entity
    related_type VARCHAR(50), -- 'booking', 'home_collection', 'wallet_topup'
    related_id UUID,
    
    -- Webhook data
    webhook_data JSONB,
    
    -- Error handling
    error_code VARCHAR(50),
    error_message TEXT,
    
    completed_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payment_transactions_user ON payment_transactions(user_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX idx_payment_transactions_external_id ON payment_transactions(external_transaction_id);
CREATE INDEX idx_payment_transactions_internal_id ON payment_transactions(internal_transaction_id);

-- =====================================================
-- SMS_LOGS TABLE (Feature 6: SMS integration tracking)
-- =====================================================
CREATE TABLE sms_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    phone_number VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    
    -- SMS type
    sms_type VARCHAR(50) CHECK (sms_type IN ('reminder', 'booking', 'payment', 'notification', 'verification')),
    
    -- Provider (Africa's Talking)
    provider VARCHAR(50) DEFAULT 'africas_talking',
    external_message_id VARCHAR(255),
    
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
    
    cost DECIMAL(10,4), -- SMS cost in TZS
    
    error_message TEXT,
    
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sms_logs_user ON sms_logs(user_id);
CREATE INDEX idx_sms_logs_phone ON sms_logs(phone_number);
CREATE INDEX idx_sms_logs_status ON sms_logs(status);
CREATE INDEX idx_sms_logs_type ON sms_logs(sms_type);

-- =====================================================
-- USSD_SESSIONS TABLE (Feature 7: USSD framework)
-- =====================================================
CREATE TABLE ussd_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    session_id VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Session state
    current_menu VARCHAR(100),
    menu_history JSONB, -- Array of previous menus
    session_data JSONB, -- Store user inputs/state
    
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired', 'cancelled')),
    
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_interaction_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP
);

CREATE INDEX idx_ussd_sessions_session_id ON ussd_sessions(session_id);
CREATE INDEX idx_ussd_sessions_phone ON ussd_sessions(phone_number);
CREATE INDEX idx_ussd_sessions_status ON ussd_sessions(status);

-- =====================================================
-- Add triggers for updated_at
-- =====================================================
CREATE TRIGGER update_medical_certificates_updated_at BEFORE UPDATE ON medical_certificates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_home_collections_updated_at BEFORE UPDATE ON home_collections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_medication_schedules_updated_at BEFORE UPDATE ON medication_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_facility_links_updated_at BEFORE UPDATE ON facility_links
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_facilities_updated_at BEFORE UPDATE ON facilities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_transactions_updated_at BEFORE UPDATE ON payment_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- V1.2 ADVANCED FEATURES COMPLETE
-- New Tables: 10
-- (medical_certificates, home_collections, phlebotomist_applications,
--  medication_schedules, medication_doses, facility_links, facilities,
--  payment_transactions, sms_logs, ussd_sessions)
-- =====================================================
