# JobLead – Construction Job Tracking System

A production-ready job tracking system for residential construction contractors. Track leads through estimates, scheduling, invoicing, and payment.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js + TypeScript + NestJS |
| Database | PostgreSQL + Prisma ORM |
| Auth | JWT (access + refresh tokens), bcrypt |
| Frontend | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Validation | Zod (shared schemas) |
| Unit Tests | Vitest |
| E2E Tests | Playwright |
| Dev Infra | Docker Compose |

## Repo Structure

```
joblead/
├── apps/
│   ├── api/          # NestJS backend
│   │   ├── prisma/   # Schema + seed
│   │   └── src/
│   │       ├── auth/
│   │       ├── users/
│   │       ├── customers/
│   │       ├── jobs/
│   │       ├── estimates/
│   │       ├── invoices/
│   │       ├── payments/
│   │       ├── files/
│   │       └── common/
│   └── web/          # Next.js frontend
│       └── src/app/  # App Router pages
├── packages/
│   └── shared/       # Zod schemas + TypeScript types
├── docker-compose.yml
├── .env.example
└── README.md
```

## Setup

### Prerequisites

- Node.js 20+
- Docker + Docker Compose
- npm 10+

### 1. Clone & install

```bash
git clone <repo>
cd joblead
cp .env.example .env
# Edit .env – set strong JWT secrets for production!
npm install
```

### 2. Start the database

```bash
docker compose up postgres -d
```

Wait for postgres to be healthy:
```bash
docker compose ps
```

### 3. Run database migrations

```bash
npm run db:migrate --workspace=apps/api
```

### 4. Seed demo data

```bash
npm run db:seed --workspace=apps/api
```

### 5. Start development servers

```bash
npm run dev
```

This starts:
- **API** on http://localhost:3001
- **Web** on http://localhost:3000

## Running Tests

### Unit tests (Vitest)

```bash
# API unit tests (totals + status transitions)
npm run test --workspace=apps/api

# With coverage
npm run test:coverage --workspace=apps/api
```

### E2E tests (Playwright)

Make sure both the API and web servers are running, then:

```bash
npm run test:e2e --workspace=apps/web
```

Or with the Playwright UI:
```bash
npm run test:e2e:ui --workspace=apps/web
```

## Sample Credentials

After seeding, these accounts are available:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@joblead.ca | Admin123! |
| Manager | manager@joblead.ca | Manager123! |
| Crew | crew@joblead.ca | Crew123! |

## API Reference

All endpoints are prefixed with `/api`.

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/login` | Login, returns access + refresh tokens |
| POST | `/auth/register` | Register new user (Admin only) |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Invalidate refresh token |

### Customers
| Method | Path | Description |
|--------|------|-------------|
| GET | `/customers` | List customers (paginated, searchable) |
| POST | `/customers` | Create customer |
| GET | `/customers/:id` | Get customer + addresses + jobs |
| PATCH | `/customers/:id` | Update customer |
| DELETE | `/customers/:id` | Delete customer (Admin) |
| POST | `/customers/:id/addresses` | Add address |
| PATCH | `/customers/:id/addresses/:addrId` | Update address |

### Jobs
| Method | Path | Description |
|--------|------|-------------|
| GET | `/jobs` | List jobs (filter by status/priority/date) |
| POST | `/jobs` | Create job |
| GET | `/jobs/:id` | Get job with all relations |
| PATCH | `/jobs/:id` | Update job details |
| POST | `/jobs/:id/status` | Change job status (validated transitions) |
| POST | `/jobs/:id/notes` | Add a note (all roles) |
| GET | `/jobs/:id/payments` | Payment summary for job |
| POST | `/jobs/:id/files` | Upload file attachment |
| DELETE | `/jobs/:id` | Delete job (Admin) |

### Estimates
| Method | Path | Description |
|--------|------|-------------|
| POST | `/jobs/:id/estimates` | Create new estimate version |
| GET | `/estimates/:id` | Get estimate |
| PATCH | `/estimates/:id` | Update estimate (DRAFT only) |
| POST | `/estimates/:id/send` | Mark as SENT |
| POST | `/estimates/:id/accept` | Accept estimate, update job totals |
| POST | `/estimates/:id/reject` | Reject estimate |

### Invoices
| Method | Path | Description |
|--------|------|-------------|
| POST | `/jobs/:id/invoices` | Create invoice |
| GET | `/invoices/:id` | Get invoice |
| PATCH | `/invoices/:id` | Update invoice |
| POST | `/invoices/:id/send` | Mark as SENT |
| POST | `/invoices/:id/void` | Void invoice |
| GET | `/invoices/:id/payments` | List payments |
| POST | `/invoices/:id/payments` | Record payment |

## Job Status Flow

```
LEAD → ESTIMATING → APPROVED → SCHEDULED → IN_PROGRESS → COMPLETED → INVOICED → PAID
         ↓              ↓           ↓            ↓
       CANCELED      CANCELED    CANCELED     SCHEDULED (back)
```

Any status can transition to `CANCELED`. `CANCELED` can return to `LEAD`.

## Roles & Permissions

| Action | ADMIN | MANAGER | CREW |
|--------|-------|---------|------|
| Register users | ✅ | ❌ | ❌ |
| Manage customers | ✅ | ✅ | Read-only |
| Create/edit jobs | ✅ | ✅ | Read-only |
| Change job status | ✅ | ✅ | ❌ |
| Add notes / files | ✅ | ✅ | ✅ |
| Create estimates | ✅ | ✅ | ❌ |
| Create invoices | ✅ | ✅ | ❌ |
| Record payments | ✅ | ✅ | ❌ |
| Delete records | ✅ | ❌ | ❌ |

## Docker (Production)

To run the full stack in Docker:

```bash
cp .env.example .env
# Set strong secrets!
docker compose up --build
```

Services:
- **postgres** on port 5432
- **api** on port 3001
- **web** on port 3000

## Environment Variables

See `.env.example` for all required variables.

Key variables:
- `DATABASE_URL` – PostgreSQL connection string
- `JWT_SECRET` – Min 32 chars, keep secret
- `JWT_REFRESH_SECRET` – Min 32 chars, different from JWT_SECRET
- `UPLOAD_DIR` – Directory for file uploads (default: `./uploads`)

## Business Rules

- **Status transitions**: Enforced server-side via `isValidStatusTransition()` from the shared package
- **Estimate totals**: Calculated from line items on create/update; HST = 13%
- **Invoice totals**: Same calculation as estimates
- **Job totals**: Aggregated from accepted estimates + non-void invoices + payments
- **Optimistic concurrency**: Job updates use `updatedAt` check in Prisma update
- **Audit trail**: Every status change creates a `JobEvent`; notes and file uploads also create events
- **Payment status**: Invoice status auto-updates to PARTIAL or PAID based on total payments

## Development Commands

```bash
# Database
npm run db:migrate --workspace=apps/api     # Run migrations
npm run db:seed --workspace=apps/api         # Seed demo data
npm run db:studio --workspace=apps/api       # Open Prisma Studio

# Building
npm run build --workspace=packages/shared    # Build shared types
npm run build --workspace=apps/api           # Build API
npm run build --workspace=apps/web           # Build web

# Linting
npm run lint --workspace=apps/api
npm run lint --workspace=apps/web
```
