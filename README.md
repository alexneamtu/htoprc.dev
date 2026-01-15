# htoprc.dev

A web-based htoprc visualizer and editor. Preview and edit htop configurations in real-time.

[![CI](https://github.com/alexneamtu/htoprc.dev/actions/workflows/ci.yml/badge.svg)](https://github.com/alexneamtu/htoprc.dev/actions/workflows/ci.yml)
[![Deploy](https://github.com/alexneamtu/htoprc.dev/actions/workflows/deploy.yml/badge.svg)](https://github.com/alexneamtu/htoprc.dev/actions/workflows/deploy.yml)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

**Live:** [htoprc.dev](https://htoprc.dev) | **Staging:** [staging.htoprc.dev](https://staging.htoprc.dev)

## What is this?

[htop](https://htop.dev/) is an interactive process viewer for Unix systems. Its configuration file (`htoprc`) controls the visual appearance: colors, meters, columns, and layout.

**htoprc.dev** lets you:

- **Browse** a gallery of htoprc configurations with live previews
- **Preview** how any config looks without installing it
- **Edit** configs in a live editor with instant visual feedback
- **Share** your setup with the community
- **Discover** interesting configurations via automated scraping from GitHub, GitLab, and Reddit

## Features

- **Full-fidelity htop preview** - Renders all 7 color schemes, header meters, process list columns, and tree view
- **Live editor** - Edit htoprc with autocomplete, hover docs, and instant preview
- **Scoring system** - Surfaces interesting configs, hides boring defaults
- **Community features** - Like, comment, and fork configs
- **Social login** - Sign in with GitHub, Google, or Discord
- **Open source** - MIT licensed, contributions welcome

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite, Tailwind CSS |
| Editor | CodeMirror 6 (syntax highlighting, autocomplete, hover docs) |
| API | Hono, GraphQL Yoga |
| Database | Cloudflare D1 (SQLite) |
| Hosting | Cloudflare Pages + Workers |
| Testing | Vitest |
| Monorepo | pnpm workspaces |

**Cost: $0/month** on Cloudflare free tier.

## Project Structure

```
htoprc.dev/
├── apps/
│   ├── web/                 # React frontend
│   └── api/                 # Cloudflare Workers API
├── packages/
│   └── htoprc-parser/       # Shared parser library
└── docs/
    └── plans/               # Design documents
```

## Getting Started

### Prerequisites

- Node.js 24+
- pnpm 9+

### Installation

```bash
git clone https://github.com/alexneamtu/htoprc.dev.git
cd htoprc.dev
pnpm install
cp .env.example .env.local
```

### Development

```bash
# Run everything
pnpm dev

# Or run individually
pnpm dev:web    # React on localhost:5173
pnpm dev:api    # Workers on localhost:8787
```

### Testing

```bash
pnpm test           # Run all tests
pnpm test:parser    # Parser tests only

# Run with coverage
pnpm --filter @htoprc/parser test:run -- --coverage
pnpm --filter @htoprc/web vitest run --coverage
```

**Coverage:** Parser 100% | API 100% | Web 81%

### Database

```bash
pnpm db:migrate     # Apply migrations
pnpm db:seed        # Seed sample data
```

## Environment Variables

Create a `.env.local` file:

```bash
# Clerk (Auth)
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# GitHub (Scraper - for higher rate limits)
GITHUB_TOKEN=ghp_...
```

## Deployment

```bash
pnpm wrangler login
pnpm db:migrate:prod
pnpm deploy
```

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- [htop](https://htop.dev/) - The amazing process viewer this project is built around
- [r/unixporn](https://reddit.com/r/unixporn) - Inspiration and source of beautiful configs
