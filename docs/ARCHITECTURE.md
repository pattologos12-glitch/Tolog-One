# TOLOG ONE - Architecture Document

**Version:** 1.0  
**Date:** 2026-08-13  
**Phase:** Phase 1 - Design & Planning  
**Status:** DRAFT

---

## 1. Overview

TOLOG ONE is a production-ready AI companion application with persistent adaptive memory. The system is designed as a **15-layer architecture** that separates concerns, enables provider independence, and ensures user data isolation.

### Core Principle

> "Memory exists outside the model weights."

We do not assume the underlying LLM permanently remembers users. All context, preferences, and memories are managed by persistent systems external to the AI model.

---

## 2. 15-Layer Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 1: USER INTERFACE                                         │
│ React SPA | Text Chat | Memory Manager | Settings               │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│ LAYER 2: AUTHENTICATION & AUTHORIZATION                         │
│ JWT Tokens | Session Management | User Context                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│ LAYER 3: API GATEWAY & ROUTING                                  │
│ Fastify Server | Route Handlers | Middleware                    │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│ LAYER 4: REQUEST VALIDATION & SECURITY                          │
│ Input Validation | Rate Limiting | CORS | Sanitization         │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│ LAYER 5: CONVERSATION MANAGER                                   │
│ Conversation CRUD | Session Isolation | Turn Management         │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│ LAYER 6: LANGUAGE DETECTION LAYER                               │
│ Text Language ID | Confidence Scoring | Mixed Language Detect   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│ LAYER 7: SHORT-TERM MEMORY (Session Context)                    │
│ Recent Turns | Current Topic | Active Instructions | Task State │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│ LAYER 8: LONG-TERM MEMORY RETRIEVAL                             │
│ Query Long-Term Store | Relevance Scoring | Context Selection   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│ LAYER 9: MEMORY CORRECTION LEDGER                               │
│ Track Corrections | Version Control | Prefer Latest Info        │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│ LAYER 10: CONTEXT ASSEMBLY & PRIORITY                           │
│ Merge Contexts | Resolve Conflicts | Respect User Instructions  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│ LAYER 11: USER PROFILE & PREFERENCES                            │
│ User Settings | Language Preference | Memory Controls | Config   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│ LAYER 12: AI PROVIDER ABSTRACTION                               │
│ Provider Interface | Capability Detection | Fallback Logic      │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│ LAYER 13: AI MODEL GATEWAY                                      │
│ Request Formatting | Streaming | Response Parsing | Error Handle│
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│ LAYER 14: RESPONSE PROCESSING & MEMORY UPDATE                   │
│ Extract Info | Create Memories | Update Memories | Log Actions  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│ LAYER 15: OBSERVABILITY, LOGGING & ERROR HANDLING               │
│ Structured Logs | Metrics | Error Tracking | Audit Trail        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Layer Descriptions

### **Layer 1: User Interface**
- React SPA with TypeScript
- Chat interface for text messages
- Memory viewer/editor panel
- Settings & user controls
- Language indicator
- Status indicators

**Status:** NOT IMPLEMENTED

---

### **Layer 2: Authentication & Authorization**
- JWT-based authentication
- Refresh token rotation
- User context extraction from token
- Server-side session validation
- Permission checks per request

**Status:** PLANNED

---

### **Layer 3: API Gateway & Routing**
- Fastify server
- Route handlers for all endpoints
- Middleware pipeline
- Request/response logging

**Status:** PLANNED

---

### **Layer 4: Request Validation & Security**
- Input validation (schema validation)
- Rate limiting per user
- CORS configuration
- Request sanitization
- Size limits

**Status:** PLANNED

---

### **Layer 5: Conversation Manager**
- Create new conversations
- List conversations per user
- Retrieve conversation turns
- Delete conversations
- Rename conversations
- Conversation isolation per user

**Status:** PLANNED

---

### **Layer 6: Language Detection Layer**
- Detect language from text input
- Confidence scoring
- Handle mixed-language input
- Fallback to context if uncertain
- Store detected language in context

**Providers:**
- `franc` (lightweight, no external API)
- Later: Google Cloud Language API
- Later: Provider-specific language detection

**Status:** PLANNED

---

### **Layer 7: Short-Term Memory (Session Context)**
- In-memory store of current conversation
- Recent turns (last N messages)
- Current detected language
- Current topic/task
- Active user instructions
- Session metadata

**Scope:** Per conversation session only
**Isolation:** Per user

**Status:** PLANNED

---

### **Layer 8: Long-Term Memory Retrieval**
- Query persistent memory database
- Relevance scoring for retrieved memories
- Context window management
- User isolation checks
- Caching layer (optional)

**Status:** PLANNED

---

### **Layer 9: Memory Correction Ledger**
- Track all memory corrections
- Version history of memories
- Timestamp corrections
- Prefer latest explicit user correction over older data
- Support rollback if needed

**Key Feature:** If user says "I don't like coffee anymore" (contradicting earlier "I like coffee"), the newer correction takes precedence.

**Status:** PLANNED

---

### **Layer 10: Context Assembly & Priority**
- Merge short-term and long-term memory
- Apply priority rules:
  1. Current explicit user instruction
  2. Current conversation context
  3. Explicit recent correction
  4. Relevant long-term memory
  5. Older/general memory
- Resolve conflicts in favor of newer/explicit data
- Limit context window size for AI model

**Status:** PLANNED

---

### **Layer 11: User Profile & Preferences**
- User settings storage
- Language preferences (inferred or explicit)
- Memory controls (enable/disable)
- UI preferences
- AI provider preferences (if user has choices)

**Status:** PLANNED

---

### **Layer 12: AI Provider Abstraction**
```typescript
interface AIProvider {
  generateResponse(params: GenerateParams): Promise<string>;
  streamResponse(params: GenerateParams): AsyncIterable<string>;
  detectCapabilities(): ProviderCapabilities;
  validateConfig(): Promise<boolean>;
}

interface GenerateParams {
  messages: Message[];
  context: string;
  language: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

interface ProviderCapabilities {
  supportsStreaming: boolean;
  supportedLanguages: string[];
  supportsFunctionCalling: boolean;
  maxTokens: number;
  costPer1kTokens: number;
}
```

**Implementations:**
- GoogleGeminiProvider
- AnthropicClaudeProvider
- (Future: OpenAI, local models, etc.)

**Status:** PLANNED

---

### **Layer 13: AI Model Gateway**
- Format requests for selected AI provider
- Handle streaming responses
- Parse structured responses
- Handle provider-specific errors
- Retry logic with exponential backoff
- Timeout handling

**Status:** PLANNED

---

### **Layer 14: Response Processing & Memory Update**
- Parse AI response
- Extract entities (names, preferences, facts)
- Decide what should be stored as memory
- Create new memory records
- Update existing memory records
- Log memory operations for audit trail

**Status:** PLANNED

---

### **Layer 15: Observability, Logging & Error Handling**
- Structured logging (JSON format)
- Log levels: DEBUG, INFO, WARN, ERROR, FATAL
- Metrics collection:
  - API latency
  - AI provider latency
  - Memory operation counts
  - User counts
- Error tracking with context
- Audit trail for sensitive operations
- PII masking in logs

**Never log:**
- Passwords
- API keys
- Auth tokens
- Sensitive personal data (unless absolutely necessary with user consent)

**Status:** PLANNED

---

## 4. Data Flow - User Sends a Message

```
USER INPUT
    ↓
[Layer 2] Verify JWT Token
    ↓
[Layer 4] Validate & Sanitize Input
    ↓
[Layer 6] Detect Language
    ↓
[Layer 5] Load Conversation & Add Turn
    ↓
[Layer 7] Load Short-Term Memory (recent turns)
    ↓
[Layer 8] Retrieve Relevant Long-Term Memory
    ↓
[Layer 9] Check Correction Ledger (use latest corrections)
    ↓
[Layer 10] Assemble Final Context with Priority
    ↓
[Layer 11] Add User Profile Data (preferences, settings)
    ↓
[Layer 12] Select AI Provider
    ↓
[Layer 13] Format Request & Send to AI Model
    ↓
[Layer 15] Log Request with Metadata
    ↓
AI MODEL RESPONSE
    ↓
[Layer 14] Parse Response & Extract Memories
    ↓
[Layer 9] Decide: Create new memory? Update existing?
    ↓
[Layer 15] Log Memory Operations
    ↓
[Layer 5] Store AI Response as Turn in Conversation
    ↓
[Layer 15] Log Response
    ↓
RETURN TO USER
```

---

## 5. User Data Isolation Model

### Namespace Hierarchy

```
Organization / System
  └── User (isolated namespace)
        └── Conversation (per-session)
              └── Turns (conversation messages)
        └── Long-Term Memory (persistent)
              └── Memory Records
              └── Memory Versions (correction ledger)
        └── User Preferences
        └── Settings
```

### Authorization Rules

**Rule 1:** Every database query must include `WHERE user_id = $1`  
**Rule 2:** User ID comes from JWT token (never from client)  
**Rule 3:** No cross-user queries without explicit aggregation  
**Rule 4:** Bulk operations must be scoped per user  

### Experimental Lab Namespace

Separate isolated namespace for testing:
```
System
  └── Lab Environment
        └── Test Profile (synthetic user for testing)
              └── Isolated Memory
              └── Test Conversations
              └── Test Snapshots
```

**Rule:** Lab data is completely isolated from production users. No cross-contamination.

---

## 6. Memory System Design

### Memory Record Structure

```typescript
interface Memory {
  id: string;                    // UUID
  user_id: string;              // FK to User
  content: string;              // The actual information
  type: MemoryType;             // 'preference' | 'fact' | 'correction' | 'instruction'
  importance: number;           // 1-10 scale
  source: MemorySource;         // 'explicit_user' | 'inferred' | 'system'
  confidence: number;           // 0-1 (how confident are we this is accurate?)
  namespace: string;            // 'production' | 'lab' | custom
  tags: string[];               // For categorization & retrieval
  created_at: Date;
  updated_at: Date;
  last_used_at: Date;
  version: number;              // For versioning
  created_by_turn?: string;     // Which conversation turn created this?
  metadata: object;             // Extra context
}

type MemoryType = 'preference' | 'fact' | 'correction' | 'instruction' | 'goal';
type MemorySource = 'explicit_user' | 'inferred' | 'system';
```

### Memory Correction Ledger

```typescript
interface MemoryCorrectionRecord {
  id: string;                    // UUID
  memory_id: string;            // FK to Memory being corrected
  user_id: string;              // Who made the correction
  original_content: string;     // What it was before
  new_content: string;          // What it is now
  reason?: string;              // Why was it corrected
  turn_id?: string;             // Which turn caused this correction
  timestamp: Date;
  version: number;              // Which version of the memory
}
```

### Memory Retrieval Query Example

```sql
SELECT m.* FROM memories m
WHERE m.user_id = $1
  AND m.namespace = 'production'
  AND (
    m.tags @> $2                -- JSON array contains search tags
    OR m.content ILIKE $3       -- Full-text search
  )
ORDER BY m.last_used_at DESC, m.importance DESC
LIMIT $4;
```

---

## 7. AI Provider Abstraction

### Provider Selection Logic

```typescript
class AIProviderFactory {
  static getProvider(userPreference?: string): AIProvider {
    // Check user preference first
    if (userPreference && SUPPORTED_PROVIDERS[userPreference]) {
      return SUPPORTED_PROVIDERS[userPreference];
    }
    
    // Fall back to default
    return SUPPORTED_PROVIDERS['default'];
  }
}

// Configuration
const SUPPORTED_PROVIDERS = {
  'gemini': new GoogleGeminiProvider(),
  'claude': new AnthropicClaudeProvider(),
  'default': new GoogleGeminiProvider(), // or env var
};
```

### Provider Configuration (Environment Variables)

```bash
# .env
AI_DEFAULT_PROVIDER=gemini
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.0-flash

CLAUDE_API_KEY=...
CLAUDE_MODEL=claude-3-5-sonnet-20241022

# Fallback
FALLBACK_PROVIDER=claude
```

### System Prompt Template

```
You are TOLOG ONE, a personal AI companion designed to communicate naturally with users, 
remember relevant information across conversations, and adapt to the individual user.

Current language: {language}
User name: {userName}
Conversation topic: {topic}

Below is relevant information we remember about this user:
{memoryContext}

Previous messages in this conversation:
{conversationContext}

Respond naturally and conversationally in {language}.
```

---

## 8. Language Detection System

### Language Detection Flow

```
User Input
    ↓
[Detect Language with Franc]
    ↓
Result: { language: 'cs', confidence: 0.95, alternatives: [...] }
    ↓
If confidence > 0.8: Use detected language
If confidence 0.5-0.8: Use + log as uncertain
If confidence < 0.5: Fall back to previous conversation language / default
    ↓
Store in Context: { currentLanguage: 'cs' }
    ↓
AI Response in Detected Language
```

### Supported Languages (MVP)

Based on AI provider capabilities, start with:

- **European:** English, Czech, German, French, Spanish, Italian, Polish, Dutch, Swedish, Danish, Norwegian, Finnish, Greek, Portuguese
- **Slavic:** Russian, Ukrainian, Bulgarian, Serbian, Croatian, Slovak, Hungarian
- **Asian:** Japanese, Korean, Simplified Chinese, Traditional Chinese, Thai, Vietnamese, Indonesian, Filipino
- **Middle Eastern:** Arabic, Hebrew, Turkish, Persian
- **African:** Swahili

**Note:** Actual support depends on:
1. AI provider support (some models support 200+ languages)
2. STT/TTS provider support (future)
3. Language detection library coverage

**Status:** PLANNED - will verify with each provider's actual supported languages

---

## 9. Conversation Management

### Conversation Structure

```typescript
interface Conversation {
  id: string;                    // UUID
  user_id: string;              // FK to User
  title: string;                // User-given or auto-generated
  description?: string;         // Optional description
  language: string;             // Primary language of conversation
  created_at: Date;
  updated_at: Date;
  last_message_at: Date;
  is_archived: boolean;
  metadata: object;
}

interface ConversationTurn {
  id: string;                    // UUID
  conversation_id: string;      // FK to Conversation
  user_id: string;              // FK to User (for audit)
  role: 'user' | 'assistant';
  content: string;              // The message content
  language: string;             // Detected/specified language
  turn_index: number;           // Sequential turn number in conversation
  metadata: object;             // Could store tokens used, latency, etc.
  created_at: Date;
}
```

### Conversation Isolation

- Each conversation is independent
- New conversation does NOT inherit full turn history from previous conversations
- New conversation DOES get access to user's long-term memory
- Users can search conversations
- Users can delete conversations

---

## 10. Security Model

### Authentication

```
1. User sends username + password
2. Backend validates against bcrypt hash
3. Backend generates:
   - Access Token (JWT, short-lived: 15 min)
   - Refresh Token (JWT, long-lived: 7 days)
4. Frontend stores tokens in secure httpOnly cookies
5. Frontend uses access token for API requests
6. When access token expires, use refresh token to get new one
```

### Authorization

```
Every endpoint:
1. Verify JWT signature
2. Extract user_id from token payload
3. Use this user_id in all queries
4. Never trust client-provided user_id
5. Check user has permission for requested resource
```

### Secrets Management

```
Environment Variables (.env - NOT in git):
- Database password
- JWT secret
- AI provider API keys
- Any other secrets

Version control:
- .env.example (with placeholder names only)
- .gitignore includes .env
```

### Database Security

```
- User passwords: bcrypt hashed
- API keys: encrypted at rest (or managed via secure env vars)
- Sensitive logs: PII redacted
- Backups: encrypted
```

### Rate Limiting

```
Per user:
- 100 requests per 15 minutes (API calls)
- 50 message submissions per hour
- 10 memory creations per hour

Per IP:
- 1000 requests per hour (to prevent brute force)

Implementation: Redis + Fastify rate-limit middleware
```

---

## 11. Database Schema Overview

See [DATABASE_SCHEMA.md](./docs/DATABASE_SCHEMA.md) for complete schema.

Key entities:
- `users` - User accounts
- `conversations` - Chat sessions
- `conversation_turns` - Individual messages
- `memories` - Long-term user memories
- `memory_corrections` - Correction ledger
- `memory_versions` - Version history
- `user_preferences` - User settings
- `api_audit_logs` - Security audit trail

---

## 12. API Contract Overview

See [API_CONTRACT.md](./docs/API_CONTRACT.md) for complete endpoint specification.

Main endpoint categories:
- **Auth:** POST /auth/register, POST /auth/login, POST /auth/refresh, POST /auth/logout
- **Conversations:** GET, POST, PATCH, DELETE /conversations
- **Messages:** GET, POST /conversations/:id/messages
- **Memory:** GET, POST, PATCH, DELETE /memory
- **User:** GET, PATCH /user/profile
- **Health:** GET /health

---

## 13. Deployment Architecture

### Docker Compose Setup

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: tolog_one
    volumes:
      - postgres_data:/var/lib/postgresql/data
    
  backend:
    build: ./backend
    environment:
      NODE_ENV: production
      DATABASE_URL: postgres://...
      JWT_SECRET: ${JWT_SECRET}
      GEMINI_API_KEY: ${GEMINI_API_KEY}
    ports:
      - "3000:3000"
    depends_on:
      - postgres
    
  frontend:
    build: ./frontend
    ports:
      - "80:80"
    environment:
      VITE_API_BASE_URL: http://backend:3000
    depends_on:
      - backend

volumes:
  postgres_data:
```

### Environment Variables

```bash
# Backend
NODE_ENV=production
DATABASE_URL=postgresql://user:password@postgres:5432/tolog_one
JWT_SECRET=<long-random-secret>
JWT_REFRESH_SECRET=<long-random-refresh-secret>

# AI Providers
AI_DEFAULT_PROVIDER=gemini
GEMINI_API_KEY=<actual-key>
GEMINI_MODEL=gemini-2.0-flash
CLAUDE_API_KEY=<actual-key>
CLAUDE_MODEL=claude-3-5-sonnet-20241022

# Frontend
VITE_API_BASE_URL=https://api.tolog.one
VITE_APP_NAME=TOLOG ONE

# Logging
LOG_LEVEL=info
```

---

## 14. Development Roadmap

### Phase 1: Foundation (Current)
- ✅ Architecture design
- ✅ Database schema
- ✅ Project structure
- 🔄 Basic backend setup (Fastify, DB)
- 🔄 Authentication system
- 🔄 Conversation CRUD

**Status:** IN PROGRESS

### Phase 2: Core Features
- Memory system (storage + retrieval)
- Correction ledger
- AI provider abstraction
- Language detection
- Basic UI (chat interface)

**Status:** PLANNED

### Phase 3: Polish & Security
- Rate limiting
- Comprehensive logging
- Error handling
- Input validation
- Security audit

**Status:** PLANNED

### Phase 4: Speech (Future)
- STT integration
- TTS integration
- Voice conversation UI

**Status:** PLANNED

### Phase 5: Advanced Features (Future)
- Experimental Lab environment
- Tool/function calling
- Integration bridges
- Analytics dashboard

**Status:** PLANNED

---

## 15. Design Principles

### 1. **No Vendor Lock-in**
AI provider can be swapped by changing a config variable. No rewriting required.

### 2. **User Privacy First**
- Data is isolated per user
- Memories can be viewed, edited, deleted
- Audit trail for transparency
- No data sharing between users

### 3. **Transparency**
Users understand:
- When memory was used
- What language was detected
- When corrections were made

### 4. **Production Ready**
- Proper authentication
- Database with migrations
- Error handling
- Logging and monitoring
- Rate limiting
- Input validation

### 5. **Testable Architecture**
- Isolated Lab environment for experiments
- Deterministic test runs
- No production data in tests
- Memory snapshots and rollbacks

### 6. **Scalable from Day One**
- Database indexes for fast queries
- Connection pooling
- Efficient memory retrieval
- API pagination

---

## 16. What This Document Does NOT Include

- Detailed UI/UX mockups (coming in separate design document)
- Frontend component architecture (detailed in frontend code)
- Specific provider authentication flows (in provider documentation)
- Performance benchmarks (after implementation)
- Load testing results (after implementation)

---

## 17. Next Steps

1. ✅ **This Architecture Document** - COMPLETE
2. 📄 **DATABASE_SCHEMA.md** - Define all tables, indexes, constraints
3. 📄 **API_CONTRACT.md** - Define all endpoints, request/response formats
4. 📄 **SECURITY.md** - Detailed security model and threat analysis
5. 📄 **DEPLOYMENT.md** - Docker, CI/CD, infrastructure details
6. 📄 **DEVELOPMENT.md** - Local setup and development workflow

---

## 18. Document Status

| Document | Status | Notes |
|----------|--------|-------|
| ARCHITECTURE.md | ✅ COMPLETE | This document |
| DATABASE_SCHEMA.md | 📋 PLANNED | Next to create |
| API_CONTRACT.md | 📋 PLANNED | Endpoint specifications |
| SECURITY.md | 📋 PLANNED | Auth, encryption, threats |
| DEPLOYMENT.md | 📋 PLANNED | Docker, env, CI/CD |
| DEVELOPMENT.md | 📋 PLANNED | Local setup guide |
| ROADMAP.md | 📋 PLANNED | Implementation phases |

---

**End of Architecture Document**
