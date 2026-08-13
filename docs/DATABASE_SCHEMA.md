# TOLOG ONE - Database Schema

**Version:** 1.0  
**Date:** 2026-08-13  
**Database:** PostgreSQL 15+

---

## Overview

This document defines the complete database schema for TOLOG ONE. The schema is designed for:
- **User isolation** - Every query is scoped to a user_id
- **Audit trail** - All important operations are logged
- **Performance** - Strategic indexes for common queries
- **Correctness** - Foreign keys and constraints
- **Extensibility** - metadata columns for future needs

---

## Core Tables

### 1. `users`

Stores user accounts and authentication data.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  
  -- Preferences
  preferred_language VARCHAR(10),
  timezone VARCHAR(50),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  email_verified_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP WITH TIME ZONE,
  
  CHECK (email IS NOT NULL AND email != ''),
  CHECK (username IS NOT NULL AND username != '')
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_is_active ON users(is_active);
```

---

### 2. `refresh_tokens`

Stores refresh tokens for session management.

```sql
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) UNIQUE NOT NULL,
  
  -- Security
  is_revoked BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Audit
  ip_address INET,
  user_agent VARCHAR(500),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CHECK (expires_at > CURRENT_TIMESTAMP)
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
```

---

### 3. `conversations`

Stores chat conversations/sessions.

```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Metadata
  title VARCHAR(255),
  description TEXT,
  language VARCHAR(10),  -- Primary language detected
  
  -- Status
  is_archived BOOLEAN DEFAULT false,
  
  -- Custom data
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_message_at TIMESTAMP WITH TIME ZONE,
  
  CHECK (title IS NOT NULL AND title != '')
);

CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_created_at ON conversations(created_at DESC);
CREATE INDEX idx_conversations_is_archived ON conversations(is_archived);
CREATE INDEX idx_conversations_user_id_is_archived ON conversations(user_id, is_archived);
```

---

### 4. `conversation_turns`

Stores individual messages in a conversation.

```sql
CREATE TABLE conversation_turns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Message content
  role VARCHAR(20) NOT NULL,  -- 'user' or 'assistant'
  content TEXT NOT NULL,
  language VARCHAR(10),  -- Detected language of this turn
  
  -- Turn sequence
  turn_index INTEGER NOT NULL,  -- Sequential position in conversation
  
  -- AI processing metadata
  model_used VARCHAR(100),  -- Which AI model generated this (if assistant)
  tokens_used INTEGER,
  latency_ms INTEGER,  -- Response time in milliseconds
  
  -- Custom data
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT check_valid_role CHECK (role IN ('user', 'assistant')),
  CONSTRAINT check_positive_turn_index CHECK (turn_index >= 0)
);

CREATE INDEX idx_conversation_turns_conversation_id ON conversation_turns(conversation_id);
CREATE INDEX idx_conversation_turns_user_id ON conversation_turns(user_id);
CREATE INDEX idx_conversation_turns_created_at ON conversation_turns(created_at DESC);
CREATE INDEX idx_conversation_turns_role ON conversation_turns(role);
CREATE UNIQUE INDEX idx_conversation_turns_unique_index ON conversation_turns(conversation_id, turn_index);
```

---

### 5. `memories`

Long-term persistent user memories.

```sql
CREATE TABLE memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Memory content
  content TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,  -- 'preference' | 'fact' | 'correction' | 'instruction' | 'goal'
  source VARCHAR(50) NOT NULL,  -- 'explicit_user' | 'inferred' | 'system'
  
  -- Scoring
  importance INTEGER DEFAULT 5 CHECK (importance >= 1 AND importance <= 10),
  confidence DECIMAL(3,2) DEFAULT 1.0 CHECK (confidence >= 0 AND confidence <= 1),
  
  -- Namespacing (for isolation, lab testing, etc.)
  namespace VARCHAR(50) DEFAULT 'production',  -- 'production' | 'lab' | custom
  
  -- Tagging for retrieval
  tags TEXT[] DEFAULT '{}',
  
  -- Version tracking
  version INTEGER DEFAULT 1,
  
  -- Audit trail
  created_by_turn UUID REFERENCES conversation_turns(id) ON DELETE SET NULL,
  
  -- Custom data
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT check_valid_type CHECK (type IN ('preference', 'fact', 'correction', 'instruction', 'goal')),
  CONSTRAINT check_valid_source CHECK (source IN ('explicit_user', 'inferred', 'system'))
);

CREATE INDEX idx_memories_user_id ON memories(user_id);
CREATE INDEX idx_memories_namespace ON memories(namespace);
CREATE INDEX idx_memories_user_namespace ON memories(user_id, namespace);
CREATE INDEX idx_memories_type ON memories(type);
CREATE INDEX idx_memories_importance ON memories(importance DESC);
CREATE INDEX idx_memories_last_used_at ON memories(last_used_at DESC);
CREATE INDEX idx_memories_tags ON memories USING GIN(tags);
CREATE INDEX idx_memories_created_at ON memories(created_at DESC);
```

---

### 6. `memory_versions`

Version history for memory corrections (correction ledger).

```sql
CREATE TABLE memory_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- What changed
  version_number INTEGER NOT NULL,
  previous_content TEXT,
  new_content TEXT NOT NULL,
  content_change_reason VARCHAR(255),
  
  -- What also changed
  previous_importance INTEGER,
  new_importance INTEGER,
  
  previous_confidence DECIMAL(3,2),
  new_confidence DECIMAL(3,2),
  
  -- Context
  source VARCHAR(50),  -- 'user_correction' | 'ai_update' | 'system'
  created_by_turn UUID REFERENCES conversation_turns(id) ON DELETE SET NULL,
  
  -- Custom data
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT check_version_positive CHECK (version_number > 0)
);

CREATE INDEX idx_memory_versions_memory_id ON memory_versions(memory_id);
CREATE INDEX idx_memory_versions_user_id ON memory_versions(user_id);
CREATE INDEX idx_memory_versions_created_at ON memory_versions(created_at DESC);
CREATE INDEX idx_memory_versions_version_number ON memory_versions(version_number DESC);
```

---

### 7. `user_preferences`

User-level settings and preferences.

```sql
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  
  -- AI Configuration
  ai_provider VARCHAR(50) DEFAULT 'gemini',  -- Which AI to use
  ai_model VARCHAR(100),  -- Specific model
  
  -- Language & Localization
  preferred_language VARCHAR(10),  -- User's stated preference
  auto_detect_language BOOLEAN DEFAULT true,
  
  -- Memory Settings
  memory_enabled BOOLEAN DEFAULT true,
  auto_save_memory BOOLEAN DEFAULT true,
  memory_retention_days INTEGER DEFAULT 365,
  
  -- Privacy & Security
  data_retention_policy VARCHAR(50) DEFAULT 'indefinite',  -- 'indefinite' | '1_year' | '3_months' etc
  allow_analytics BOOLEAN DEFAULT true,
  
  -- UI Preferences
  theme VARCHAR(20) DEFAULT 'auto',  -- 'auto' | 'light' | 'dark'
  font_size VARCHAR(20) DEFAULT 'medium',
  
  -- Custom settings
  settings_json JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
```

---

### 8. `api_audit_logs`

Audit trail for security-relevant operations.

```sql
CREATE TABLE api_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Request details
  method VARCHAR(10),  -- GET, POST, PATCH, DELETE
  endpoint VARCHAR(500),
  status_code INTEGER,
  
  -- Security events
  event_type VARCHAR(100),  -- 'login' | 'logout' | 'memory_delete' | 'memory_update' | etc
  
  -- Context
  ip_address INET,
  user_agent VARCHAR(500),
  
  -- Details
  details JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_api_audit_logs_user_id ON api_audit_logs(user_id);
CREATE INDEX idx_api_audit_logs_event_type ON api_audit_logs(event_type);
CREATE INDEX idx_api_audit_logs_created_at ON api_audit_logs(created_at DESC);
CREATE INDEX idx_api_audit_logs_user_event ON api_audit_logs(user_id, event_type);
```

---

## Experimental Lab Tables

These tables are completely isolated from production and used for testing.

### 9. `test_profiles`

Synthetic test user profiles for experiments.

```sql
CREATE TABLE test_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  namespace VARCHAR(50) NOT NULL,  -- Name of the experiment
  profile_name VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- Test metadata
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(namespace, profile_name)
);

CREATE INDEX idx_test_profiles_namespace ON test_profiles(namespace);
```

---

### 10. `test_snapshots`

Snapshots of memory state for rollback/comparison.

```sql
CREATE TABLE test_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES test_profiles(id) ON DELETE CASCADE,
  
  snapshot_name VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- Serialized memory state
  memory_snapshot JSONB NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(profile_id, snapshot_name)
);

CREATE INDEX idx_test_snapshots_profile_id ON test_snapshots(profile_id);
CREATE INDEX idx_test_snapshots_created_at ON test_snapshots(created_at DESC);
```

---

### 11. `test_runs`

Results of individual test runs.

```sql
CREATE TABLE test_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES test_profiles(id) ON DELETE CASCADE,
  
  test_id VARCHAR(100) NOT NULL,
  test_name VARCHAR(255) NOT NULL,
  
  -- Execution
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER,
  
  -- Results
  status VARCHAR(50) NOT NULL,  -- 'passed' | 'failed' | 'error' | 'skipped'
  error_message TEXT,
  
  -- Evidence
  inputs JSONB,
  outputs JSONB,
  memory_operations JSONB,
  assertions JSONB,
  
  evidence_hash VARCHAR(64),  -- SHA256 hash of full evidence
  
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT check_valid_status CHECK (status IN ('passed', 'failed', 'error', 'skipped'))
);

CREATE INDEX idx_test_runs_profile_id ON test_runs(profile_id);
CREATE INDEX idx_test_runs_test_id ON test_runs(test_id);
CREATE INDEX idx_test_runs_status ON test_runs(status);
CREATE INDEX idx_test_runs_created_at ON test_runs(created_at DESC);
```

---

## Implementation Status

| Table | Purpose | Status |
|-------|---------|--------|
| users | User accounts | ✅ PLANNED |
| refresh_tokens | Session management | ✅ PLANNED |
| conversations | Chat sessions | ✅ PLANNED |
| conversation_turns | Messages | ✅ PLANNED |
| memories | Persistent memory | ✅ PLANNED |
| memory_versions | Correction ledger | ✅ PLANNED |
| user_preferences | Settings | ✅ PLANNED |
| api_audit_logs | Security audit | ✅ PLANNED |
| test_profiles | Lab testing | ✅ PLANNED |
| test_snapshots | Test snapshots | ✅ PLANNED |
| test_runs | Test results | ✅ PLANNED |

---

## Key Design Decisions

### 1. User Isolation

Every table with user data includes:
- `user_id` column
- Index on `user_id`
- Foreign key constraint to `users(id)`

This ensures:
- No cross-user data leaks
- Easy filtering by user
- Database-level enforcement

### 2. Namespacing

`memories` table includes `namespace` column:
- `'production'` - Real user data
- `'lab'` - Test data (completely isolated)
- Custom namespaces for experiments

Rule: Production queries always filter `namespace = 'production'`

### 3. Audit Trail

Every important operation is logged:
- `api_audit_logs` for security events
- `memory_versions` for memory changes
- Timestamps on all mutations

### 4. Versioning

Memory corrections use version control:
- `memories.version` tracks current version
- `memory_versions` stores all historical changes
- Easy to rollback or view history

### 5. Performance Indexes

Strategic indexes on:
- Foreign keys (for joins)
- Commonly filtered columns (user_id, namespace, type)
- Sort columns (created_at, last_used_at)
- Search columns (tags via GIN)

### 6. Constraints

Used extensively:
- CHECK constraints for valid values (role, type, source)
- UNIQUE constraints where needed (email, username, refresh token)
- Foreign keys for referential integrity

---

## Migration Strategy

Migrations will be managed using a standard Node.js migration tool (e.g., `node-pg-migrate`).

Migration files will:
1. Create tables in dependency order
2. Add indexes
3. Add constraints
4. Include rollback logic

---

## Backup & Recovery

### Backup Strategy

- Daily automated backups
- Point-in-time recovery enabled
- Backups encrypted at rest
- Tested restore procedures

### Data Retention

- User can configure retention in `user_preferences`
- Automatic deletion policies based on:
  - `memory_retention_days`
  - `data_retention_policy`
- GDPR right-to-be-forgotten support

---

## Query Examples

### Retrieve user's memories (with latest corrections)

```sql
SELECT m.*
FROM memories m
WHERE m.user_id = $1
  AND m.namespace = 'production'
  AND m.version = (
    SELECT version
    FROM memory_versions mv
    WHERE mv.memory_id = m.id
    ORDER BY mv.version_number DESC
    LIMIT 1
  )
ORDER BY m.last_used_at DESC, m.importance DESC;
```

### Get conversation with all turns

```sql
SELECT c.*, ct.*
FROM conversations c
LEFT JOIN conversation_turns ct ON c.id = ct.conversation_id
WHERE c.user_id = $1 AND c.id = $2
ORDER BY ct.turn_index ASC;
```

### Audit trail for user

```sql
SELECT * FROM api_audit_logs
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT 100;
```

---

## Future Considerations

- Full-text search on memory content (using PostgreSQL FTS)
- Vector embeddings for semantic search (pgvector extension)
- Read replicas for scaling read-heavy queries
- Sharding by user_id if needed at massive scale

---

**End of Database Schema Document**
