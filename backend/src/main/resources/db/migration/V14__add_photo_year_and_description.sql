-- V14__add_photo_year_and_description.sql
ALTER TABLE person_photos
ADD COLUMN photo_year INTEGER,
ADD COLUMN description TEXT;
