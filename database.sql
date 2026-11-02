CREATE DATABASE IF NOT EXISTS campus_directory
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE campus_directory;

CREATE TABLE IF NOT EXISTS departments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  head VARCHAR(120) NOT NULL,
  location VARCHAR(120) NOT NULL,
  staff_count INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(80) NOT NULL,
  last_name VARCHAR(80) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO departments (name, head, location, staff_count) VALUES
  ('Computer Science', 'Dr. Maya Patel', 'Innovation Hall', 42),
  ('Business Administration', 'Prof. Marcus Lee', 'Commerce Building', 35),
  ('Design & Media', 'Dr. Sofia Rivera', 'Arts Quarter', 28),
  ('Environmental Studies', 'Dr. Elias Green', 'North Campus', 19)
ON DUPLICATE KEY UPDATE name = VALUES(name);
