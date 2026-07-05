ALTER TABLE feedback_messages
    ADD COLUMN IF NOT EXISTS attachment_keys TEXT;
