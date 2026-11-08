PRAGMA foreign_keys = ON;

CREATE TABLE tickets (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 50),
  description TEXT NOT NULL CHECK (length(description) BETWEEN 1 AND 1000),
  status TEXT NOT NULL,
  pull_request_url TEXT NULL CHECK (pull_request_url IS NULL OR length(pull_request_url) BETWEEN 1 AND 200),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE feature_requests (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 50),
  description TEXT NOT NULL CHECK (length(description) BETWEEN 1 AND 1000),
  status TEXT NOT NULL,
  linked_ticket_id TEXT NULL REFERENCES tickets(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE po_logs (
  id TEXT PRIMARY KEY NOT NULL,
  message TEXT NOT NULL CHECK (length(message) BETWEEN 1 AND 3000),
  created_at TEXT NOT NULL
);

CREATE INDEX idx_feature_requests_status_created ON feature_requests(status, created_at, id);
CREATE INDEX idx_feature_requests_linked_ticket ON feature_requests(linked_ticket_id);
CREATE INDEX idx_tickets_status_created ON tickets(status, created_at, id);
CREATE INDEX idx_po_logs_created ON po_logs(created_at, id);
