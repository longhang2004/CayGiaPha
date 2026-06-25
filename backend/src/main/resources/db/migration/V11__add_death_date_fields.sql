-- V11: Add death date fields to persons and create in_app_reminders table for Ngày Giỗ alerts.

ALTER TABLE persons ADD COLUMN death_day INTEGER;
ALTER TABLE persons ADD COLUMN death_month INTEGER;
ALTER TABLE persons ADD COLUMN death_year INTEGER;
ALTER TABLE persons ADD COLUMN death_calendar VARCHAR(10) DEFAULT 'lunar';
ALTER TABLE persons ADD COLUMN death_lunar_leap BOOLEAN DEFAULT false;

-- Add constraints for valid dates and calendars
ALTER TABLE persons ADD CONSTRAINT chk_persons_death_day CHECK (death_day IS NULL OR (death_day >= 1 AND death_day <= 31));
ALTER TABLE persons ADD CONSTRAINT chk_persons_death_month CHECK (death_month IS NULL OR (death_month >= 1 AND death_month <= 12));
ALTER TABLE persons ADD CONSTRAINT chk_persons_death_year CHECK (death_year IS NULL OR (death_year >= 1000));
ALTER TABLE persons ADD CONSTRAINT chk_persons_death_calendar CHECK (death_calendar IS NULL OR (death_calendar IN ('solar', 'lunar')));

-- Create the in_app_reminders table
CREATE TABLE in_app_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    days_until INTEGER NOT NULL,
    anniversary_date DATE NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT uq_user_person_anniversary_days UNIQUE (user_id, person_id, anniversary_date, days_until)
);

CREATE INDEX idx_in_app_reminders_user_id ON in_app_reminders(user_id);
