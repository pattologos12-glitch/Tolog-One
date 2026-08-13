# TOLOG ONE - Development Guide

**Version:** 1.0  
**Date:** 2026-08-13  
**Target Audience:** Developers setting up local development environment

---

## 1. Prerequisites

### Required

- **Node.js** 20.x or higher
- **npm** 9.x or higher (or yarn/pnpm)
- **Docker** & **Docker Compose** (for PostgreSQL, Redis)
- **Git**
- **VS Code** (recommended) or similar editor
- **Postman** or **Insomnia** (for API testing)

### Optional

- **TypeScript** knowledge
- **React** knowledge
- **SQL** knowledge
- **PostgreSQL** client tools (psql, pgAdmin)

---

## 2. Repository Setup

### 2.1 Clone Repository

```bash
git clone https://github.com/pattologos12-glitch/Tolog-One.git
cd Tolog-One
```

### 2.2 Project Structure

```
Tolog-One/
├── .github/
│   └── workflows/          # CI/CD workflows
├── backend/
│   ├── src/
│   │   ├── index.ts        # Main server entry
│   │   ├── config/         # Configuration
│   │   ├── middleware/     # Fastify middleware
│   │   ├── routes/         # API endpoints
│   │   ├── services/       # Business logic
│   │   ├── database/       # Database setup
│   │   ├── models/         # Data models
│   │   ├── providers/      # AI provider implementations
│   │   ├── utils/          # Utilities
│   │   └── types/          # TypeScript types
│   ├── tests/              # Unit & integration tests
│   ├── migrations/         # Database migrations
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── main.tsx        # React entry point
│   │   ├── App.tsx         # Main component
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API client
│   │   ├── stores/         # State management
│   │   ├── types/          # TypeScript types
│   │   ├── utils/          # Utilities
│   │   └── styles/         # CSS/Tailwind
│   ├── tests/              # Component tests
│   ├── Dockerfile
│   ├── vite.config.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DATABASE_SCHEMA.md
│   ├── API_CONTRACT.md
│   ├── SECURITY.md
│   ├── DEPLOYMENT.md
│   ├── DEVELOPMENT.md      # This file
│   ├── ROADMAP.md
│   └── TESTING.md
├── docker-compose.yml
├── .env.example
├── .gitignore
├── .editorconfig
├── README.md
└── LICENSE

```

---

## 3. Backend Setup

### 3.1 Install Dependencies

```bash
cd backend
npm install
```

### 3.2 Environment Configuration

```bash
# Copy template
cp .env.example .env

# Edit with your values
nano .env
```

Required variables:
```bash
NODE_ENV=development
DATABASE_URL=postgresql://tolog_user:password@localhost:5432/tolog_one
JWT_SECRET=your-secret-key-for-development
JWT_REFRESH_SECRET=your-refresh-secret-key
GEMINI_API_KEY=your-actual-gemini-key
CLAUDE_API_KEY=your-actual-claude-key
FRONTEND_URL=http://localhost:5173
API_URL=http://localhost:3000
```

### 3.3 Database Setup

```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Wait for services to be ready
sleep 5

# Run migrations
npm run migrate:up

# Optional: Seed test data
npm run seed
```

### 3.4 Start Development Server

```bash
# With hot reload (watches TypeScript changes)
npm run dev

# Or build + run
npm run build
npm start
```

Server starts on `http://localhost:3000`

### 3.5 Testing Backend

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode (re-run on changes)
npm run test:watch

# Run specific test file
npm test -- auth.test.ts
```

**Status:** PLANNED

---

## 4. Frontend Setup

### 4.1 Install Dependencies

```bash
cd frontend
npm install
```

### 4.2 Environment Configuration

```bash
# Copy template
cp .env.example .env

# Should be pre-filled for local development
cat .env
```

Typical development config:
```bash
VITE_API_BASE_URL=http://localhost:3000
VITE_APP_NAME=TOLOG ONE
VITE_ENVIRONMENT=development
```

### 4.3 Start Development Server

```bash
# Start Vite dev server with hot reload
npm run dev

# Server starts on http://localhost:5173
```

### 4.4 Build for Production

```bash
# Build optimized bundle
npm run build

# Preview production build locally
npm run preview
```

### 4.5 Testing Frontend

```bash
# Run component tests (Vitest)
npm test

# Run with UI
npm run test:ui

# E2E tests (Cypress/Playwright)
npm run test:e2e

# Coverage
npm run test:coverage
```

**Status:** PLANNED

---

## 5. Running the Full Stack Locally

### 5.1 Using Docker Compose (Recommended)

```bash
# From project root
docker-compose up -d

# Check all services running
docker-compose ps

# View logs
docker-compose logs -f

# Access:
# Frontend: http://localhost:80
# Backend API: http://localhost:3000
# PostgreSQL: localhost:5432
# Redis: localhost:6379
```

### 5.2 Manual Setup (For Development)

**Terminal 1 - PostgreSQL & Redis:**
```bash
docker-compose up postgres redis
```

**Terminal 2 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 3 - Frontend:**
```bash
cd frontend
npm run dev
```

Then access:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`
- API docs: `http://localhost:3000/docs`

**Status:** PLANNED

---

## 6. Database Development

### 6.1 Creating Migrations

```bash
cd backend

# Create new migration
npm run migrate:create create_users_table

# Edit generated migration file
nano migrations/1692009600000_create_users_table.ts

# Run migration
npm run migrate:up

# Rollback if needed
npm run migrate:down
```

Migration template:

```typescript
// migrations/1692009600000_create_users_table.ts
import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder) {
  pgm.createTable('users', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    email: {
      type: 'varchar(255)',
      notNull: true,
      unique: true,
    },
    password_hash: {
      type: 'varchar(255)',
      notNull: true,
    },
    username: {
      type: 'varchar(100)',
      notNull: true,
      unique: true,
    },
    full_name: 'varchar(255)',
    preferred_language: 'varchar(10)',
    timezone: 'varchar(50)',
    is_active: {
      type: 'boolean',
      default: true,
    },
    metadata: {
      type: 'jsonb',
      default: '{}',
    },
    created_at: {
      type: 'timestamp with time zone',
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
    updated_at: {
      type: 'timestamp with time zone',
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  pgm.createIndex('users', 'email');
  pgm.createIndex('users', 'username');
}

export async function down(pgm: MigrationBuilder) {
  pgm.dropTable('users');
}
```

### 6.2 Database Inspection

```bash
# Connect to database directly
docker-compose exec postgres psql -U tolog_user -d tolog_one

# List tables
\dt

# View table schema
\d users

# Exit
\q
```

### 6.3 Seeding Development Data

Create `backend/seeds/dev-data.ts`:

```typescript
import { Database } from '../src/database';

export async function seedDevData(db: Database) {
  // Create test users
  await db.query(`
    INSERT INTO users (email, username, password_hash, full_name)
    VALUES 
      ('test1@example.com', 'testuser1', '$2b$12$...', 'Test User 1'),
      ('test2@example.com', 'testuser2', '$2b$12$...', 'Test User 2')
    ON CONFLICT DO NOTHING;
  `);

  // Create test conversations
  const user = await db.query(
    'SELECT id FROM users WHERE email = $1',
    ['test1@example.com']
  );

  if (user.rows.length > 0) {
    await db.query(`
      INSERT INTO conversations (user_id, title, language)
      VALUES ($1, 'Welcome Conversation', 'en')
    `, [user.rows[0].id]);
  }

  console.log('✅ Development data seeded');
}
```

Run seed:
```bash
npm run seed
```

**Status:** PLANNED

---

## 7. API Development

### 7.1 Creating New Endpoints

Create `backend/src/routes/example.ts`:

```typescript
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticateUser } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { z } from 'zod';

const createExampleSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
});

type CreateExampleRequest = z.infer<typeof createExampleSchema>;

export async function exampleRoutes(app: FastifyInstance) {
  // GET /examples
  app.get<{ Querystring: { limit: number; offset: number } }>(
    '/examples',
    {
      preHandler: [authenticateUser],
      schema: {
        tags: ['examples'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  examples: { type: 'array' },
                  pagination: { type: 'object' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const limit = Math.min(request.query.limit || 20, 100);
      const offset = request.query.offset || 0;

      // Implementation here
      reply.send({
        success: true,
        data: {
          examples: [],
          pagination: { limit, offset },
        },
      });
    }
  );

  // POST /examples
  app.post<{ Body: CreateExampleRequest }>(
    '/examples',
    {
      preHandler: [authenticateUser],
      schema: {
        tags: ['examples'],
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: CreateExampleRequest }>, reply: FastifyReply) => {
      const validated = createExampleSchema.parse(request.body);

      // Implementation here

      reply.code(201).send({
        success: true,
        data: { id: 'new-id', ...validated },
      });
    }
  );
}
```

Register in `backend/src/index.ts`:

```typescript
import { exampleRoutes } from './routes/example';

// ... in main function
app.register(exampleRoutes, { prefix: '/api' });
```

### 7.2 Swagger/OpenAPI Documentation

Swagger is auto-generated from schema definitions:

```bash
# Access at http://localhost:3000/docs
```

Add to each route:
```typescript
schema: {
  tags: ['examples'],
  summary: 'Get examples',
  description: 'Retrieve all examples for current user',
  response: {
    200: { ... }
  }
}
```

**Status:** PLANNED

---

## 8. Frontend Component Development

### 8.1 Creating New Components

Create `frontend/src/components/ExampleCard.tsx`:

```typescript
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ExampleCardProps {
  title: string;
  description?: string;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const ExampleCard: React.FC<ExampleCardProps> = ({
  title,
  description,
  onEdit,
  onDelete,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {description && <p className="text-sm text-gray-600">{description}</p>}
        <div className="flex gap-2 mt-4">
          {onEdit && (
            <button
              onClick={onEdit}
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Delete
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
```

### 8.2 Creating Custom Hooks

Create `frontend/src/hooks/useExample.ts`:

```typescript
import { useState, useEffect } from 'react';
import { apiClient } from '@/services/api';

interface Example {
  id: string;
  name: string;
  description?: string;
}

export function useExample(exampleId: string) {
  const [example, setExample] = useState<Example | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get(`/examples/${exampleId}`);
        setExample(response.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [exampleId]);

  return { example, loading, error };
}
```

### 8.3 API Client Service

Create `frontend/src/services/api.ts`:

```typescript
import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Include cookies
});

// Add token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token refresh on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Try to refresh token
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const response = await axios.post(`${baseURL}/auth/refresh`, {
          refreshToken,
        });
        localStorage.setItem('accessToken', response.data.accessToken);
        localStorage.setItem('refreshToken', response.data.refreshToken);

        // Retry original request
        return apiClient.request(error.config);
      } catch {
        // Refresh failed, redirect to login
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

**Status:** PLANNED

---

## 9. Code Style & Linting

### 9.1 ESLint Configuration

```bash
# Run linter
npm run lint

# Fix automatically
npm run lint:fix
```

### 9.2 Prettier Formatting

```bash
# Format code
npm run format

# Check format
npm run format:check
```

### 9.3 Pre-commit Hooks

Using husky & lint-staged:

```bash
# Automatic setup
npx husky install

# Install pre-commit hook
npx husky add .husky/pre-commit "npm run lint:fix && npm run format"
```

**Status:** PLANNED

---

## 10. Debugging

### 10.1 Backend Debugging

**VS Code Debug Configuration** (`.vscode/launch.json`):

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Backend Debug",
      "program": "${workspaceFolder}/backend/node_modules/.bin/ts-node",
      "args": ["src/index.ts"],
      "cwd": "${workspaceFolder}/backend",
      "env": {
        "NODE_ENV": "development"
      },
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

Then press F5 to debug.

### 10.2 Frontend Debugging

**Chrome DevTools:**
1. Open Chrome DevTools (F12)
2. Go to Sources tab
3. Set breakpoints in code
4. Reload page to debug

**React DevTools Extension:**
```bash
# Install browser extension
# https://react-devtools-tutorial.vercel.app/
```

### 10.3 Database Debugging

```bash
# Connect with psql
docker-compose exec postgres psql -U tolog_user -d tolog_one

# Enable query logging
SET log_statement = 'all';

# Run queries to see what's happening
SELECT * FROM users;

# Check slow queries
SELECT * FROM pg_stat_statements 
ORDER BY total_time DESC LIMIT 10;
```

**Status:** PLANNED

---

## 11. Git Workflow

### 11.1 Branch Strategy

```bash
# Main branch - production ready
git checkout main

# Create feature branch
git checkout -b feature/user-authentication

# Create bugfix branch
git checkout -b bugfix/memory-leak

# Create documentation branch
git checkout -b docs/api-guide
```

### 11.2 Commit Messages

Follow Conventional Commits:

```bash
# Feature
git commit -m "feat: add user authentication with JWT"

# Bug fix
git commit -m "fix: prevent memory leak in conversation listener"

# Documentation
git commit -m "docs: update API authentication guide"

# Refactor
git commit -m "refactor: simplify memory retrieval logic"

# Tests
git commit -m "test: add unit tests for language detection"
```

### 11.3 Pull Requests

1. Create PR from feature branch
2. Add description of changes
3. Link related issues
4. Wait for CI/CD checks
5. Request review from maintainers
6. Address review feedback
7. Squash and merge when approved

**Status:** PLANNED

---

## 12. Common Development Tasks

### 12.1 Add New Database Field

```bash
# 1. Create migration
npm run migrate:create add_user_phone_field

# 2. Edit migration file
# Add column, indexes, constraints

# 3. Run migration
npm run migrate:up

# 4. Update TypeScript types
# Edit backend/src/types/user.ts

# 5. Update API if needed
# Edit routes and services

# 6. Test
npm test
```

### 12.2 Add New Memory Type

```bash
# 1. Update DATABASE_SCHEMA.md
# Add new type to memory.type enum

# 2. Create migration
npm run migrate:create add_memory_type_custom_goal

# 3. Update backend types
# Edit backend/src/types/memory.ts

# 4. Create/update service
# backend/src/services/memory.service.ts

# 5. Add endpoint if needed
# backend/src/routes/memory.ts

# 6. Frontend component for memory creation
# frontend/src/components/MemoryForm.tsx

# 7. Test end-to-end
# Create memory via UI, verify in DB
```

### 12.3 Integrate New AI Provider

```bash
# 1. Create provider implementation
# backend/src/providers/anthropic.provider.ts

# 2. Implement interface
# - generateResponse()
# - streamResponse()
# - detectCapabilities()

# 3. Register in factory
# backend/src/providers/factory.ts

# 4. Update config/env
# Add provider credentials to .env.example

# 5. Add tests
# backend/tests/providers/anthropic.test.ts

# 6. Frontend option to select provider
# frontend/src/components/ProviderSelector.tsx

# 7. Document in ARCHITECTURE.md
```

**Status:** PLANNED

---

## 13. Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Try connecting directly
docker-compose exec postgres psql -U tolog_user -d tolog_one -c "SELECT 1;"
```

### Frontend Not Loading

```bash
# Check if Vite dev server is running
ps aux | grep vite

# Clear cache
rm -rf node_modules/.vite

# Restart dev server
npm run dev
```

### API Requests Failing

```bash
# Check backend is running
curl http://localhost:3000/health

# Check logs
docker-compose logs backend

# Check environment variables
cat .env | grep API
```

### Tests Failing

```bash
# Run specific test with verbose output
npm test -- --reporter=verbose auth.test.ts

# Run with debugging
node --inspect-brk ./node_modules/.bin/vitest auth.test.ts
```

**Status:** PLANNED

---

## 14. Performance Tips

### Backend

- Use database indexes on frequently queried columns
- Implement query caching (Redis)
- Use connection pooling
- Monitor slow queries
- Implement pagination for large datasets

### Frontend

- Use React.memo for expensive components
- Implement code splitting with lazy loading
- Optimize bundle size (check with `npm run build:analyze`)
- Use virtual scrolling for long lists
- Cache API responses

### Database

- Regular VACUUM and ANALYZE
- Maintain indexes
- Monitor table sizes
- Archive old data
- Use read replicas for read-heavy workloads

**Status:** PLANNED

---

## 15. Documentation Standards

### Code Comments

```typescript
/**
 * Retrieves all memories for a user with optional filtering.
 * 
 * @param userId - The user's ID
 * @param options - Filter options (type, namespace, tags)
 * @returns Array of memory records
 * @throws DatabaseError if query fails
 * 
 * @example
 * const memories = await getMemories('user-123', { type: 'preference' });
 */
export async function getMemories(
  userId: string,
  options?: MemoryFilterOptions
): Promise<Memory[]> {
  // Implementation
}
```

### README for Modules

Each major module should have a `README.md`:

```
backend/src/providers/README.md:

# AI Providers

Abstraction layer for different AI model providers.

## Supported Providers

- Google Gemini
- Anthropic Claude

## Adding New Provider

1. Implement AIProvider interface
2. Register in factory
3. Add tests
4. Update documentation
```

**Status:** PLANNED

---

## 16. Resources & Learning

### Documentation

- [Node.js Docs](https://nodejs.org/docs/)
- [Fastify Docs](https://www.fastify.io/)
- [React Docs](https://react.dev/)
- [TypeScript Docs](https://www.typescriptlang.org/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)

### Tools

- [Postman](https://www.postman.com/) - API testing
- [DBeaver](https://dbeaver.io/) - Database GUI
- [React DevTools](https://react-devtools-tutorial.vercel.app/) - React debugging
- [VS Code](https://code.visualstudio.com/) - Code editor

### Community

- [Discord Channel] (TBD)
- [GitHub Discussions](https://github.com/pattologos12-glitch/Tolog-One/discussions)
- [Contributing Guide](./CONTRIBUTING.md) (TBD)

**Status:** PLANNED

---

## 17. Getting Help

If you get stuck:

1. Check existing documentation
2. Search GitHub issues
3. Ask in Discord channel
4. Create a new issue with:
   - What you were trying to do
   - What error you got
   - Steps to reproduce
   - Your environment (OS, Node version, etc.)

---

**End of Development Guide**
