-- ==============================================================================
-- DukaanAI Database Migration: User Joining Date & Automated Audit Tracing
-- Run this script in your Supabase SQL Editor (https://supabase.com/dashboard)
-- ==============================================================================

-- 1. users टेबल में joining_date, last_login_at और deleted_at कॉलम जोड़ें
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS joining_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- मौजूदा यूज़र्स का joining_date उनके created_at से बैकफ़िल कर दें (ताकि कोई नल न रहे)
UPDATE users 
SET joining_date = created_at 
WHERE joining_date IS NULL AND created_at IS NOT NULL;

-- 2. अकाउंट डिलीट होने पर ऑटोमैटिकली डेटाबेस लेवल पर ट्रैक करने के लिए Audit टेबल
CREATE TABLE IF NOT EXISTS deleted_users_audit (
    audit_id SERIAL PRIMARY KEY,
    user_id INT,
    name VARCHAR(100),
    email VARCHAR(150),
    phone VARCHAR(20),
    joining_date TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_by VARCHAR(50) DEFAULT 'user_action'
);

-- 3. PostgreSQL Database Trigger Function (शुद्ध डेटाबेस लेवल पर स्वचालित रूप से चलेगा)
CREATE OR REPLACE FUNCTION log_user_deletion()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO deleted_users_audit (
        user_id,
        name,
        email,
        phone,
        joining_date,
        last_login_at,
        deleted_at
    ) VALUES (
        OLD.id,
        OLD.name,
        OLD.email,
        OLD.phone,
        COALESCE(OLD.joining_date, OLD.created_at),
        OLD.last_login_at,
        CURRENT_TIMESTAMP
    );
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 4. ट्रिगर अटैच करें (जब भी users टेबल से कोई रो डिलीट होगी, ऑटोमैटिकली लॉग हो जाएगी)
DROP TRIGGER IF EXISTS trg_user_deletion_audit ON users;
CREATE TRIGGER trg_user_deletion_audit
BEFORE DELETE ON users
FOR EACH ROW
EXECUTE FUNCTION log_user_deletion();
