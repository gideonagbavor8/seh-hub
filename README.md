# SEH Hub — School-Home Engagement Platform

**Ho International School, Ghana**

A First Principles Monolith built with:
- **Next.js 15** (App Router)
- **Drizzle ORM** + **Neon PostgreSQL**
- **NextAuth** (JWT, role-based)
- **Node.js native crypto** (Ed25519 signing)
- **Arkesel SMS** gateway
- **Vercel** deployment

## Roles

| Role     | Description                              |
|----------|------------------------------------------|
| Admin    | School staff with full platform access   |
| Teacher  | Manages classes, grades, communications  |
| Parent   | Views child progress, receives messages  |
| Student  | Views own grades and announcements       |

## Getting Started

```bash
# Install dependencies
npm install

# Copy and fill in environment variables
cp .env.local.example .env.local

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
├── app/          # Next.js App Router pages and API routes
├── components/   # Reusable UI components (hand-crafted, no UI libraries)
├── db/
│   ├── schema.ts # Drizzle ORM table definitions
│   └── index.ts  # Neon database connection
├── lib/
│   ├── auth.ts   # NextAuth configuration
│   └── crypto.ts # Ed25519 signing utilities
└── types/
    └── index.ts  # Shared TypeScript types
```

## Environment Variables

See `.env.local` for required variables.

## Database

```bash
# Generate migrations
npx drizzle-kit generate

# Apply migrations
npx drizzle-kit migrate
```
