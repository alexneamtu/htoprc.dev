# htoprc.dev

A web-based htoprc visualizer and gallery. Browse, preview, share, and edit htop configurations.

![License](https://img.shields.io/badge/license-MIT-blue.svg)

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
| Frontend | React, Vite, Tailwind CSS, shadcn/ui |
| API | Hono, GraphQL (graphql-yoga, Pothos) |
| Auth | Clerk |
| Database | Cloudflare D1 (SQLite) |
| Hosting | Cloudflare Pages + Workers |
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

- Node.js 20+
- pnpm 8+

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
```

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

Contributions are welcome! Please read the design document in `docs/plans/` to understand the architecture.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- [htop](https://htop.dev/) - The amazing process viewer this project is built around
- [r/unixporn](https://reddit.com/r/unixporn) - Inspiration and source of beautiful configs
