-- Flyway migration to add optional phone and email columns to the persons table.
ALTER TABLE persons ADD COLUMN phone TEXT;
ALTER TABLE persons ADD COLUMN email TEXT;
