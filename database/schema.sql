-- =====================================================
-- CHARLA MEDICS V1.0 - INITIAL DATABASE SCHEMA
-- 22 Core Features
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- USERS TABLE (Core authentication & profiles)
-- =====================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(50) DEFAULT 'patient' CHECK (role IN ('patient', 'doctor', 'admin', 'phlebotomist')),
    
    -- Doctor-specific fields
    specialization VARCHAR(255),
    license_number VARCHAR(100),
    bio TEXT,
    rating DECIMAL(3,2) DEFAULT 0.00,
    
    -- Status fields
    is_verified BOOLEAN DEFAULT false,
    is_suspended BOOLEAN DEFAULT false,
    
    -- Referral
    referral_code VARCHAR(20) UNIQUE,
    referred_by UUID REFERENCES users(id),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_referral_code ON users(referral_code);

-- =====================================================
-- BOOKINGS TABLE (Appointments)
-- =====================================================
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    
    reason TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
    
    -- Consultation details
    consultation_notes TEXT,
    diagnosis TEXT,
    
    -- Video call
    video_call_url TEXT,
    video_call_started_at TIMESTAMP,
    video_call_ended_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bookings_patient ON bookings(patient_id);
CREATE INDEX idx_bookings_doctor ON bookings(doctor_id);
CREATE INDEX idx_bookings_date ON bookings(appointment_date);
CREATE INDEX idx_bookings_status ON bookings(status);

-- =====================================================
-- WALLETS TABLE (Digital wallet)
-- =====================================================
CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    balance DECIMAL(10,2) DEFAULT 0.00,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_wallets_user ON wallets(user_id);

-- =====================================================
-- TRANSACTIONS TABLE (Payment history)
-- =====================================================
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal', 'payment', 'refund', 'referral_bonus')),
    amount DECIMAL(10,2) NOT NULL,
    
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    
    -- Payment method
    payment_method VARCHAR(50),
    payment_reference VARCHAR(255),
    
    -- Related entities
    booking_id UUID REFERENCES bookings(id),
    
    description TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_type ON transactions(transaction_type);

-- =====================================================
-- REFERRALS TABLE (Referral tracking)
-- =====================================================
CREATE TABLE referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referred_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    referral_code VARCHAR(20) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
    
    bonus_amount DECIMAL(10,2) DEFAULT 0.00,
    bonus_paid BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX idx_referrals_referred ON referrals(referred_id);

-- =====================================================
-- PRESCRIPTIONS TABLE (Doctor prescriptions)
-- =====================================================
CREATE TABLE prescriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    medications JSONB NOT NULL, -- Array of {name, dosage, frequency, duration}
    instructions TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX idx_prescriptions_booking ON prescriptions(booking_id);

-- =====================================================
-- LAB_TESTS TABLE (Lab test requests)
-- =====================================================
CREATE TABLE lab_tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    test_name VARCHAR(255) NOT NULL,
    test_type VARCHAR(100),
    
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'sample_collected', 'processing', 'completed', 'cancelled')),
    
    -- Results
    results JSONB,
    results_uploaded_at TIMESTAMP,
    
    -- Sample collection
    sample_collection_date DATE,
    sample_collection_time TIME,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_lab_tests_patient ON lab_tests(patient_id);
CREATE INDEX idx_lab_tests_status ON lab_tests(status);

-- =====================================================
-- MEDICAL_HISTORY TABLE (Patient health records)
-- =====================================================
CREATE TABLE medical_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    condition_name VARCHAR(255) NOT NULL,
    diagnosis_date DATE,
    
    status VARCHAR(50) CHECK (status IN ('active', 'resolved', 'chronic')),
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_medical_history_patient ON medical_history(patient_id);

-- =====================================================
-- NOTIFICATIONS TABLE (Push & email notifications)
-- =====================================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(50) CHECK (notification_type IN ('booking', 'payment', 'prescription', 'lab_result', 'reminder', 'general')),
    
    is_read BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);

-- =====================================================
-- FILES TABLE (Document uploads)
-- =====================================================
CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_type VARCHAR(100),
    file_size INTEGER,
    
    -- Related entity
    related_type VARCHAR(50), -- 'booking', 'prescription', 'lab_test', 'profile'
    related_id UUID,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_files_user ON files(user_id);
CREATE INDEX idx_files_related ON files(related_type, related_id);

-- =====================================================
-- REVIEWS TABLE (Doctor ratings & reviews)
-- =====================================================
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reviews_doctor ON reviews(doctor_id);
CREATE INDEX idx_reviews_patient ON reviews(patient_id);

-- =====================================================
-- TRIGGER: Update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON wallets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- V1.0 SCHEMA COMPLETE
-- Total Tables: 11
-- =====================================================

-- =====================================================
-- V1.1 ADMIN FEATURES
-- =====================================================

-- =====================================================
-- CHARLA MEDICS V1.1 - ADMIN DASHBOARD FEATURES
-- 8 Admin Features
-- =====================================================

-- =====================================================
-- ADMIN_ACTIVITY_LOGS TABLE (Feature 8: Activity tracking)
-- =====================================================
CREATE TABLE admin_activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    action VARCHAR(255) NOT NULL, -- 'user_suspended', 'doctor_approved', 'settings_updated', etc.
    details JSONB, -- Additional context about the action
    
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_admin_logs_admin ON admin_activity_logs(admin_id);
CREATE INDEX idx_admin_logs_action ON admin_activity_logs(action);
CREATE INDEX idx_admin_logs_created ON admin_activity_logs(created_at);

-- =====================================================
-- FLAGGED_CONTENT TABLE (Feature 5: Content moderation)
-- =====================================================
CREATE TABLE flagged_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('review', 'message', 'profile', 'booking_note')),
    content_id UUID NOT NULL,
    
    flagged_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'removed', 'dismissed')),
    
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP,
    review_notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_flagged_content_status ON flagged_content(status);
CREATE INDEX idx_flagged_content_type ON flagged_content(content_type);

-- =====================================================
-- PLATFORM_SETTINGS TABLE (Feature 7: Platform settings)
-- =====================================================
CREATE TABLE platform_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    setting_type VARCHAR(50) CHECK (setting_type IN ('general', 'payment', 'notification', 'feature_flag')),
    
    description TEXT,
    
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_platform_settings_key ON platform_settings(setting_key);
CREATE TRIGGER update_platform_settings_updated_at BEFORE UPDATE ON platform_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Insert default platform settings
-- =====================================================
INSERT INTO platform_settings (setting_key, setting_value, setting_type, description) VALUES
('consultation_fee', '{"amount": 10000, "currency": "TZS"}', 'payment', 'Default consultation fee'),
('platform_commission', '{"percentage": 10}', 'payment', 'Platform commission percentage'),
('booking_window_days', '{"days": 30}', 'general', 'How many days ahead can bookings be made'),
('sms_notifications', '{"enabled": true}', 'notification', 'Enable SMS notifications'),
('email_notifications', '{"enabled": true}', 'notification', 'Enable email notifications'),
('referral_bonus', '{"amount": 5000, "currency": "TZS"}', 'payment', 'Referral bonus amount'),
('doctor_auto_approval', '{"enabled": false}', 'general', 'Auto-approve doctor registrations'),
('maintenance_mode', '{"enabled": false}', 'general', 'Platform maintenance mode');

-- =====================================================
-- V1.1 ADMIN FEATURES COMPLETE
-- New Tables: 3 (admin_activity_logs, flagged_content, platform_settings)
-- Note: Features 1-4 and 6 use existing tables from V1.0
-- =====================================================

-- =====================================================
-- V1.2 ADVANCED FEATURES
-- =====================================================

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
