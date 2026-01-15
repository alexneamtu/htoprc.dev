# Contributing to htoprc.dev

Thanks for your interest in contributing! This guide will help you get started.

## Development Setup

### Prerequisites

- Node.js 24+
- pnpm 9+

### Quick Start

```bash
git clone https://github.com/alexneamtu/htoprc.dev.git
cd htoprc.dev
pnpm install
pnpm dev
```

This starts:
- **Web** at http://localhost:5173
- **API** at http://localhost:8787

## Project Structure

```
htoprc.dev/
├── apps/
│   ├── web/              # React frontend (Vite, Tailwind)
│   └── api/              # Cloudflare Workers API (Hono, GraphQL)
├── packages/
│   └── htoprc-parser/    # Shared htoprc parser library
└── docs/
    └── plans/            # Design documents
```

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature
```

### 2. Make Changes

- **Parser changes**: `packages/htoprc-parser/src/`
- **API changes**: `apps/api/src/`
- **Frontend changes**: `apps/web/src/`

### 3. Run Tests

```bash
pnpm test        # All tests
pnpm typecheck   # TypeScript
pnpm lint        # ESLint
```

All checks must pass before submitting a PR.

### 4. Submit a PR

Push your branch and open a Pull Request. CI will run automatically.

## Code Standards

### TypeScript

- Use strict TypeScript - avoid `any`
- Export types from dedicated `types.ts` files
- Prefer interfaces over type aliases for objects

### React

- Functional components only
- Use hooks for state and effects
- Keep components small and focused

### Testing

- Write tests for new features
- Maintain existing test coverage
- Use descriptive test names

### Commits

Write clear commit messages:

```
Add feature X

- Detail about change 1
- Detail about change 2
```

## Architecture Notes

### Parser (`@htoprc/parser`)

Parses htoprc files into a typed `HtopConfig` object. Used by both web and API.

### API (`@htoprc/api`)

GraphQL API running on Cloudflare Workers with D1 database.

Key files:
- `src/graphql/schema.ts` - GraphQL schema and resolvers
- `src/services/scraper/` - GitHub/GitLab/Reddit scrapers

### Web (`@htoprc/web`)

React SPA with:
- `src/components/htop/` - htop preview rendering
- `src/components/editor/` - CodeMirror editor
- `src/pages/` - Route pages

## Need Help?

- Check existing [issues](https://github.com/alexneamtu/htoprc.dev/issues)
- Read design docs in `docs/plans/`
- Open an issue for questions
