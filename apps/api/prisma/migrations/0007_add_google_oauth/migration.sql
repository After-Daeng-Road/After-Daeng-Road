-- 댕로드 — Google OAuth provider 추가 (PRD §10.1, §14, §21.1 / v1.0.6)
-- 카카오·네이버에 이어 3번째 OAuth provider — users.google_id 컬럼 + 유니크 인덱스

ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS users_google_id_key ON users (google_id);

COMMENT ON COLUMN users.google_id IS 'Google OAuth provider ID (PRD §10.1, v1.0.6)';
