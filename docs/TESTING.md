# TOLOG ONE - Testing Strategy

**Version:** 1.0  
**Date:** 2026-08-13  
**Focus:** Robust testing of persistent memory and namespace isolation

---

## 1. Overview

Testing is critical for TOLOG ONE because:
1. **Memory correctness** - Must get right what users remember
2. **User isolation** - No data leaks between users
3. **Data persistence** - Memories survive across sessions
4. **Language detection** - Accuracy across languages
5. **AI provider abstraction** - Works with multiple providers

Testing strategy spans:
- **Unit Tests** - Individual functions
- **Integration Tests** - Database + API interactions
- **E2E Tests** - Full user workflows
- **Lab Tests** - Isolated memory experiments
- **Security Tests** - Vulnerability detection

---

## 2. Test Pyramid

```
         ▲
        /|\
       / | \
      /  |  \  E2E Tests (10%)
     /   |   \ Real browser, full system
    /    |    \
   /     |     \
  /      |      \  Integration Tests (30%)
 /       |       \ Database, API, providers
/        |        \
═════════════════════ Unit Tests (60%)
Individual functions, mocked dependencies
```

---

## 3. Unit Tests

### 3.1 Backend Unit Tests

**Technology:** Vitest + Jest matchers

**Location:** `backend/tests/unit/`

#### Language Detection Tests

File: `backend/tests/unit/language-detection.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { detectLanguage } from '@/services/language-detection.service';

describe('Language Detection Service', () => {
  describe('detectLanguage()', () => {
    it('should detect English text', () => {
      const result = detectLanguage('Hello, how are you today?');
      expect(result.language).toBe('en');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should detect Czech text', () => {
      const result = detectLanguage('Dobrý den, jak se máte?');
      expect(result.language).toBe('cs');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should detect German text', () => {
      const result = detectLanguage('Guten Tag, wie geht es Ihnen?');
      expect(result.language).toBe('de');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should handle short text with lower confidence', () => {
      const result = detectLanguage('Hi');
      expect(result.language).toBeDefined();
      expect(result.confidence).toBeLessThan(0.9);
    });

    it('should detect mixed language text', () => {
      const result = detectLanguage('Hello, jak se máš?');
      expect(['en', 'cs']).toContain(result.language);
      expect(result.alternatives).toBeDefined();
      expect(result.alternatives.length).toBeGreaterThan(0);
    });

    it('should handle empty string', () => {
      const result = detectLanguage('');
      expect(result).toHaveProperty('language');
      expect(result.confidence).toBeLessThan(0.5);
    });

    it('should return alternative language options', () => {
      const result = detectLanguage('Bonjour, au revoir');
      expect(result.alternatives).toBeDefined();
      expect(Array.isArray(result.alternatives)).toBe(true);
    });
  });

  describe('Language fallback logic', () => {
    it('should use previous conversation language if confidence is low', () => {
      const currentText = 'Hi';
      const previousLanguage = 'cs';
      
      const result = detectLanguage(currentText, { fallbackLanguage: previousLanguage });
      
      if (result.confidence < 0.6) {
        expect(result.language).toBe(previousLanguage);
      }
    });

    it('should prefer user preference over detection', () => {
      const userPreference = 'en';
      const result = detectLanguage('Ahoj', { userPreference });
      
      expect(result.language).toBe(userPreference);
    });
  });
});
```

**Status:** PLANNED

---

#### Memory Service Tests

File: `backend/tests/unit/memory.service.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryService } from '@/services/memory.service';
import { Database } from '@/database';

describe('Memory Service', () => {
  let memoryService: MemoryService;
  let mockDb: Database;
  const testUserId = 'user-123';

  beforeEach(() => {
    mockDb = vi.mocked(new Database());
    memoryService = new MemoryService(mockDb);
  });

  describe('createMemory()', () => {
    it('should create new memory with correct fields', async () => {
      const input = {
        content: 'User likes coffee',
        type: 'preference' as const,
        importance: 8,
      };

      const result = await memoryService.createMemory(testUserId, input);

      expect(result).toMatchObject({
        content: input.content,
        type: input.type,
        importance: input.importance,
        version: 1,
        namespace: 'production',
      });
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeDefined();
    });

    it('should use explicit_user source for explicit memories', async () => {
      const result = await memoryService.createMemory(testUserId, {
        content: 'Test memory',
        type: 'fact',
        explicit: true,
      });

      expect(result.source).toBe('explicit_user');
      expect(result.confidence).toBe(1.0);
    });

    it('should use inferred source for AI-inferred memories', async () => {
      const result = await memoryService.createMemory(testUserId, {
        content: 'Inferred from conversation',
        type: 'fact',
        inferred: true,
      });

      expect(result.source).toBe('inferred');
      expect(result.confidence).toBeLessThan(1.0);
    });

    it('should isolate memory to correct user via namespace', async () => {
      await memoryService.createMemory(testUserId, {
        content: 'Secret memory',
        type: 'fact',
        namespace: 'production',
      });

      const memories = await memoryService.getMemories(testUserId, {
        namespace: 'production',
      });

      // Verify only this user's memories returned
      expect(memories.every(m => m.user_id === testUserId)).toBe(true);
    });

    it('should reject overly long content', async () => {
      const longContent = 'a'.repeat(100000);

      await expect(
        memoryService.createMemory(testUserId, {
          content: longContent,
          type: 'fact',
        })
      ).rejects.toThrow();
    });
  });

  describe('updateMemory() with correction ledger', () => {
    it('should create version entry when memory is corrected', async () => {
      // Create initial memory
      const memory = await memoryService.createMemory(testUserId, {
        content: 'User likes coffee',
        type: 'preference',
      });

      // Update memory
      const updated = await memoryService.updateMemory(testUserId, memory.id, {
        content: 'User no longer drinks coffee',
        reason: 'User explicitly stated change',
      });

      expect(updated.version).toBe(2);
      expect(updated.content).toBe('User no longer drinks coffee');
    });

    it('should prefer latest correction over older data', async () => {
      const memory = await memoryService.createMemory(testUserId, {
        content: 'Initial value',
        type: 'preference',
      });

      // First correction
      await memoryService.updateMemory(testUserId, memory.id, {
        content: 'Correction 1',
        reason: 'First update',
      });

      // Second correction
      const final = await memoryService.updateMemory(testUserId, memory.id, {
        content: 'Correction 2',
        reason: 'Second update',
      });

      expect(final.content).toBe('Correction 2');
      expect(final.version).toBe(3);
    });

    it('should track who made correction and when', async () => {
      const memory = await memoryService.createMemory(testUserId, {
        content: 'Original',
        type: 'fact',
      });

      const turnId = 'turn-123';
      await memoryService.updateMemory(testUserId, memory.id, {
        content: 'Corrected',
        turnId,
      });

      const versions = await memoryService.getMemoryVersions(memory.id);
      const correction = versions.find(v => v.version_number === 2);

      expect(correction).toBeDefined();
      expect(correction?.created_by_turn).toBe(turnId);
      expect(correction?.timestamp).toBeDefined();
    });

    it('should preserve importance changes in ledger', async () => {
      const memory = await memoryService.createMemory(testUserId, {
        content: 'Memory',
        type: 'preference',
        importance: 5,
      });

      await memoryService.updateMemory(testUserId, memory.id, {
        importance: 9,
        reason: 'This is very important',
      });

      const versions = await memoryService.getMemoryVersions(memory.id);
      const v2 = versions.find(v => v.version_number === 2);

      expect(v2?.previous_importance).toBe(5);
      expect(v2?.new_importance).toBe(9);
    });
  });

  describe('deleteMemory()', () => {
    it('should mark memory as deleted', async () => {
      const memory = await memoryService.createMemory(testUserId, {
        content: 'To be deleted',
        type: 'fact',
      });

      await memoryService.deleteMemory(testUserId, memory.id);

      // Should not appear in queries
      const memories = await memoryService.getMemories(testUserId);
      expect(memories.find(m => m.id === memory.id)).toBeUndefined();
    });

    it('should prevent access to deleted memory', async () => {
      const memory = await memoryService.createMemory(testUserId, {
        content: 'Secret',
        type: 'fact',
      });

      await memoryService.deleteMemory(testUserId, memory.id);

      await expect(
        memoryService.getMemory(testUserId, memory.id)
      ).rejects.toThrow();
    });
  });

  describe('getMemories() with filtering', () => {
    beforeEach(async () => {
      await memoryService.createMemory(testUserId, {
        content: 'Preference 1',
        type: 'preference',
        tags: ['beverage'],
      });

      await memoryService.createMemory(testUserId, {
        content: 'Fact 1',
        type: 'fact',
        tags: ['hobby'],
      });

      await memoryService.createMemory(testUserId, {
        content: 'Goal 1',
        type: 'goal',
        tags: ['fitness'],
      });
    });

    it('should filter by type', async () => {
      const prefs = await memoryService.getMemories(testUserId, {
        type: 'preference',
      });

      expect(prefs.every(m => m.type === 'preference')).toBe(true);
    });

    it('should filter by tags', async () => {
      const hobbies = await memoryService.getMemories(testUserId, {
        tags: ['hobby'],
      });

      expect(hobbies.some(m => m.tags.includes('hobby'))).toBe(true);
    });

    it('should search by content', async () => {
      const results = await memoryService.getMemories(testUserId, {
        search: 'Preference',
      });

      expect(results.some(m => m.content.includes('Preference'))).toBe(true);
    });

    it('should respect namespace isolation', async () => {
      const prodMemories = await memoryService.getMemories(testUserId, {
        namespace: 'production',
      });

      expect(prodMemories.every(m => m.namespace === 'production')).toBe(true);
    });
  });
});
```

**Status:** PLANNED

---

#### AI Provider Abstraction Tests

File: `backend/tests/unit/ai-provider.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIProviderFactory } from '@/providers/factory';
import { GoogleGeminiProvider } from '@/providers/google-gemini.provider';
import { AnthropicClaudeProvider } from '@/providers/anthropic-claude.provider';

describe('AI Provider Abstraction', () => {
  describe('Provider Factory', () => {
    it('should return Gemini provider by default', () => {
      const provider = AIProviderFactory.getProvider();
      expect(provider).toBeInstanceOf(GoogleGeminiProvider);
    });

    it('should return requested provider', () => {
      const gemini = AIProviderFactory.getProvider('gemini');
      expect(gemini).toBeInstanceOf(GoogleGeminiProvider);

      const claude = AIProviderFactory.getProvider('claude');
      expect(claude).toBeInstanceOf(AnthropicClaudeProvider);
    });

    it('should fallback to default if requested provider unavailable', () => {
      const provider = AIProviderFactory.getProvider('nonexistent');
      expect(provider).toBeDefined();
      expect(provider).toBeInstanceOf(GoogleGeminiProvider);
    });
  });

  describe('Provider Interface Compliance', () => {
    it('should have generateResponse method', async () => {
      const provider = AIProviderFactory.getProvider('gemini');
      expect(provider.generateResponse).toBeDefined();
      expect(typeof provider.generateResponse).toBe('function');
    });

    it('should have streamResponse method', async () => {
      const provider = AIProviderFactory.getProvider('gemini');
      expect(provider.streamResponse).toBeDefined();
      expect(typeof provider.streamResponse).toBe('function');
    });

    it('should have detectCapabilities method', async () => {
      const provider = AIProviderFactory.getProvider('gemini');
      const capabilities = await provider.detectCapabilities();

      expect(capabilities).toHaveProperty('supportsStreaming');
      expect(capabilities).toHaveProperty('supportedLanguages');
      expect(capabilities).toHaveProperty('maxTokens');
    });
  });

  describe('Provider Configuration', () => {
    it('should validate API key on init', async () => {
      const provider = new GoogleGeminiProvider('invalid-key');

      await expect(provider.validateConfig()).rejects.toThrow();
    });

    it('should support provider switching', async () => {
      const gemini = AIProviderFactory.getProvider('gemini');
      const claude = AIProviderFactory.getProvider('claude');

      expect(gemini.constructor.name).not.toBe(claude.constructor.name);
    });
  });
});
```

**Status:** PLANNED

---

### 3.2 Frontend Unit Tests

**Technology:** Vitest + React Testing Library

File: `frontend/tests/unit/hooks/useMemory.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useMemory } from '@/hooks/useMemory';
import * as api from '@/services/api';

vi.mock('@/services/api');

describe('useMemory Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch memory on mount', async () => {
    const mockMemory = {
      id: 'mem-1',
      content: 'Test memory',
      type: 'preference',
    };

    vi.mocked(api.getMemory).mockResolvedValue(mockMemory);

    const { result } = renderHook(() => useMemory('mem-1'));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.memory).toEqual(mockMemory);
  });

  it('should update memory', async () => {
    const updated = {
      id: 'mem-1',
      content: 'Updated content',
      type: 'fact',
      version: 2,
    };

    vi.mocked(api.updateMemory).mockResolvedValue(updated);

    const { result } = renderHook(() => useMemory('mem-1'));

    await act(async () => {
      await result.current.update({ content: 'Updated content' });
    });

    expect(result.current.memory).toEqual(updated);
  });

  it('should delete memory', async () => {
    vi.mocked(api.deleteMemory).mockResolvedValue({ success: true });

    const { result } = renderHook(() => useMemory('mem-1'));

    await act(async () => {
      await result.current.delete();
    });

    expect(result.current.memory).toBeNull();
  });

  it('should handle errors', async () => {
    const error = new Error('API error');
    vi.mocked(api.getMemory).mockRejectedValue(error);

    const { result } = renderHook(() => useMemory('mem-1'));

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });

    expect(result.current.error?.message).toBe('API error');
  });
});
```

**Status:** PLANNED

---

## 4. Integration Tests

### 4.1 Database Integration Tests

File: `backend/tests/integration/memory-namespace-isolation.test.ts`

**CRITICAL: Testing namespace isolation between users**

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Database } from '@/database';
import { MemoryService } from '@/services/memory.service';

describe('Memory Namespace Isolation (CRITICAL)', () => {
  let db: Database;
  let memoryService: MemoryService;
  const user1Id = 'user-1-' + Date.now();
  const user2Id = 'user-2-' + Date.now();

  beforeEach(async () => {
    db = new Database(process.env.TEST_DATABASE_URL);
    await db.connect();
    memoryService = new MemoryService(db);

    // Create test users
    await db.query(
      'INSERT INTO users (id, email, username) VALUES ($1, $2, $3)',
      [user1Id, `user1-${Date.now()}@test.com`, `user1-${Date.now()}`]
    );
    await db.query(
      'INSERT INTO users (id, email, username) VALUES ($1, $2, $3)',
      [user2Id, `user2-${Date.now()}@test.com`, `user2-${Date.now()}`]
    );
  });

  afterEach(async () => {
    // Clean up
    await db.query('DELETE FROM memories WHERE user_id IN ($1, $2)', [user1Id, user2Id]);
    await db.query('DELETE FROM users WHERE id IN ($1, $2)', [user1Id, user2Id]);
    await db.disconnect();
  });

  describe('Namespace Isolation', () => {
    it('MUST prevent user1 from accessing user2 memories', async () => {
      // User1 creates memory
      const mem1 = await memoryService.createMemory(user1Id, {
        content: 'Secret from user1',
        type: 'preference',
        namespace: 'production',
      });

      // User2 tries to access it - should fail
      await expect(
        memoryService.getMemory(user2Id, mem1.id)
      ).rejects.toThrow();
    });

    it('MUST prevent user1 from updating user2 memories', async () => {
      // User1 creates memory
      const mem1 = await memoryService.createMemory(user1Id, {
        content: 'Original',
        type: 'fact',
      });

      // User2 tries to update - should fail
      await expect(
        memoryService.updateMemory(user2Id, mem1.id, {
          content: 'Hacked!',
        })
      ).rejects.toThrow();

      // Verify original still intact
      const verify = await memoryService.getMemory(user1Id, mem1.id);
      expect(verify.content).toBe('Original');
    });

    it('MUST prevent user1 from deleting user2 memories', async () => {
      // User1 creates memory
      const mem1 = await memoryService.createMemory(user1Id, {
        content: 'Important',
        type: 'preference',
      });

      // User2 tries to delete - should fail
      await expect(
        memoryService.deleteMemory(user2Id, mem1.id)
      ).rejects.toThrow();

      // Verify still exists for user1
      const verify = await memoryService.getMemory(user1Id, mem1.id);
      expect(verify).toBeDefined();
    });

    it('MUST not leak memories in list endpoints', async () => {
      // Create memories for both users
      await memoryService.createMemory(user1Id, {
        content: 'User1 secret',
        type: 'fact',
      });

      await memoryService.createMemory(user2Id, {
        content: 'User2 secret',
        type: 'fact',
      });

      // User1 lists memories - should only see own
      const user1Memories = await memoryService.getMemories(user1Id);
      expect(user1Memories.every(m => m.user_id === user1Id)).toBe(true);
      expect(user1Memories.some(m => m.user_id === user2Id)).toBe(false);

      // User2 lists memories - should only see own
      const user2Memories = await memoryService.getMemories(user2Id);
      expect(user2Memories.every(m => m.user_id === user2Id)).toBe(true);
      expect(user2Memories.some(m => m.user_id === user1Id)).toBe(false);
    });

    it('MUST not leak memories through search', async () => {
      const secret = 'CLASSIFIED_INFORMATION_' + Date.now();

      await memoryService.createMemory(user1Id, {
        content: `Secret: ${secret}`,
        type: 'fact',
      });

      // User2 searches for the same term - should not find it
      const results = await memoryService.getMemories(user2Id, {
        search: secret,
      });

      expect(results).toHaveLength(0);
    });

    it('MUST not leak memories through tag filtering', async () => {
      const uniqueTag = 'secret-tag-' + Date.now();

      await memoryService.createMemory(user1Id, {
        content: 'Tagged secret',
        type: 'fact',
        tags: [uniqueTag],
      });

      // User2 filters by tag - should not find it
      const results = await memoryService.getMemories(user2Id, {
        tags: [uniqueTag],
      });

      expect(results).toHaveLength(0);
    });
  });

  describe('Production vs Lab Namespace', () => {
    it('MUST isolate production memories from lab memories', async () => {
      // Create memory in production
      const prodMem = await memoryService.createMemory(user1Id, {
        content: 'Production memory',
        type: 'fact',
        namespace: 'production',
      });

      // Create memory in lab
      const labMem = await memoryService.createMemory(user1Id, {
        content: 'Lab memory',
        type: 'fact',
        namespace: 'lab',
      });

      // Production query should not return lab memory
      const prodMemories = await memoryService.getMemories(user1Id, {
        namespace: 'production',
      });

      expect(prodMemories.find(m => m.id === prodMem.id)).toBeDefined();
      expect(prodMemories.find(m => m.id === labMem.id)).toBeUndefined();

      // Lab query should not return production memory
      const labMemories = await memoryService.getMemories(user1Id, {
        namespace: 'lab',
      });

      expect(labMemories.find(m => m.id === labMem.id)).toBeDefined();
      expect(labMemories.find(m => m.id === prodMem.id)).toBeUndefined();
    });

    it('MUST prevent querying across namespaces without explicit filter', async () => {
      await memoryService.createMemory(user1Id, {
        content: 'Prod',
        type: 'fact',
        namespace: 'production',
      });

      await memoryService.createMemory(user1Id, {
        content: 'Lab',
        type: 'fact',
        namespace: 'lab',
      });

      // Default query should only return production
      const memories = await memoryService.getMemories(user1Id);

      expect(memories.every(m => m.namespace === 'production')).toBe(true);
    });
  });

  describe('Correction Ledger Isolation', () => {
    it('MUST isolate correction ledger between users', async () => {
      const mem1 = await memoryService.createMemory(user1Id, {
        content: 'Original',
        type: 'fact',
      });

      // User1 corrects their memory
      await memoryService.updateMemory(user1Id, mem1.id, {
        content: 'Corrected by user1',
      });

      // Get versions - should only show user1's correction
      const versions = await memoryService.getMemoryVersions(mem1.id);

      expect(versions.every(v => v.user_id === user1Id)).toBe(true);
    });
  });
});
```

**Status:** PLANNED

---

### 4.2 API Integration Tests

File: `backend/tests/integration/api-memory-endpoints.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { build } from '@/app';
import axios from 'axios';

describe('Memory API Endpoints', () => {
  let app;
  let client;
  let user1Token;
  let user2Token;
  let baseUrl = 'http://localhost:3000';

  beforeEach(async () => {
    app = await build({ logger: false });
    await app.listen({ port: 3000 });

    client = axios.create({
      baseURL: baseUrl,
      validateStatus: () => true, // Don't throw on any status
    });

    // Register and login two users
    const user1Res = await client.post('/auth/register', {
      email: `test1-${Date.now()}@example.com`,
      username: `testuser1-${Date.now()}`,
      password: 'SecurePass123!',
    });
    user1Token = user1Res.data.data.accessToken;

    const user2Res = await client.post('/auth/register', {
      email: `test2-${Date.now()}@example.com`,
      username: `testuser2-${Date.now()}`,
      password: 'SecurePass123!',
    });
    user2Token = user2Res.data.data.accessToken;
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /memory - Create memory', () => {
    it('should create memory with valid data', async () => {
      const response = await client.post(
        '/memory',
        {
          content: 'Test memory',
          type: 'preference',
          importance: 8,
        },
        {
          headers: { Authorization: `Bearer ${user1Token}` },
        }
      );

      expect(response.status).toBe(201);
      expect(response.data.data.id).toBeDefined();
      expect(response.data.data.version).toBe(1);
    });

    it('should reject empty content', async () => {
      const response = await client.post(
        '/memory',
        {
          content: '',
          type: 'preference',
        },
        {
          headers: { Authorization: `Bearer ${user1Token}` },
        }
      );

      expect(response.status).toBe(400);
      expect(response.data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should require authentication', async () => {
      const response = await client.post('/memory', {
        content: 'Test',
        type: 'preference',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /memory/:id - Retrieve memory', () => {
    it('should retrieve own memory', async () => {
      // Create memory
      const createRes = await client.post(
        '/memory',
        { content: 'My memory', type: 'fact' },
        { headers: { Authorization: `Bearer ${user1Token}` } }
      );
      const memoryId = createRes.data.data.id;

      // Retrieve it
      const getRes = await client.get(`/memory/${memoryId}`, {
        headers: { Authorization: `Bearer ${user1Token}` },
      });

      expect(getRes.status).toBe(200);
      expect(getRes.data.data.memory.content).toBe('My memory');
    });

    it('MUST prevent accessing other user memory', async () => {
      // User1 creates memory
      const createRes = await client.post(
        '/memory',
        { content: 'Secret', type: 'fact' },
        { headers: { Authorization: `Bearer ${user1Token}` } }
      );
      const memoryId = createRes.data.data.id;

      // User2 tries to access - should be forbidden
      const getRes = await client.get(`/memory/${memoryId}`, {
        headers: { Authorization: `Bearer ${user2Token}` },
      });

      expect(getRes.status).toBe(403);
    });
  });

  describe('PATCH /memory/:id - Update memory', () => {
    it('should update memory and create version', async () => {
      // Create
      const createRes = await client.post(
        '/memory',
        { content: 'Original', type: 'preference' },
        { headers: { Authorization: `Bearer ${user1Token}` } }
      );
      const memoryId = createRes.data.data.id;

      // Update
      const updateRes = await client.patch(
        `/memory/${memoryId}`,
        { content: 'Updated' },
        { headers: { Authorization: `Bearer ${user1Token}` } }
      );

      expect(updateRes.status).toBe(200);
      expect(updateRes.data.data.version).toBe(2);
      expect(updateRes.data.data.content).toBe('Updated');
    });

    it('MUST prevent user2 from updating user1 memory', async () => {
      // User1 creates
      const createRes = await client.post(
        '/memory',
        { content: 'Original', type: 'fact' },
        { headers: { Authorization: `Bearer ${user1Token}` } }
      );
      const memoryId = createRes.data.data.id;

      // User2 tries to update
      const updateRes = await client.patch(
        `/memory/${memoryId}`,
        { content: 'Hacked!' },
        { headers: { Authorization: `Bearer ${user2Token}` } }
      );

      expect(updateRes.status).toBe(403);
    });

    it('should track correction in ledger', async () => {
      // Create and update
      const createRes = await client.post(
        '/memory',
        { content: 'Original', type: 'preference' },
        { headers: { Authorization: `Bearer ${user1Token}` } }
      );
      const memoryId = createRes.data.data.id;

      await client.patch(
        `/memory/${memoryId}`,
        { content: 'Corrected' },
        { headers: { Authorization: `Bearer ${user1Token}` } }
      );

      // Fetch versions
      const versionsRes = await client.get(`/memory/${memoryId}`, {
        headers: { Authorization: `Bearer ${user1Token}` },
      });

      expect(versionsRes.data.data.versions.length).toBeGreaterThan(1);
      const v2 = versionsRes.data.data.versions.find(v => v.version_number === 2);
      expect(v2?.previous_content).toBe('Original');
      expect(v2?.new_content).toBe('Corrected');
    });
  });

  describe('DELETE /memory/:id - Delete memory', () => {
    it('should delete own memory', async () => {
      // Create
      const createRes = await client.post(
        '/memory',
        { content: 'To delete', type: 'fact' },
        { headers: { Authorization: `Bearer ${user1Token}` } }
      );
      const memoryId = createRes.data.data.id;

      // Delete
      const deleteRes = await client.delete(`/memory/${memoryId}`, {
        headers: { Authorization: `Bearer ${user1Token}` },
      });

      expect(deleteRes.status).toBe(200);

      // Verify deleted
      const getRes = await client.get(`/memory/${memoryId}`, {
        headers: { Authorization: `Bearer ${user1Token}` },
      });

      expect(getRes.status).toBe(404);
    });

    it('MUST prevent user2 from deleting user1 memory', async () => {
      // User1 creates
      const createRes = await client.post(
        '/memory',
        { content: 'Important', type: 'preference' },
        { headers: { Authorization: `Bearer ${user1Token}` } }
      );
      const memoryId = createRes.data.data.id;

      // User2 tries to delete
      const deleteRes = await client.delete(`/memory/${memoryId}`, {
        headers: { Authorization: `Bearer ${user2Token}` },
      });

      expect(deleteRes.status).toBe(403);
    });
  });

  describe('GET /memory - List with isolation', () => {
    it('MUST only return authenticated user memories', async () => {
      // User1 creates multiple memories
      await client.post(
        '/memory',
        { content: 'User1 mem1', type: 'fact' },
        { headers: { Authorization: `Bearer ${user1Token}` } }
      );
      await client.post(
        '/memory',
        { content: 'User1 mem2', type: 'preference' },
        { headers: { Authorization: `Bearer ${user1Token}` } }
      );

      // User2 creates memory
      await client.post(
        '/memory',
        { content: 'User2 mem1', type: 'fact' },
        { headers: { Authorization: `Bearer ${user2Token}` } }
      );

      // User1 lists - should only see their own
      const user1ListRes = await client.get('/memory', {
        headers: { Authorization: `Bearer ${user1Token}` },
      });

      expect(user1ListRes.data.data.memories.every(m =>
        m.content.startsWith('User1')
      )).toBe(true);

      expect(user1ListRes.data.data.memories.some(m =>
        m.content.startsWith('User2')
      )).toBe(false);
    });
  });
});
```

**Status:** PLANNED

---

## 5. End-to-End Tests

File: `frontend/tests/e2e/memory-workflow.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Memory Workflow E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
  });

  test('should create, view, and update memory', async ({ page }) => {
    // Register
    await page.click('text=Sign Up');
    await page.fill('input[name=email]', `test-${Date.now()}@example.com`);
    await page.fill('input[name=username]', `testuser-${Date.now()}`);
    await page.fill('input[name=password]', 'SecurePass123!');
    await page.click('button:has-text("Create Account")');

    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard');

    // Create memory
    await page.click('text=Add Memory');
    await page.fill('textarea[name=content]', 'I like coffee in the morning');
    await page.selectOption('select[name=type]', 'preference');
    await page.fill('input[name=importance]', '8');
    await page.click('button:has-text("Save Memory")');

    // Verify memory created
    await page.waitForSelector('text=I like coffee in the morning');
    expect(page.locator('text=I like coffee in the morning')).toBeTruthy();

    // Edit memory
    await page.click('button:has-text("Edit")');
    await page.fill('textarea[name=content]', 'I like coffee in the morning, especially espresso');
    await page.click('button:has-text("Update Memory")');

    // Verify update and version tracking
    await expect(page.locator('text=Version 2')).toBeVisible();
  });

  test('user isolation: cannot access other user data', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // User 1 registers and creates memory
    await page1.goto('http://localhost:5173');
    await page1.click('text=Sign Up');
    await page1.fill('input[name=email]', `user1-${Date.now()}@example.com`);
    await page1.fill('input[name=username]', `user1-${Date.now()}`);
    await page1.fill('input[name=password]', 'SecurePass123!');
    await page1.click('button:has-text("Create Account")');
    await page1.waitForURL('**/dashboard');

    // Create secret memory
    await page1.click('text=Add Memory');
    await page1.fill('textarea[name=content]', 'SECRET_MEMORY_' + Date.now());
    await page1.click('button:has-text("Save Memory")');
    await page1.waitForSelector('text=SECRET_MEMORY');

    // Get memory ID from URL or data
    const memoryId = await page1.evaluate(() => {
      return document.querySelector('[data-memory-id]')?.getAttribute('data-memory-id');
    });

    // User 2 registers
    await page2.goto('http://localhost:5173');
    await page2.click('text=Sign Up');
    await page2.fill('input[name=email]', `user2-${Date.now()}@example.com`);
    await page2.fill('input[name=username]', `user2-${Date.now()}`);
    await page2.fill('input[name=password]', 'SecurePass123!');
    await page2.click('button:has-text("Create Account")');
    await page2.waitForURL('**/dashboard');

    // User 2 tries to access User 1's memory via URL
    await page2.goto(`http://localhost:5173/memory/${memoryId}`);

    // Should be forbidden or redirected
    await expect(page2.locator('text=Unauthorized|Not Found|Access Denied')).toBeVisible();

    await context1.close();
    await context2.close();
  });
});
```

**Status:** PLANNED

---

## 6. Lab Testing

### 6.1 Experimental Lab Environment

File: `backend/tests/lab/memory-experiment.ts`

```typescript
import { Database } from '@/database';
import { MemoryService } from '@/services/memory.service';
import { TestProfile, TestSnapshot } from '@/types/lab';

/**
 * Lab experiment: Test memory persistence across 100 conversations
 */
export async function experimentMemoryPersistence() {
  const db = new Database(process.env.TEST_DATABASE_URL);
  await db.connect();

  const profile = await db.query(
    `INSERT INTO test_profiles (namespace, profile_name, description)
     VALUES ($1, $2, $3)
     RETURNING *`,
    ['memory-persistence-exp', 'Test memory persists across conversations', 'v1.0.0']
  );

  const profileId = profile.rows[0].id;
  const memoryService = new MemoryService(db);

  console.log('🧪 Lab Experiment: Memory Persistence');
  console.log('=====================================\n');

  // Phase 1: Create test profile with initial memories
  console.log('Phase 1: Setting up profile with 50 memories...');

  const memories = [];
  for (let i = 0; i < 50; i++) {
    const mem = await memoryService.createMemory(profileId, {
      content: `Memory ${i}: Important fact number ${i}`,
      type: i % 2 === 0 ? 'preference' : 'fact',
      importance: Math.floor(Math.random() * 10) + 1,
      namespace: 'lab',
    });
    memories.push(mem);
  }

  // Take snapshot
  const snapshot1 = await db.query(
    `INSERT INTO test_snapshots (profile_id, snapshot_name, memory_snapshot)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [profileId, 'initial-memories', JSON.stringify(memories)]
  );

  console.log(`✅ Created 50 memories, snapshot ID: ${snapshot1.rows[0].id}\n`);

  // Phase 2: Simulate 100 conversations (retrieve and potentially modify)
  console.log('Phase 2: Simulating 100 conversations...');

  for (let conv = 0; conv < 100; conv++) {
    const retrieved = await memoryService.getMemories(profileId, {
      namespace: 'lab',
      limit: 10,
    });

    if (retrieved.length === 0) {
      console.error(`❌ Conversation ${conv}: No memories retrieved!`);
      process.exit(1);
    }

    // Randomly update one memory
    if (Math.random() > 0.7) {
      const memToUpdate = retrieved[Math.floor(Math.random() * retrieved.length)];
      await memoryService.updateMemory(profileId, memToUpdate.id, {
        importance: Math.floor(Math.random() * 10) + 1,
      });
    }

    if ((conv + 1) % 20 === 0) {
      console.log(`  ✓ Completed ${conv + 1} conversations`);
    }
  }

  // Phase 3: Verify memory integrity
  console.log('\nPhase 3: Verifying memory integrity...');

  const finalMemories = await memoryService.getMemories(profileId, {
    namespace: 'lab',
  });

  let passCount = 0;
  for (const originalMemory of memories) {
    const found = finalMemories.find(m => m.id === originalMemory.id);

    if (!found) {
      console.error(`❌ Memory ${originalMemory.id} not found!`);
    } else if (found.content !== originalMemory.content) {
      console.error(`❌ Memory ${originalMemory.id} content corrupted!`);
    } else {
      passCount++;
    }
  }

  // Phase 4: Test snapshot rollback
  console.log('\nPhase 4: Testing snapshot rollback...');

  // Take another snapshot
  const snapshot2 = await db.query(
    `INSERT INTO test_snapshots (profile_id, snapshot_name, memory_snapshot)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [profileId, 'after-100-conversations', JSON.stringify(finalMemories)]
  );

  console.log(`✅ Snapshot 2 created: ${snapshot2.rows[0].id}`);

  console.log('\n=====================================');
  console.log(`Test Results:`);
  console.log(`✅ Memories persisted: ${passCount}/${memories.length}`);
  console.log(`📊 Success rate: ${(passCount / memories.length * 100).toFixed(2)}%`);

  if (passCount === memories.length) {
    console.log('\n🎉 EXPERIMENT PASSED: All memories persisted correctly!');
  } else {
    console.log('\n❌ EXPERIMENT FAILED: Some memories were lost or corrupted!');
    process.exit(1);
  }

  await db.disconnect();
}

// Run experiment
experimentMemoryPersistence().catch(console.error);
```

Run with:
```bash
npm run lab:memory-persistence
```

**Status:** PLANNED

---

## 7. Security Tests

File: `backend/tests/security/authorization.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { build } from '@/app';
import axios from 'axios';

describe('Authorization Security Tests', () => {
  let app;
  let client;

  beforeEach(async () => {
    app = await build({ logger: false });
    await app.listen({ port: 3001 });

    client = axios.create({
      baseURL: 'http://localhost:3001',
      validateStatus: () => true,
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should not allow SQL injection in memory search', async () => {
      const token = await loginUser(client);

      const injection = "'; DROP TABLE memories; --";

      const response = await client.get(`/memory?search=${injection}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Should not drop table, query should safely escape
      expect(response.status).toBe(200);
    });
  });

  describe('XSS Prevention', () => {
    it('should escape HTML in memory content', async () => {
      const token = await loginUser(client);

      const xssPayload = '<script>alert("xss")</script>';

      await client.post(
        '/memory',
        {
          content: xssPayload,
          type: 'fact',
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Content should be escaped/safe
      const memRes = await client.get('/memory', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const mem = memRes.data.data.memories[0];
      expect(mem.content).not.toContain('<script>');
    });
  });

  describe('CSRF Protection', () => {
    it('should reject requests without proper tokens', async () => {
      // State-changing request without CSRF token should fail
      const response = await client.post('/memory', {
        content: 'Test',
        type: 'fact',
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      const token = await loginUser(client);

      // Make 60 requests (limit is 50/hour)
      let limitExceeded = false;

      for (let i = 0; i < 60; i++) {
        const response = await client.get('/memory', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.status === 429) {
          limitExceeded = true;
          break;
        }
      }

      expect(limitExceeded).toBe(true);
    });
  });
});

async function loginUser(client) {
  const registerRes = await client.post('/auth/register', {
    email: `test-${Date.now()}@example.com`,
    username: `testuser-${Date.now()}`,
    password: 'SecurePass123!',
  });

  return registerRes.data.data.accessToken;
}
```

**Status:** PLANNED

---

## 8. Test Execution

### 8.1 Running All Tests

```bash
# Backend unit tests
cd backend && npm test

# Backend integration tests (requires DB)
npm run test:integration

# Frontend unit tests
cd frontend && npm test

# Frontend E2E tests (requires running app)
npm run test:e2e

# Lab experiments
npm run lab

# Security tests
npm run test:security

# All with coverage
npm run test:coverage
```

### 8.2 CI/CD Testing

GitHub Actions workflow (`.github/workflows/test.yml`):

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_PASSWORD: password
          POSTGRES_DB: tolog_one_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: |
          cd backend && npm ci
          cd ../frontend && npm ci
      
      - name: Run backend tests
        run: cd backend && npm test -- --run
        env:
          TEST_DATABASE_URL: postgresql://postgres:password@localhost/tolog_one_test
      
      - name: Run frontend tests
        run: cd frontend && npm test -- --run
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./backend/coverage/coverage-final.json,./frontend/coverage/coverage-final.json
```

**Status:** PLANNED

---

## 9. Test Data Management

### 9.1 Test Data Fixtures

File: `backend/tests/fixtures/memory-fixtures.ts`

```typescript
export const memoryFixtures = {
  preference: {
    content: 'User prefers morning coffee',
    type: 'preference',
    importance: 8,
    tags: ['beverage', 'routine'],
  },
  
  fact: {
    content: 'User has a dog named Max',
    type: 'fact',
    importance: 7,
    tags: ['pet', 'family'],
  },
  
  goal: {
    content: 'Learn German language',
    type: 'goal',
    importance: 9,
    tags: ['learning', 'language'],
  },
};
```

### 9.2 Database Reset Between Tests

```typescript
beforeEach(async () => {
  // Reset test database
  await db.query('DELETE FROM memory_versions');
  await db.query('DELETE FROM memories');
  await db.query('DELETE FROM conversation_turns');
  await db.query('DELETE FROM conversations');
  await db.query('DELETE FROM refresh_tokens');
});
```

**Status:** PLANNED

---

## 10. Test Metrics & Goals

### 10.1 Coverage Targets

| Area | Target | Current |
|------|--------|---------|
| Lines | 80% | TBD |
| Branches | 75% | TBD |
| Functions | 80% | TBD |
| Statements | 80% | TBD |
| **Memory Tests** | 95% | TBD |
| **Authorization Tests** | 100% | TBD |

### 10.2 Critical Path Tests

Must PASS before any release:
- ✅ Namespace isolation (user cannot access other user data)
- ✅ Memory persistence (survives app restart)
- ✅ Correction ledger (tracks all corrections)
- ✅ Language detection (accurate across 10+ languages)
- ✅ Authentication (tokens work correctly)
- ✅ Authorization (endpoints properly protected)

**Status:** PLANNED

---

## 11. Implementation Checklist

| Component | Unit Tests | Integration Tests | E2E Tests | Status |
|-----------|-----------|------------------|-----------|--------|
| Language Detection | ✓ | ✓ | - | PLANNED |
| Memory Service | ✓ | ✓ | ✓ | PLANNED |
| Memory Correction Ledger | ✓ | ✓ | ✓ | PLANNED |
| User Isolation | ✓ | ✓ | ✓ | PLANNED |
| AI Provider Abstraction | ✓ | - | - | PLANNED |
| Authentication | ✓ | ✓ | ✓ | PLANNED |
| API Endpoints | - | ✓ | ✓ | PLANNED |
| Database | ✓ | ✓ | - | PLANNED |

---

**End of Testing Strategy Document**
