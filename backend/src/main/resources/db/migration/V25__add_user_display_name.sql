ALTER TABLE users
    ADD COLUMN display_name TEXT;

ALTER TABLE users
    ADD CONSTRAINT ck_users_display_name_normalized
    CHECK (
        display_name IS NULL
        OR (
            char_length(display_name) BETWEEN 1 AND 100
            AND display_name !~ '[[:cntrl:]]'
            AND display_name = regexp_replace(btrim(display_name), '[[:space:]]+', ' ', 'g')
        )
    );
