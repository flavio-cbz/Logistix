-- Migration: Add captcha solver tables
-- Description: Adds tables for captcha solving, training data, and model metrics
-- Date: 2025-11-13

-- Captcha attempts table
CREATE TABLE IF NOT EXISTS captcha_attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  image_url TEXT NOT NULL,
  puzzle_piece_url TEXT,
  detected_position REAL NOT NULL,
  actual_position REAL,
  confidence REAL NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending', 'success', 'failure')),
  attempted_at TEXT NOT NULL,
  solved_at TEXT,
  error_message TEXT,
  metadata TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS captcha_attempts_user_idx ON captcha_attempts(user_id);
CREATE INDEX IF NOT EXISTS captcha_attempts_status_idx ON captcha_attempts(status);
CREATE INDEX IF NOT EXISTS captcha_attempts_attempted_at_idx ON captcha_attempts(attempted_at);

-- Training data table
CREATE TABLE IF NOT EXISTS training_data (
  id TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL,
  image_url TEXT NOT NULL,
  puzzle_piece_url TEXT,
  gap_position REAL NOT NULL,
  annotation_source TEXT NOT NULL CHECK(annotation_source IN ('manual', 'automatic', 'validated')),
  annotated_by TEXT,
  annotated_at TEXT NOT NULL,
  is_validated INTEGER NOT NULL DEFAULT 0,
  metadata TEXT,
  FOREIGN KEY (attempt_id) REFERENCES captcha_attempts(id)
);

CREATE INDEX IF NOT EXISTS training_data_attempt_idx ON training_data(attempt_id);
CREATE INDEX IF NOT EXISTS training_data_validated_idx ON training_data(is_validated);
CREATE INDEX IF NOT EXISTS training_data_source_idx ON training_data(annotation_source);

-- Model metrics table
CREATE TABLE IF NOT EXISTS model_metrics (
  id TEXT PRIMARY KEY,
  model_version TEXT NOT NULL,
  success_rate REAL NOT NULL,
  average_confidence REAL NOT NULL,
  average_error REAL NOT NULL,
  total_attempts INTEGER NOT NULL,
  successful_attempts INTEGER NOT NULL,
  recorded_at TEXT NOT NULL,
  metadata TEXT
);

CREATE INDEX IF NOT EXISTS model_metrics_version_idx ON model_metrics(model_version);
CREATE INDEX IF NOT EXISTS model_metrics_recorded_at_idx ON model_metrics(recorded_at);
