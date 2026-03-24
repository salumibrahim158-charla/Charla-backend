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
