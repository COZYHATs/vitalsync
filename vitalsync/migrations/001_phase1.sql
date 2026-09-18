CREATE TABLE users (
 id UUID PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
 role TEXT NOT NULL DEFAULT 'USER' CHECK (role IN ('USER','ADMIN')), created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE sessions (id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id), token_hash TEXT UNIQUE NOT NULL, expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE patients (id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id), display_name TEXT NOT NULL, date_of_birth DATE, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE INDEX patients_user_id_idx ON patients(user_id);
CREATE TABLE documents (
 id UUID PRIMARY KEY, patient_id UUID NOT NULL REFERENCES patients(id), original_filename TEXT NOT NULL, storage_key TEXT UNIQUE NOT NULL,
 mime_type TEXT NOT NULL, file_size BIGINT NOT NULL CHECK(file_size > 0), file_hash TEXT NOT NULL,
 document_type TEXT NOT NULL DEFAULT 'UNKNOWN' CHECK(document_type IN ('UNKNOWN','PRESCRIPTION','LAB_REPORT','SCAN','DISCHARGE_SUMMARY','DOCTOR_NOTE','OTHER')),
 processing_status TEXT NOT NULL DEFAULT 'READY' CHECK(processing_status IN ('UPLOADED','PROCESSING','READY','REVIEW_REQUIRED','FAILED','DELETION_REQUESTED','DELETED')),
 uploaded_by UUID NOT NULL REFERENCES users(id), deletion_requested_at TIMESTAMPTZ, deletion_requested_by UUID REFERENCES users(id), deletion_reason TEXT,
 deleted_at TIMESTAMPTZ, deleted_by UUID REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(patient_id,file_hash)
);
CREATE INDEX documents_patient_id_idx ON documents(patient_id);
CREATE TABLE deletion_requests (id UUID PRIMARY KEY, document_id UUID NOT NULL UNIQUE REFERENCES documents(id), requested_by UUID NOT NULL REFERENCES users(id), reason TEXT, status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','APPROVED','REJECTED')), reviewed_by UUID REFERENCES users(id), reviewed_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE audit_logs (id UUID PRIMARY KEY, user_id UUID REFERENCES users(id), action TEXT NOT NULL, resource_type TEXT NOT NULL, resource_id UUID, metadata JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
