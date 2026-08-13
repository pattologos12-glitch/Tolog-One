# TOLOG ONE - API Contract

**Version:** 1.0  
**Date:** 2026-08-13  
**Base URL:** `https://api.tolog.one` (or local: `http://localhost:3000`)  
**Content-Type:** `application/json`

---

## Overview

This document defines all API endpoints for TOLOG ONE. 

### Authentication

All endpoints except `/auth/register` and `/auth/login` require:
```
Authorization: Bearer {access_token}
```

Access tokens are JWT tokens with short lifespan (15 minutes). Use refresh token to get new access token.

### Response Format

All responses follow this format:

**Success (2xx):**
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-08-13T12:00:00Z",
    "requestId": "req-abc123"
  }
}
```

**Error (4xx, 5xx):**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [ ... ]
  },
  "meta": {
    "timestamp": "2026-08-13T12:00:00Z",
    "requestId": "req-abc123"
  }
}
```

### Error Codes

| Code | HTTP | Meaning |
|------|------|---------|
| VALIDATION_ERROR | 400 | Input validation failed |
| UNAUTHORIZED | 401 | Missing or invalid token |
| FORBIDDEN | 403 | User lacks permission |
| NOT_FOUND | 404 | Resource not found |
| CONFLICT | 409 | Resource already exists |
| RATE_LIMITED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Server error |

---

## Authentication Endpoints

### POST /auth/register

Create a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "username": "john_doe",
  "password": "secure_password_123",
  "full_name": "John Doe"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "username": "john_doe",
      "full_name": "John Doe",
      "created_at": "2026-08-13T12:00:00Z"
    },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "expiresIn": 900
  }
}
```

**Errors:**
- `400 VALIDATION_ERROR` - Invalid email/password format
- `409 CONFLICT` - Email or username already registered

**Status:** PLANNED

---

### POST /auth/login

Authenticate a user and get tokens.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "secure_password_123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "username": "john_doe",
      "full_name": "John Doe"
    },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "expiresIn": 900
  }
}
```

**Errors:**
- `401 UNAUTHORIZED` - Invalid credentials
- `400 VALIDATION_ERROR` - Missing email or password

**Status:** PLANNED

---

### POST /auth/refresh

Get a new access token using refresh token.

**Request:**
```json
{
  "refreshToken": "eyJhbGc..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc...",
    "expiresIn": 900
  }
}
```

**Errors:**
- `401 UNAUTHORIZED` - Invalid or expired refresh token

**Status:** PLANNED

---

### POST /auth/logout

Invalidate current refresh token.

**Request:** (no body)

**Response (200):**
```json
{
  "success": true,
  "data": {}
}
```

**Status:** PLANNED

---

## User Profile Endpoints

### GET /user/profile

Get current user's profile.

**Request:** (no body)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "john_doe",
    "full_name": "John Doe",
    "preferred_language": "cs",
    "timezone": "Europe/Prague",
    "email_verified": true,
    "created_at": "2026-08-13T12:00:00Z",
    "updated_at": "2026-08-13T12:00:00Z",
    "last_login_at": "2026-08-13T11:00:00Z"
  }
}
```

**Status:** PLANNED

---

### PATCH /user/profile

Update current user's profile.

**Request:**
```json
{
  "full_name": "John Updated",
  "preferred_language": "en",
  "timezone": "Europe/London"
}
```

**Response (200):** Updated user object (same as GET /user/profile)

**Errors:**
- `400 VALIDATION_ERROR` - Invalid data
- `409 CONFLICT` - Email already in use

**Status:** PLANNED

---

### PATCH /user/password

Change user's password.

**Request:**
```json
{
  "current_password": "old_password",
  "new_password": "new_secure_password"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Password updated successfully"
  }
}
```

**Errors:**
- `401 UNAUTHORIZED` - Current password incorrect
- `400 VALIDATION_ERROR` - New password too weak

**Status:** PLANNED

---

## Conversation Endpoints

### GET /conversations

List user's conversations (paginated).

**Query Parameters:**
- `limit` (default: 20, max: 100)
- `offset` (default: 0)
- `archived` (filter by: true/false/null)
- `sort` (default: "updated_at", options: "created_at", "updated_at", "last_message_at")
- `order` (default: "desc", options: "asc", "desc")

**Response (200):**
```json
{
  "success": true,
  "data": {
    "conversations": [
      {
        "id": "uuid",
        "title": "Conversation about AI",
        "description": "Discussion on machine learning",
        "language": "en",
        "is_archived": false,
        "created_at": "2026-08-13T12:00:00Z",
        "updated_at": "2026-08-13T12:30:00Z",
        "last_message_at": "2026-08-13T12:30:00Z"
      }
    ],
    "pagination": {
      "total": 42,
      "limit": 20,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

**Status:** PLANNED

---

### POST /conversations

Create a new conversation.

**Request:**
```json
{
  "title": "New Conversation"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "New Conversation",
    "description": null,
    "language": null,
    "is_archived": false,
    "created_at": "2026-08-13T12:00:00Z",
    "updated_at": "2026-08-13T12:00:00Z",
    "last_message_at": null
  }
}
```

**Status:** PLANNED

---

### GET /conversations/:id

Get a specific conversation with all messages.

**Query Parameters:**
- `limit` (max turns to return, default: 50)
- `offset` (for pagination, default: 0)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "conversation": {
      "id": "uuid",
      "title": "Conversation title",
      "language": "cs",
      "created_at": "2026-08-13T12:00:00Z",
      "updated_at": "2026-08-13T12:30:00Z"
    },
    "turns": [
      {
        "id": "uuid",
        "role": "user",
        "content": "Hello!",
        "language": "en",
        "turn_index": 0,
        "created_at": "2026-08-13T12:00:00Z"
      },
      {
        "id": "uuid",
        "role": "assistant",
        "content": "Hi! How can I help?",
        "language": "en",
        "turn_index": 1,
        "model_used": "gemini-2.0-flash",
        "latency_ms": 1250,
        "created_at": "2026-08-13T12:00:05Z"
      }
    ],
    "pagination": {
      "total": 45,
      "limit": 50,
      "offset": 0,
      "hasMore": false
    }
  }
}
```

**Errors:**
- `404 NOT_FOUND` - Conversation doesn't exist
- `403 FORBIDDEN` - Not authorized to view

**Status:** PLANNED

---

### PATCH /conversations/:id

Update conversation metadata.

**Request:**
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "is_archived": true
}
```

**Response (200):** Updated conversation object

**Status:** PLANNED

---

### DELETE /conversations/:id

Delete a conversation (soft delete - archives it).

**Request:** (no body)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Conversation archived"
  }
}
```

**Status:** PLANNED

---

## Message Endpoints

### POST /conversations/:id/messages

Send a message in a conversation.

**Request:**
```json
{
  "content": "What's your name?",
  "language": null
}
```

Language can be omitted - system will auto-detect.

**Response (200):** (streaming or immediate based on client preference)

**Streaming Response (text/event-stream):**
```
data: {"type":"language_detected","language":"en","confidence":0.95}
data: {"type":"response_start"}
data: {"type":"content","chunk":"I'm TOLOG"}
data: {"type":"content","chunk":" ONE"}
data: {"type":"response_complete","full_response":"I'm TOLOG ONE","tokens_used":15}
data: {"type":"memory_update","operations":[{"type":"create","memory":"name is TOLOG ONE"}]}
```

**Non-Streaming Response (application/json):**
```json
{
  "success": true,
  "data": {
    "userTurn": {
      "id": "uuid",
      "role": "user",
      "content": "What's your name?",
      "language": "en",
      "turn_index": 0,
      "created_at": "2026-08-13T12:00:00Z"
    },
    "assistantTurn": {
      "id": "uuid",
      "role": "assistant",
      "content": "I'm TOLOG ONE, your AI companion.",
      "language": "en",
      "turn_index": 1,
      "model_used": "gemini-2.0-flash",
      "latency_ms": 1250,
      "created_at": "2026-08-13T12:00:05Z"
    },
    "languageDetected": {
      "language": "en",
      "confidence": 0.95,
      "alternatives": []
    },
    "memoryOperations": [
      {
        "type": "create",
        "memory_id": "uuid",
        "content": "User asked about my name",
        "type": "fact"
      }
    ]
  }
}
```

**Query Parameters:**
- `stream` (default: false) - Return streaming response

**Errors:**
- `400 VALIDATION_ERROR` - Empty message
- `404 NOT_FOUND` - Conversation not found
- `429 RATE_LIMITED` - Too many messages

**Status:** PLANNED

---

## Memory Endpoints

### GET /memory

List user's memories (paginated).

**Query Parameters:**
- `type` (filter: preference, fact, correction, instruction, goal)
- `namespace` (default: production)
- `tags` (comma-separated)
- `search` (full-text search)
- `limit` (default: 20, max: 100)
- `offset` (default: 0)
- `sort` (options: last_used_at, created_at, importance)
- `order` (default: desc)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "memories": [
      {
        "id": "uuid",
        "content": "User likes coffee",
        "type": "preference",
        "source": "explicit_user",
        "importance": 7,
        "confidence": 0.95,
        "tags": ["beverage", "preference"],
        "version": 2,
        "created_at": "2026-08-01T10:00:00Z",
        "updated_at": "2026-08-13T12:00:00Z",
        "last_used_at": "2026-08-13T12:00:00Z"
      }
    ],
    "pagination": {
      "total": 127,
      "limit": 20,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

**Status:** PLANNED

---

### POST /memory

Create a new memory.

**Request:**
```json
{
  "content": "User prefers morning coffee",
  "type": "preference",
  "importance": 8,
  "tags": ["beverage", "routine"]
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "content": "User prefers morning coffee",
    "type": "preference",
    "source": "explicit_user",
    "importance": 8,
    "confidence": 1.0,
    "namespace": "production",
    "tags": ["beverage", "routine"],
    "version": 1,
    "created_at": "2026-08-13T12:00:00Z",
    "updated_at": "2026-08-13T12:00:00Z"
  }
}
```

**Errors:**
- `400 VALIDATION_ERROR` - Invalid type or importance

**Status:** PLANNED

---

### GET /memory/:id

Get a specific memory with version history.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "memory": {
      "id": "uuid",
      "content": "User likes coffee",
      "type": "preference",
      "importance": 7,
      "version": 2,
      "created_at": "2026-08-01T10:00:00Z",
      "updated_at": "2026-08-13T12:00:00Z"
    },
    "versions": [
      {
        "version_number": 1,
        "previous_content": null,
        "new_content": "User likes coffee",
        "created_at": "2026-08-01T10:00:00Z"
      },
      {
        "version_number": 2,
        "previous_content": "User likes coffee",
        "new_content": "User likes coffee",
        "content_change_reason": "Updated importance",
        "previous_importance": 5,
        "new_importance": 7,
        "created_at": "2026-08-13T12:00:00Z"
      }
    ]
  }
}
```

**Status:** PLANNED

---

### PATCH /memory/:id

Update a memory (creates new version in ledger).

**Request:**
```json
{
  "content": "User no longer drinks coffee",
  "importance": 6,
  "reason": "User explicitly stated change"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "content": "User no longer drinks coffee",
    "type": "preference",
    "importance": 6,
    "version": 3,
    "updated_at": "2026-08-13T12:30:00Z"
  }
}
```

**Errors:**
- `404 NOT_FOUND` - Memory not found
- `400 VALIDATION_ERROR` - Invalid update

**Status:** PLANNED

---

### DELETE /memory/:id

Delete a memory.

**Request:** (no body)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Memory deleted"
  }
}
```

**Status:** PLANNED

---

### POST /memory/reset

Delete all user memories (dangerous operation).

**Request:**
```json
{
  "confirmation": "I understand this will delete all my memories"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "All memories deleted",
    "count": 127
  }
}
```

**Status:** PLANNED

---

## Settings & Preferences Endpoints

### GET /preferences

Get user's preferences.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "ai_provider": "gemini",
    "ai_model": "gemini-2.0-flash",
    "preferred_language": "cs",
    "auto_detect_language": true,
    "memory_enabled": true,
    "auto_save_memory": true,
    "theme": "auto",
    "allow_analytics": true
  }
}
```

**Status:** PLANNED

---

### PATCH /preferences

Update preferences.

**Request:**
```json
{
  "ai_provider": "claude",
  "preferred_language": "en",
  "theme": "dark"
}
```

**Response (200):** Updated preferences object

**Status:** PLANNED

---

## Health & Diagnostics

### GET /health

Health check endpoint.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-08-13T12:00:00Z",
    "uptime_seconds": 86400,
    "database": "ok",
    "ai_provider": "ok"
  }
}
```

**Status:** PLANNED

---

### GET /health/ai-providers

Check status of all AI providers.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "providers": {
      "gemini": {
        "status": "ok",
        "latency_ms": 450,
        "available": true
      },
      "claude": {
        "status": "ok",
        "latency_ms": 520,
        "available": true
      }
    }
  }
}
```

**Status:** PLANNED

---

## Rate Limiting

### Headers

All responses include rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1692009600
```

### Limits

- **API calls:** 100 per 15 minutes per user
- **Messages:** 50 per hour per user
- **Memory operations:** 10 per hour per user
- **Login attempts:** 5 per 15 minutes per IP

When limit is exceeded:
```
HTTP 429 Too Many Requests

{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests",
    "retryAfter": 60
  }
}
```

**Status:** PLANNED

---

## Implementation Checklist

| Endpoint | Category | Status |
|----------|----------|--------|
| POST /auth/register | Auth | PLANNED |
| POST /auth/login | Auth | PLANNED |
| POST /auth/refresh | Auth | PLANNED |
| POST /auth/logout | Auth | PLANNED |
| GET /user/profile | User | PLANNED |
| PATCH /user/profile | User | PLANNED |
| PATCH /user/password | User | PLANNED |
| GET /conversations | Conversations | PLANNED |
| POST /conversations | Conversations | PLANNED |
| GET /conversations/:id | Conversations | PLANNED |
| PATCH /conversations/:id | Conversations | PLANNED |
| DELETE /conversations/:id | Conversations | PLANNED |
| POST /conversations/:id/messages | Messages | PLANNED |
| GET /memory | Memory | PLANNED |
| POST /memory | Memory | PLANNED |
| GET /memory/:id | Memory | PLANNED |
| PATCH /memory/:id | Memory | PLANNED |
| DELETE /memory/:id | Memory | PLANNED |
| POST /memory/reset | Memory | PLANNED |
| GET /preferences | Settings | PLANNED |
| PATCH /preferences | Settings | PLANNED |
| GET /health | Health | PLANNED |
| GET /health/ai-providers | Health | PLANNED |

---

**End of API Contract Document**
