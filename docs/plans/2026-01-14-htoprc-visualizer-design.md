# htoprc.dev - Design Document

A web-based htoprc visualizer with config gallery, live editor, and community features.

## Overview

htoprc.dev allows users to browse, preview, share, and edit htop configuration files. Configs are sourced via automated scraping (GitHub, GitLab, Reddit, dotfiles sites) and user uploads.

### Key Features

- **Gallery**: Browse htoprc configs with visual previews
- **Live Editor**: Edit configs with real-time full-fidelity htop preview
- **Community**: Like and comment on configs (with moderation)
- **Admin**: Approve/reject flagged content, view stats
- **Scraper**: Automated discovery of htoprc files from multiple sources

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Cloudflare Pages                            │
│                    (React + Vite SPA)                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Gallery   │  │   Editor    │  │      Config Detail      │  │
│  │   (browse)  │  │   (create)  │  │  (view/comment/like)    │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│                            │                                     │
│              ┌─────────────┴─────────────┐                      │
│              │    htoprc Parser/Renderer │ (client-side)        │
│              │    (full fidelity preview)│                      │
│              └───────────────────────────┘                      │
└─────────────────────────────────────────────────────────────────┘
                              │ API calls (GraphQL)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Cloudflare Workers                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────────┐  │
│  │   Auth   │  │  Config  │  │ Comments │  │     Admin      │  │
│  │ (Clerk)  │  │   CRUD   │  │  & Likes │  │   Endpoints    │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────────────┘  │
│                              │                                   │
│              ┌───────────────┴───────────────┐                  │
│              │   Scraper (Cron Triggered)    │                  │
│              │  GitHub → GitLab → Reddit →   │                  │
│              │         dotfiles sites        │                  │
│              └───────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
   ┌─────────┐          ┌─────────┐          ┌─────────┐
   │   D1    │          │   R2    │          │   KV    │
   │ (SQLite)│          │ (files) │          │ (cache) │
   └─────────┘          └─────────┘          └─────────┘
   configs, users,      htoprc files,        session tokens,
   comments, likes      user avatars         rate limits
```

### Design Principles

- All rendering happens client-side (zero compute cost)
- Abstractions for auth and other services (easy to swap later)
- Open source friendly: secrets in env vars, example configs provided
- Extensible data model (UUIDs, normalized schema)

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React, Vite, Tailwind CSS, shadcn/ui |
| API | Hono, graphql-yoga, Pothos |
| Auth | Clerk (abstracted) |
| Database | Cloudflare D1 (SQLite) |
| Storage | Cloudflare R2 |
| Cache | Cloudflare KV |
| Hosting | Cloudflare Pages + Workers |
| Monorepo | pnpm workspaces |

**Cost: $0/month** on Cloudflare free tier until significant scale.

## Data Model

```sql
-- Users (from OAuth providers)
users:
  id              TEXT PRIMARY KEY
  provider        TEXT              -- 'github' | 'google' | 'discord'
  provider_id     TEXT
  username        TEXT
  avatar_url      TEXT
  is_trusted      BOOLEAN DEFAULT FALSE
  is_admin        BOOLEAN DEFAULT FALSE
  created_at      TIMESTAMP

-- Configs (scraped or uploaded)
configs:
  id              TEXT PRIMARY KEY
  title           TEXT
  content         TEXT
  source_type     TEXT              -- 'scraped' | 'uploaded'
  source_url      TEXT
  source_platform TEXT              -- 'github' | 'gitlab' | 'reddit' | etc.
  author_id       TEXT REFERENCES users
  status          TEXT              -- 'published' | 'flagged' | 'rejected'
  flag_reason     TEXT
  likes_count     INTEGER DEFAULT 0
  created_at      TIMESTAMP

-- Comments
comments:
  id              TEXT PRIMARY KEY
  config_id       TEXT REFERENCES configs
  author_id       TEXT REFERENCES users
  content         TEXT
  status          TEXT              -- 'pending' | 'approved' | 'rejected'
  created_at      TIMESTAMP

-- Likes
likes:
  user_id         TEXT REFERENCES users
  config_id       TEXT REFERENCES configs
  created_at      TIMESTAMP
  PRIMARY KEY (user_id, config_id)

-- Scraper state
scraper_runs:
  id              TEXT PRIMARY KEY
  platform        TEXT
  started_at      TIMESTAMP
  completed_at    TIMESTAMP
  configs_found   INTEGER
  configs_added   INTEGER
  last_cursor     TEXT
```

## GraphQL API

```graphql
type Query {
  configs(
    status: ConfigStatus = PUBLISHED
    sort: ConfigSort = CREATED_DESC
    page: Int = 1
    limit: Int = 20
  ): ConfigConnection!

  config(id: ID!): Config
  me: User
  myLikes: [Config!]!

  # Admin
  adminQueue(type: QueueType!): AdminQueueConnection! @admin
  adminStats: AdminStats! @admin
  scraperLogs(limit: Int = 10): [ScraperRun!]! @admin
}

type Mutation {
  uploadConfig(input: UploadConfigInput!): Config! @auth
  updateConfig(id: ID!, input: UpdateConfigInput!): Config! @auth
  deleteConfig(id: ID!): Boolean! @admin

  addComment(configId: ID!, content: String!): Comment! @auth
  deleteComment(id: ID!): Boolean! @auth

  toggleLike(configId: ID!): Boolean! @auth

  # Admin
  approveConfig(id: ID!): Config! @admin
  rejectConfig(id: ID!): Config! @admin
  approveComment(id: ID!): Comment! @admin
  rejectComment(id: ID!): Comment! @admin
  triggerScraper(platform: Platform): ScraperRun! @admin
}

type Config {
  id: ID!
  title: String!
  content: String!
  sourceType: SourceType!
  sourceUrl: String
  sourcePlatform: Platform
  author: User
  status: ConfigStatus!
  likesCount: Int!
  liked: Boolean!
  comments: [Comment!]!
  createdAt: DateTime!
}

type Comment {
  id: ID!
  content: String!
  author: User!
  status: CommentStatus!
  createdAt: DateTime!
}

type User {
  id: ID!
  username: String!
  avatarUrl: String
}
```

## htoprc Parser & Renderer

Client-side parser converts htoprc text to structured config:

```
htoprc file → Parser → Structured config object

Parses:
- fields=0 48 17 18 38 39 40 2 46 47 49 1  (column IDs)
- sort_key=46
- sort_direction=1
- hide_threads=0
- header_layout=two_50_50
- column_meters_0=AllCPUs Memory Swap
- column_meter_modes_0=1 1 1
- color_scheme=0
- Plus ~40 other options
```

Renderer is a React component `<HtopPreview config={parsedConfig} />` that displays:
- Header meters (CPU, memory, swap, etc.) with correct display modes (bar/graph/text)
- Process list with configured columns
- Accurate color schemes (all 7 built-in htop themes)
- Display options (tree view, hide threads, etc.)

CSS variables for theming, monospace font, mock process data.

## Scraper System

Cloudflare Workers Cron triggers daily scraping:

1. **GitHub** (primary): Search API for `filename:htoprc`, Gist API
2. **GitLab**: Search API for htoprc files
3. **Reddit**: r/unixporn, r/linux JSON API
4. **Dotfiles sites**: dotshare.it, etc.

For each found config:
1. Check if URL already exists (skip duplicates)
2. Fetch raw content
3. Validate htoprc syntax
4. Flag if invalid, too short, or duplicate content
5. Insert with status `published` or `flagged`

Rate limiting respected, pagination cursors stored for resuming.

## Authentication

Clerk handles OAuth (GitHub, Google, Discord) with abstraction layer for future providers:

```typescript
interface AuthService {
  getCurrentUser(): Promise<User | null>
  signIn(provider?: string): void
  signOut(): void
  isAdmin(): boolean
  isTrusted(): boolean
}
```

## Moderation

**Configs (scraped and uploaded):**
- Auto-publish with flagging for suspicious content
- Flagged if: invalid syntax, too short (<5 lines), duplicate hash

**Comments:**
- First comment from user requires approval
- Subsequent comments auto-publish (user becomes "trusted")

## Frontend Pages

| Route | Purpose |
|-------|---------|
| `/` | Landing + gallery grid (sort by likes/newest) |
| `/config/:id` | Config detail, preview, comments, like button |
| `/editor` | Live editor with split view (code + preview) |
| `/upload` | Paste or file upload with preview |
| `/admin` | Approve/reject queue, stats (protected) |

UI: Dark theme default, minimal design, htop previews as visual focus.

## Project Structure

```
htoprc.dev/
├── apps/
│   ├── web/                    # React frontend
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── htop/       # Preview & editor
│   │   │   │   ├── ui/         # Shared components
│   │   │   │   └── admin/
│   │   │   ├── pages/
│   │   │   ├── services/
│   │   │   │   ├── auth/       # Auth abstraction
│   │   │   │   └── api/        # GraphQL client
│   │   │   └── lib/
│   │   │       └── htoprc/
│   │   └── package.json
│   │
│   └── api/                    # Cloudflare Workers
│       ├── src/
│       │   ├── routes/
│       │   ├── services/
│       │   │   ├── scraper/
│       │   │   └── validation/
│       │   ├── db/
│       │   └── index.ts
│       ├── wrangler.toml
│       └── package.json
│
├── packages/
│   └── htoprc-parser/          # Shared parser library
│
├── .env.example
├── README.md
└── package.json                # pnpm workspaces root
```

## Local Development

```bash
# Setup
git clone https://github.com/you/htoprc.dev
cd htoprc.dev
pnpm install
cp .env.example .env.local

# Run
pnpm dev                         # Web + API concurrently
pnpm dev:web                     # React on localhost:5173
pnpm dev:api                     # Workers on localhost:8787

# Database
pnpm db:migrate
pnpm db:seed
```

## Deployment

```bash
pnpm wrangler login
pnpm db:migrate:prod
pnpm deploy                      # Pages + Workers
```

CI via GitHub Actions: lint, typecheck, test on PR; deploy on main.

## Environment Variables

```bash
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
GITHUB_TOKEN=ghp_...
```

## Future Considerations

- Additional auth providers (email, more OAuth)
- Search/filter in gallery
- User profiles
- Config collections/favorites
- Turborepo if builds slow down
- Export preview as image for sharing
