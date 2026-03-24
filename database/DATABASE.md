# CHARLA MEDICS - DATABASE DOCUMENTATION

**Version:** 1.2.0  
**Total Tables:** 24  
**Database:** PostgreSQL (Supabase)

---

## 📊 OVERVIEW

This database supports all 37 features across three versions:
- **V1.0:** 11 tables (22 features)
- **V1.1:** 3 tables (8 admin features)
- **V1.2:** 10 tables (7 new features)

---

## 🗄️ DATABASE STRUCTURE

### V1.0 TABLES (11)

#### 1. **users** - User Authentication & Profiles
**Purpose:** Core user management for patients, doctors, admin, and phlebotomists

**Key Columns:**
- `id` (UUID) - Primary key
- `email`, `password` - Authentication
- `full_name`, `phone` - Profile info
- `role` - User type (patient/doctor/admin/phlebotomist)
- `specialization`, `license_number` - Doctor-specific
- `is_verified`, `is_suspended` - Status flags
- `referral_code`, `referred_by` - Referral system

**Indexes:** email, role, referral_code

---

#### 2. **bookings** - Appointment Management
**Purpose:** Doctor appointments and consultations

**Key Columns:**
- `patient_id`, `doctor_id` - Participants
- `appointment_date`, `appointment_time` - Schedule
- `status` - pending/confirmed/completed/cancelled
- `consultation_notes`, `diagnosis` - Medical records
- `video_call_url` - Telemedicine link

**Indexes:** patient_id, doctor_id, date, status

---

#### 3. **wallets** - Digital Wallet
**Purpose:** User wallet balances

**Key Columns:**
- `user_id` - Wallet owner
- `balance` - Current balance (TZS)

**Indexes:** user_id (unique)

---

#### 4. **transactions** - Payment History
**Purpose:** All financial transactions

**Key Columns:**
- `user_id` - Transaction owner
- `transaction_type` - deposit/withdrawal/payment/refund
- `amount` - Transaction amount
- `status` - pending/completed/failed
- `payment_method`, `payment_reference` - Payment details
- `booking_id` - Related booking

**Indexes:** user_id, status, type

---

#### 5. **referrals** - Referral Tracking
**Purpose:** Friend referral program

**Key Columns:**
- `referrer_id` - User who referred
- `referred_id` - New user
- `referral_code` - Code used
- `bonus_amount`, `bonus_paid` - Reward tracking

**Indexes:** referrer_id, referred_id

---

#### 6. **prescriptions** - Medical Prescriptions
**Purpose:** Doctor-prescribed medications

**Key Columns:**
- `booking_id` - Related consultation
- `patient_id`, `doctor_id` - Participants
- `medications` (JSONB) - Array of medications with dosage
- `instructions` - Doctor's instructions

**Indexes:** patient_id, booking_id

---

#### 7. **lab_tests** - Laboratory Tests
**Purpose:** Lab test requests and results

**Key Columns:**
- `patient_id`, `doctor_id` - Participants
- `test_name`, `test_type` - Test details
- `status` - pending/sample_collected/processing/completed
- `results` (JSONB) - Test results
- `sample_collection_date` - Collection schedule

**Indexes:** patient_id, status

---

#### 8. **medical_history** - Health Records
**Purpose:** Patient medical history

**Key Columns:**
- `patient_id` - Record owner
- `condition_name` - Medical condition
- `diagnosis_date` - When diagnosed
- `status` - active/resolved/chronic
- `notes` - Additional details

**Indexes:** patient_id

---

#### 9. **notifications** - User Notifications
**Purpose:** Push and email notifications

**Key Columns:**
- `user_id` - Recipient
- `title`, `message` - Notification content
- `notification_type` - Category
- `is_read` - Read status

**Indexes:** user_id, is_read

---

#### 10. **files** - Document Storage
**Purpose:** Uploaded documents and images

**Key Columns:**
- `user_id` - File owner
- `file_name`, `file_path` - File location
- `related_type`, `related_id` - What it's attached to

**Indexes:** user_id, related (type, id)

---

#### 11. **reviews** - Doctor Ratings
**Purpose:** Patient reviews for doctors

**Key Columns:**
- `booking_id` - Related consultation
- `patient_id`, `doctor_id` - Participants
- `rating` - 1-5 stars
- `comment` - Review text

**Indexes:** doctor_id, patient_id

---

### V1.1 TABLES (3) - ADMIN FEATURES

#### 12. **admin_activity_logs** - Admin Actions
**Purpose:** Track all admin activities

**Key Columns:**
- `admin_id` - Admin who performed action
- `action` - What was done
- `details` (JSONB) - Action context
- `ip_address`, `user_agent` - Security tracking

**Indexes:** admin_id, action, created_at

---

#### 13. **flagged_content** - Content Moderation
**Purpose:** User-reported inappropriate content

**Key Columns:**
- `content_type` - review/message/profile
- `content_id` - What was flagged
- `flagged_by` - Reporter
- `status` - pending/reviewed/removed/dismissed
- `reviewed_by` - Admin who reviewed

**Indexes:** status, content_type

---

#### 14. **platform_settings** - System Configuration
**Purpose:** Platform-wide settings

**Key Columns:**
- `setting_key` - Unique setting name
- `setting_value` (JSONB) - Setting value
- `setting_type` - general/payment/notification
- `updated_by` - Last admin to update

**Default Settings:**
- consultation_fee: 10,000 TZS
- platform_commission: 10%
- referral_bonus: 5,000 TZS

**Indexes:** setting_key (unique)

---

### V1.2 TABLES (10) - NEW FEATURES

#### 15. **medical_certificates** - Medical Certificates
**Purpose:** Official medical certificates (CMC-2026-XXXXXX)

**Key Columns:**
- `certificate_number` - Unique identifier
- `patient_id`, `doctor_id` - Participants
- `diagnosis`, `recommendations` - Medical details
- `days_off` - Sick leave duration
- `start_date`, `end_date` - Validity period
- `certificate_url` - PDF location
- `status` - active/expired/revoked

**Indexes:** patient_id, doctor_id, certificate_number, status

---

#### 16. **home_collections** - Home Sample Collection
**Purpose:** Request phlebotomist to collect blood samples at home

**Key Columns:**
- `patient_id` - Requester
- `phlebotomist_id` - Assigned phlebotomist
- `collection_address` - Where to go
- `collection_date`, `collection_time` - Schedule
- `status` - pending/assigned/in_transit/collected/completed
- `collection_fee` - Fee (default 15,000 TZS)
- `payment_status` - pending/paid/refunded

**Indexes:** patient_id, phlebotomist_id, status, date

---

#### 17. **phlebotomist_applications** - Gig Worker Applications
**Purpose:** Manage phlebotomist applications

**Key Columns:**
- `user_id` - Applicant
- `certification_number` - Credentials
- `availability_zones` (JSONB) - Service areas
- `working_hours` (JSONB) - Availability schedule
- `status` - pending/approved/rejected
- `reviewed_by` - Admin who reviewed

**Indexes:** user_id, status

---

#### 18. **medication_schedules** - Medication Reminders
**Purpose:** Track medication schedules for adherence

**Key Columns:**
- `patient_id` - Patient
- `medication_name`, `dosage` - Medication details
- `frequency` - How often to take
- `times` (JSONB) - Exact times (e.g., ["08:00", "14:00", "20:00"])
- `start_date`, `end_date` - Schedule period
- `reminder_enabled`, `reminder_method` - Notification settings
- `adherence_percentage` - Compliance tracking
- `status` - active/completed/cancelled

**Indexes:** patient_id, status, dates

---

#### 19. **medication_doses** - Individual Dose Tracking
**Purpose:** Track each individual medication dose

**Key Columns:**
- `schedule_id` - Related schedule
- `scheduled_time` - When to take
- `taken_at` - When actually taken
- `status` - pending/taken/missed/skipped
- `reminder_sent` - SMS sent flag

**Indexes:** schedule_id, status, scheduled_time

---

#### 20. **facilities** - Healthcare Facilities
**Purpose:** Hospitals, clinics, labs, pharmacies

**Key Columns:**
- `name` - Facility name
- `facility_type` - hospital/clinic/pharmacy/lab
- `address`, `city`, `region` - Location
- `registration_number` - Official registration
- `owner_id` - Facility owner
- `status` - active/suspended/closed

**Indexes:** facility_type, region, status

---

#### 21. **facility_links** - Professional-Facility Connections
**Purpose:** Link doctors to facilities with revenue splits

**Key Columns:**
- `professional_id` - Doctor/nurse
- `facility_id` - Healthcare facility
- `professional_percentage` - Doctor's share (default 60%)
- `facility_percentage` - Facility's share (default 30%)
- `platform_percentage` - Platform's share (default 10%)
- `status` - pending/active/suspended/terminated

**Indexes:** professional_id, facility_id, status

---

#### 22. **payment_transactions** - Multi-Provider Payments
**Purpose:** Selcom payment tracking (M-PESA, TigoPesa, Airtel, Halo, T-Pesa)

**Key Columns:**
- `user_id` - Payer
- `amount`, `currency` - Payment amount
- `provider` - selcom
- `payment_method` - mpesa/tigopesa/airtelmoney/halopesa/tpesa
- `external_transaction_id` - Selcom transaction ID
- `internal_transaction_id` - Our reference
- `phone_number` - Mobile money number
- `status` - pending/processing/completed/failed
- `webhook_data` (JSONB) - Selcom webhook response

**Indexes:** user_id, status, external_id, internal_id

---

#### 23. **sms_logs** - SMS Tracking
**Purpose:** Track all SMS sent via Africa's Talking

**Key Columns:**
- `user_id` - Recipient user
- `phone_number` - Phone number
- `message` - SMS content
- `sms_type` - reminder/booking/payment/notification
- `provider` - africas_talking
- `status` - pending/sent/delivered/failed
- `cost` - SMS cost
- `sent_at`, `delivered_at` - Timestamps

**Indexes:** user_id, phone, status, type

---

#### 24. **ussd_sessions** - USSD Framework
**Purpose:** Track USSD sessions (*127*12#)

**Key Columns:**
- `session_id` - Unique session
- `phone_number` - User's phone
- `user_id` - Linked user (if registered)
- `current_menu` - Current menu state
- `menu_history` (JSONB) - Navigation history
- `session_data` (JSONB) - User inputs
- `status` - active/completed/expired
- `last_interaction_at` - Activity tracking

**Indexes:** session_id, phone, status

---

## 🔗 KEY RELATIONSHIPS

### User Relationships
```
users
├── bookings (as patient or doctor)
├── prescriptions (as patient or doctor)
├── medical_certificates (as patient or doctor)
├── medication_schedules (as patient)
├── home_collections (as patient or phlebotomist)
├── facility_links (as professional)
├── wallets (one-to-one)
└── transactions
```

### Booking Flow
```
booking
├── prescription
├── lab_test
├── medical_certificate
├── review
└── transaction (payment)
```

### Home Collection Flow
```
lab_test
└── home_collection
    ├── phlebotomist (assigned user)
    └── payment_transaction
```

### Medication Tracking Flow
```
prescription
└── medication_schedule
    └── medication_doses (multiple)
```

---

## 📋 TABLE SUMMARY

| Version | Tables | Features |
|---------|--------|----------|
| V1.0 | 11 | 22 core features |
| V1.1 | 3 | 8 admin features |
| V1.2 | 10 | 7 advanced features |
| **TOTAL** | **24** | **37 features** |

---

## 🚀 SETUP INSTRUCTIONS

### Option 1: Complete Schema (Fresh Install)
```sql
-- Run complete schema
\i database/schema.sql
```

### Option 2: Migrations (Existing Database)
```sql
-- Run migrations in order
\i database/migrations/001_v1.0_initial.sql
\i database/migrations/002_v1.1_admin.sql
\i database/migrations/003_v1.2_features.sql
```

### Option 3: Supabase Dashboard
1. Go to Supabase SQL Editor
2. Copy content from `schema.sql`
3. Run query
4. Verify tables created

---

## 🔐 SECURITY FEATURES

- UUID primary keys (not sequential integers)
- Foreign key constraints with CASCADE/SET NULL
- CHECK constraints on enums
- Indexes on frequently queried columns
- Automatic updated_at triggers
- Password hashing (handled in application)

---

## 📊 PERFORMANCE OPTIMIZATIONS

### Indexes Created (35+)
- User lookups: email, role, referral_code
- Booking queries: patient, doctor, date, status
- Transaction tracking: user, status, type
- Time-based queries: dates, timestamps
- Search: facility regions, SMS phone numbers

### JSONB Fields
- Medications in prescriptions
- Test results in lab_tests
- Settings in platform_settings
- Webhook data in payment_transactions
- Session data in USSD

---

## 🔄 TRIGGERS

Auto-update `updated_at` timestamp on:
- users
- bookings
- wallets
- medical_certificates
- home_collections
- medication_schedules
- facility_links
- facilities
- payment_transactions
- platform_settings

---

## 💡 USAGE TIPS

1. **Always use transactions** for multi-table operations
2. **JSONB fields** - use `->>` for text, `->` for JSON
3. **Cascade deletes** - user deletion removes related records
4. **Soft deletes** - use status fields instead of DELETE
5. **Adherence tracking** - auto-calculated in medication_schedules

---

## 📞 SUPPORT

- **Supabase URL:** wmuwiidzauwbfqhdvxss.supabase.co
- **Connection String:** See .env file
- **Migrations Location:** database/migrations/
- **Complete Schema:** database/schema.sql

---

**Database Version:** 1.2.0  
**Last Updated:** March 22, 2026  
**Total Schema Lines:** 756
