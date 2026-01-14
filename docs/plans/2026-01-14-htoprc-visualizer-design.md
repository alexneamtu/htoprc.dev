# htoprc.dev - Design Document

A web-based htoprc visualizer with config gallery, live editor, and community features.

## Overview

htoprc.dev allows users to browse, preview, share, and edit htop configuration files. Configs are sourced via automated scraping (GitHub, GitLab, Reddit, dotfiles sites) and user uploads.

**Core insight:** Users come to *browse*, not create. The gallery is the product; the editor is secondary. The preview IS the marketing.

### Key Features

- **Gallery**: Pinterest-style grid of htop previews with scoring/filtering
- **Live Editor**: Edit configs with real-time full-fidelity htop preview + autocomplete
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
- Parser is LENIENT on input, STRICT on output
- Iterative development with working software at each milestone

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
CREATE TABLE users (
  id              TEXT PRIMARY KEY,
  username        TEXT NOT NULL,
  avatar_url      TEXT,
  is_trusted      INTEGER DEFAULT 0,  -- Can comment without approval
  is_admin        INTEGER DEFAULT 0,
  created_at      TEXT DEFAULT (datetime('now'))
);

-- User auth providers (supports account linking)
CREATE TABLE user_providers (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider        TEXT NOT NULL,      -- 'github' | 'google' | 'discord'
  provider_id     TEXT NOT NULL,
  created_at      TEXT DEFAULT (datetime('now')),
  UNIQUE(provider, provider_id)
);

-- Configs (scraped or uploaded)
CREATE TABLE configs (
  id              TEXT PRIMARY KEY,
  slug            TEXT,               -- URL-friendly title
  title           TEXT NOT NULL,
  content         TEXT NOT NULL,
  content_hash    TEXT NOT NULL,      -- For duplicate detection
  source_type     TEXT NOT NULL,      -- 'scraped' | 'uploaded'
  source_url      TEXT,
  source_platform TEXT,               -- 'github' | 'gitlab' | 'reddit' | etc.
  author_id       TEXT REFERENCES users(id),
  status          TEXT DEFAULT 'published',  -- 'published' | 'flagged' | 'rejected'
  flag_reason     TEXT,
  rejection_reason TEXT,              -- Feedback to user on why rejected
  score           INTEGER DEFAULT 0,  -- Interestingness score
  likes_count     INTEGER DEFAULT 0,
  htop_version    TEXT,               -- 'v2' | 'v3' | 'unknown'
  created_at      TEXT DEFAULT (datetime('now'))
);

-- Comments
CREATE TABLE comments (
  id              TEXT PRIMARY KEY,
  config_id       TEXT NOT NULL REFERENCES configs(id) ON DELETE CASCADE,
  author_id       TEXT NOT NULL REFERENCES users(id),
  content         TEXT NOT NULL,
  status          TEXT DEFAULT 'pending',  -- 'pending' | 'approved' | 'rejected'
  rejection_reason TEXT,
  created_at      TEXT DEFAULT (datetime('now'))
);

-- Likes (user can like each config once)
CREATE TABLE likes (
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  config_id       TEXT NOT NULL REFERENCES configs(id) ON DELETE CASCADE,
  created_at      TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, config_id)
);

-- Scraper state (track what's been processed)
CREATE TABLE scraper_runs (
  id              TEXT PRIMARY KEY,
  platform        TEXT NOT NULL,
  status          TEXT DEFAULT 'running',  -- 'running' | 'completed' | 'failed'
  started_at      TEXT DEFAULT (datetime('now')),
  completed_at    TEXT,
  configs_found   INTEGER DEFAULT 0,
  configs_added   INTEGER DEFAULT 0,
  last_cursor     TEXT,               -- Pagination cursor for resuming
  error_message   TEXT
);

-- Rate limiting
CREATE TABLE rate_limits (
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_type     TEXT NOT NULL,      -- 'upload' | 'comment'
  action_date     TEXT NOT NULL,      -- Date only (YYYY-MM-DD)
  count           INTEGER DEFAULT 0,
  PRIMARY KEY (user_id, action_type, action_date)
);

-- Indexes
CREATE INDEX idx_configs_status ON configs(status);
CREATE INDEX idx_configs_created_at ON configs(created_at DESC);
CREATE INDEX idx_configs_score ON configs(score DESC);
CREATE INDEX idx_configs_slug ON configs(slug);
CREATE INDEX idx_comments_config_id ON comments(config_id);
CREATE INDEX idx_comments_status ON comments(status);
CREATE INDEX idx_user_providers_user_id ON user_providers(user_id);
```

## Config Scoring System

Automatically score configs based on "interestingness" to surface quality content:

```typescript
interface ScoreFactors {
  customColorScheme: 10,      // color_scheme !== 0
  treeViewEnabled: 5,         // tree_view=1
  customMeters: 5,            // Non-default meter configuration (per meter)
  manyColumns: 3,             // More than 8 columns configured
  customHeaderLayout: 3,      // Non-default header_layout
  unusualOptions: 5,          // Rarely-used options enabled
}

// Configs with score < 10 are considered "boring defaults"
// Gallery defaults to showing score >= 10
```

Display "customization level" badge: **Minimal** (0-9) | **Moderate** (10-25) | **Heavy** (26+)

## GraphQL API

```graphql
type Query {
  configs(
    status: ConfigStatus = PUBLISHED
    sort: ConfigSort = SCORE_DESC
    minScore: Int = 10
    page: Int = 1
    limit: Int = 20
  ): ConfigConnection!

  config(id: ID, slug: String): Config
  me: User
  myLikes: [Config!]!

  # Admin
  adminQueue(type: QueueType!): AdminQueueConnection! @admin
  adminStats: AdminStats! @admin
  scraperLogs(limit: Int = 10): [ScraperRun!]! @admin
}

type Mutation {
  uploadConfig(input: UploadConfigInput!): Config! @auth @rateLimit(max: 5, window: "day")
  updateConfig(id: ID!, input: UpdateConfigInput!): Config! @auth
  deleteConfig(id: ID!): Boolean! @admin
  forkConfig(id: ID!): Config! @auth  # Copy existing config to edit

  addComment(configId: ID!, content: String!): Comment! @auth @rateLimit(max: 20, window: "day")
  deleteComment(id: ID!): Boolean! @auth

  toggleLike(configId: ID!): Boolean! @auth

  reportContent(type: ContentType!, id: ID!, reason: String!): Boolean! @auth

  # Admin
  approveConfig(id: ID!): Config! @admin
  rejectConfig(id: ID!, reason: String!): Config! @admin
  approveComment(id: ID!): Comment! @admin
  rejectComment(id: ID!, reason: String!): Comment! @admin
  triggerScraper(platform: Platform): ScraperRun! @admin
}

type Config {
  id: ID!
  slug: String!
  title: String!
  content: String!
  sourceType: SourceType!
  sourceUrl: String
  sourcePlatform: Platform
  author: User
  status: ConfigStatus!
  score: Int!
  customizationLevel: CustomizationLevel!  # MINIMAL | MODERATE | HEAVY
  likesCount: Int!
  liked: Boolean!  # Current user has liked
  comments: [Comment!]!
  htopVersion: HtopVersion!
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
  configCount: Int!
  isTrusted: Boolean!
}

enum ConfigSort {
  SCORE_DESC
  LIKES_DESC
  CREATED_DESC
  CREATED_ASC
}

enum CustomizationLevel {
  MINIMAL
  MODERATE
  HEAVY
}
```

## htoprc Parser & Renderer

### Parser Design

Client-side parser converts htoprc text to structured config:

```typescript
interface ParseResult {
  config: HtopConfig
  warnings: ParseWarning[]  // Non-fatal issues
  errors: ParseError[]      // Fatal issues (still partial parse)
  version: 'v2' | 'v3' | 'unknown'
  score: number             // Interestingness score
}

interface ParseWarning {
  line: number
  message: string
  type: 'unknown_option' | 'invalid_value' | 'deprecated'
}

// Parser principles:
// - LENIENT on input: accept anything, warn on issues
// - STRICT on output: only generate valid configs
// - Preserve unknown options for forward compatibility
// - Handle both htop 2.x and 3.x formats
```

### Parsed Structure

```typescript
interface HtopConfig {
  // Version
  htopVersion?: string
  configReaderMinVersion?: number

  // Display
  colorScheme: number  // 0-6
  headerLayout: HeaderLayout
  showProgramPath: boolean
  highlightBaseName: boolean
  highlightDeletedExe: boolean
  highlightMegabytes: boolean
  highlightThreads: boolean
  shadowOtherUsers: boolean

  // Header meters
  leftMeters: Meter[]
  rightMeters: Meter[]

  // Process list
  columns: Column[]
  sortKey: number
  sortDirection: 'asc' | 'desc'
  treeView: boolean
  treeSortKey: number

  // Threading
  hideKernelThreads: boolean
  hideUserlandThreads: boolean
  showThreadNames: boolean

  // Other
  enableMouse: boolean
  delay: number
  hideFunctionBar: boolean

  // Unknown options (preserved)
  unknownOptions: Record<string, string>
}

interface Meter {
  type: MeterType  // 'CPU' | 'AllCPUs' | 'Memory' | 'Swap' | etc.
  mode: MeterMode  // 'bar' | 'text' | 'graph' | 'led'
}
```

### Renderer

React component `<HtopPreview config={parsedConfig} scenario={scenario} />`:

**Visual elements:**
- Header section with configurable meter layout
- Process list with configured columns
- All 7 built-in htop color schemes
- Tree view with box-drawing characters
- Function bar (F1-F10)

**Mock process data:**
Mock data demonstrates the config's features:
- If tree view enabled → show a process tree
- If CPU column visible → show varied percentages (0%, 25%, 80%, 100%)
- Show long command lines to demonstrate truncation
- Mix of root/user processes to show USER column coloring
- Include high-memory process to trigger highlighting

**Scenarios:** Users can toggle between:
- Idle system
- Busy system
- Server workload
- Development machine

### Editor Features

| Feature | Description |
|---------|-------------|
| **Autocomplete** | Option names + valid values |
| **Hover docs** | Explain each option on hover |
| **Inline validation** | Show warnings/errors as you type |
| **Fork from existing** | Dropdown to load popular configs |
| **Reset to defaults** | One-click reset |
| **Local history** | localStorage undo across sessions |
| **Copy/Download** | Export htoprc file |

## Scraper System

Cloudflare Workers Cron triggers daily scraping:

### Sources (Priority Order)

1. **GitHub** (primary): Search API for `filename:htoprc`, Gist API
2. **GitLab**: Search API for htoprc files
3. **Reddit**: r/unixporn, r/linux JSON API
4. **Dotfiles sites**: dotshare.it, etc.

### Processing Pipeline

For each found config:
1. Check if URL already exists (skip duplicates)
2. Check if content hash already exists (skip duplicate content)
3. Fetch raw content
4. Parse and validate htoprc syntax
5. Calculate interestingness score
6. Flag if: invalid syntax, too short (<5 lines), score < 5
7. Insert with status `published` or `flagged`

### Rate Limiting & Resilience

- Respects API rate limits (GitHub: 5000/hr authenticated)
- Stores pagination cursors to resume if interrupted
- Each platform is independent - one failing doesn't block others
- Exponential backoff on failures
- Logs all runs with stats for monitoring

## Authentication

Clerk handles OAuth (GitHub, Google, Discord) with abstraction layer:

```typescript
// services/auth/types.ts
interface AuthService {
  getCurrentUser(): Promise<User | null>
  signIn(provider?: string): void
  signOut(): void
  isAdmin(): boolean
  isTrusted(): boolean
}

// services/auth/clerk.ts - current implementation
// services/auth/logto.ts - future alternative
// services/auth/supabase.ts - future alternative
```

**Account linking:** Users can connect multiple OAuth providers to one account via the `user_providers` table.

## Moderation

### Configs

- Auto-publish with flagging for suspicious content
- Flagged if: invalid syntax, too short (<5 lines), duplicate hash, low score
- Rejection includes reason shown to user

### Comments

- First comment from user requires approval
- Subsequent comments auto-publish (user becomes "trusted")
- Rejection includes reason shown to user

### Rate Limiting

| Action | Limit |
|--------|-------|
| Uploads | 5 per day |
| Comments | 20 per day |

### Community Reporting

Users can report problematic content with a reason. Reports create flags for admin review.

## Frontend Pages

| Route | Purpose |
|-------|---------|
| `/` | Landing + Pinterest-style gallery grid |
| `/config/:slug` | Config detail, large preview, comments, like button |
| `/editor` | Live editor with split view (code + preview) |
| `/editor?fork=:id` | Editor pre-loaded with existing config |
| `/upload` | Paste or file upload with preview |
| `/admin` | Approve/reject queue, stats (protected) |

**SEO:**
- Slugs from titles for readable URLs: `/config/colorful-minimal-htop`
- Meta tags (title, description)
- JSON-LD structured data
- Sitemap.xml generated from configs

**Mobile:**
- Adaptive preview: simplified view on mobile showing colors + header meters
- Tap to see full preview in modal/landscape mode

## Project Structure

```
htoprc.dev/
├── apps/
│   ├── web/                    # React frontend
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── htop/       # Preview & editor
│   │   │   │   │   ├── HtopPreview.tsx
│   │   │   │   │   ├── HtopEditor.tsx
│   │   │   │   │   ├── MeterBar.tsx
│   │   │   │   │   ├── ProcessList.tsx
│   │   │   │   │   └── ColorSchemes.ts
│   │   │   │   ├── ui/         # Shared components (shadcn)
│   │   │   │   ├── gallery/    # Gallery components
│   │   │   │   └── admin/      # Admin dashboard
│   │   │   ├── pages/
│   │   │   ├── services/
│   │   │   │   ├── auth/       # Auth abstraction
│   │   │   │   └── api/        # GraphQL client
│   │   │   ├── hooks/
│   │   │   └── lib/
│   │   └── package.json
│   │
│   └── api/                    # Cloudflare Workers
│       ├── src/
│       │   ├── graphql/
│       │   │   ├── schema.ts
│       │   │   ├── resolvers/
│       │   │   └── directives/
│       │   ├── services/
│       │   │   ├── scraper/
│       │   │   │   ├── github.ts
│       │   │   │   ├── gitlab.ts
│       │   │   │   └── index.ts
│       │   │   └── moderation/
│       │   ├── db/
│       │   │   ├── schema.sql
│       │   │   ├── migrations/
│       │   │   └── queries.ts
│       │   └── index.ts
│       ├── wrangler.toml
│       └── package.json
│
├── packages/
│   └── htoprc-parser/          # Shared parser library
│       ├── src/
│       │   ├── parser.ts
│       │   ├── serializer.ts
│       │   ├── scorer.ts
│       │   ├── types.ts
│       │   └── defaults.ts
│       ├── __tests__/
│       │   ├── fixtures/       # 100+ real htoprc files
│       │   └── parser.test.ts
│       └── package.json
│
├── .env.example
├── README.md
├── LICENSE                     # MIT
└── package.json
```

## Local Development

```bash
# Setup
git clone https://github.com/alexneamtu/htoprc.dev
cd htoprc.dev
pnpm install
cp .env.example .env.local

# Run
pnpm dev                         # Web + API concurrently
pnpm dev:web                     # React on localhost:5173
pnpm dev:api                     # Workers on localhost:8787

# Database
pnpm db:migrate                  # Apply migrations locally
pnpm db:seed                     # Seed sample data

# Testing
pnpm test                        # Run all tests
pnpm test:parser                 # Parser tests only

# Linting
pnpm lint
pnpm typecheck
```

## Deployment

```bash
pnpm wrangler login
pnpm db:migrate:prod             # Apply migrations to production
pnpm deploy                      # Deploy Pages + Workers
```

CI via GitHub Actions: lint, typecheck, test on PR; deploy on main.

## Environment Variables

```bash
# .env.example

# Clerk (Auth)
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# GitHub (Scraper - for higher rate limits)
GITHUB_TOKEN=ghp_...

# Optional: Analytics
# PLAUSIBLE_DOMAIN=htoprc.dev
```

## Testing Strategy

### Parser Tests (Critical)

```
packages/htoprc-parser/__tests__/
├── fixtures/           # 100+ real htoprc files from GitHub
├── parser.test.ts      # Parse all fixtures without crashing
├── scorer.test.ts      # Score calculation tests
└── snapshots/          # Parsed output snapshots
```

### API Tests

- GraphQL resolver tests
- Auth middleware tests
- Rate limiting tests

### E2E Tests (Playwright)

- Browse gallery
- View config detail
- Use editor
- Upload config (authenticated)

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Empty config | Show default htop appearance |
| Huge config (>100KB) | Reject with size error |
| Binary file upload | Reject "not a text file" |
| Unknown options | Preserve and pass through |
| Malformed line | Skip with warning |
| Session expires mid-edit | Save to localStorage, prompt re-auth |
| API timeout | Retry with exponential backoff |

## Privacy & Compliance

- User deletion endpoint (GDPR right to erasure)
- Data export endpoint (JSON dump of user's data)
- Privacy policy page
- Minimal data collection (only what's needed)

---

## Implementation Roadmap

Development is iterative with working software at each milestone. Each phase builds on the previous and results in deployable functionality.

### Phase 1: Foundation (Milestones 1.1 - 1.5)

**Goal:** Basic htop preview working locally

#### Milestone 1.1: Project Setup
- [ ] Initialize monorepo with pnpm workspaces
- [ ] Set up apps/web with Vite + React + TypeScript
- [ ] Set up apps/api with Hono + Wrangler
- [ ] Set up packages/htoprc-parser
- [ ] Configure ESLint, Prettier, TypeScript
- [ ] Add .env.example, README.md basics
- **Deliverable:** `pnpm dev` starts both apps

#### Milestone 1.2: Parser Core
- [ ] Define HtopConfig TypeScript types
- [ ] Implement basic parser (key=value extraction)
- [ ] Handle htop 3.x format basics
- [ ] Parse color_scheme, header_layout
- [ ] Parse column_meters_0/1 and modes
- [ ] Parse fields (columns)
- [ ] Return ParseResult with warnings
- [ ] Add 10 fixture files, write tests
- **Deliverable:** Parser handles basic configs

#### Milestone 1.3: Parser Complete
- [ ] Parse all ~40 htop options
- [ ] Handle htop 2.x format differences
- [ ] Implement scorer (interestingness calculation)
- [ ] Preserve unknown options
- [ ] Add 50+ more fixture files
- [ ] Snapshot tests for all fixtures
- **Deliverable:** Parser handles any real htoprc

#### Milestone 1.4: Preview Renderer - Header
- [ ] Create HtopPreview component shell
- [ ] Implement color scheme CSS variables (all 7 themes)
- [ ] Render header layout (left/right split)
- [ ] Implement MeterBar component (bar mode)
- [ ] Implement MeterText component (text mode)
- [ ] Implement MeterGraph component (graph mode)
- [ ] Support CPU, Memory, Swap, LoadAverage meters
- **Deliverable:** Header section renders correctly

#### Milestone 1.5: Preview Renderer - Process List
- [ ] Implement ProcessList component
- [ ] Create mock process data generator
- [ ] Render configured columns with correct widths
- [ ] Implement sort indicator
- [ ] Implement tree view with box-drawing chars
- [ ] Implement row highlighting (base name, megabytes, etc.)
- [ ] Add function bar (F1-F10)
- **Deliverable:** Full htop preview renders

### Phase 2: Editor (Milestones 2.1 - 2.3)

**Goal:** Working live editor, no backend needed

#### Milestone 2.1: Basic Editor
- [ ] Integrate CodeMirror or Monaco
- [ ] Split view layout (editor left, preview right)
- [ ] Wire editor onChange to parser to preview
- [ ] Debounce parsing (100ms)
- [ ] Show parse warnings inline
- **Deliverable:** Edit htoprc, see preview update

#### Milestone 2.2: Editor Enhancements
- [ ] Add autocomplete for option names
- [ ] Add autocomplete for option values
- [ ] Add hover documentation for options
- [ ] "Reset to defaults" button
- [ ] Local history (localStorage)
- **Deliverable:** Polished editor experience

#### Milestone 2.3: Editor Polish
- [ ] "Copy to clipboard" button
- [ ] "Download .htoprc" button
- [ ] Mobile responsive layout
- [ ] Dark/light theme toggle
- [ ] Keyboard shortcuts
- **Deliverable:** Editor ready for public use

### Phase 3: Database & API (Milestones 3.1 - 3.4)

**Goal:** Configs stored in database, basic API working

#### Milestone 3.1: Database Setup
- [ ] Create D1 database
- [ ] Write schema.sql migrations
- [ ] Set up wrangler.toml for D1 binding
- [ ] Create db/queries.ts with typed queries
- [ ] Seed script with 10 sample configs
- **Deliverable:** Database operational locally

#### Milestone 3.2: GraphQL Setup
- [ ] Set up graphql-yoga with Hono
- [ ] Set up Pothos schema builder
- [ ] Define base types (Config, User, Comment)
- [ ] Implement configs query (list, pagination)
- [ ] Implement config query (single by id/slug)
- **Deliverable:** GraphQL playground works

#### Milestone 3.3: Frontend API Integration
- [ ] Set up urql or Apollo Client
- [ ] Generate TypeScript types from schema
- [ ] Create useConfigs hook
- [ ] Create useConfig hook
- [ ] Basic gallery page showing configs from API
- **Deliverable:** Gallery fetches from API

#### Milestone 3.4: Config Detail Page
- [ ] Route /config/:slug
- [ ] Fetch config by slug
- [ ] Large preview display
- [ ] Show raw htoprc content (collapsible)
- [ ] "Open in Editor" button (link to /editor?content=...)
- [ ] Source URL link (if scraped)
- [ ] SEO meta tags
- **Deliverable:** Config detail page complete

### Phase 4: Authentication (Milestones 4.1 - 4.3)

**Goal:** Users can sign in and upload configs

#### Milestone 4.1: Clerk Integration
- [ ] Set up Clerk account and app
- [ ] Install @clerk/clerk-react
- [ ] Create auth service abstraction
- [ ] Add ClerkProvider to app
- [ ] Sign in / sign out buttons
- [ ] Protected route wrapper
- **Deliverable:** Auth working locally

#### Milestone 4.2: Upload Flow
- [ ] Create /upload page
- [ ] Paste textarea + file upload input
- [ ] Live preview while editing
- [ ] Title input
- [ ] uploadConfig mutation
- [ ] API: validate, score, hash, insert
- [ ] Redirect to config detail on success
- **Deliverable:** Users can upload configs

#### Milestone 4.3: User Data
- [ ] Store user on first login (from Clerk webhook or on-demand)
- [ ] User profile in header
- [ ] "My uploads" list
- [ ] user_providers table for account linking
- **Deliverable:** User accounts working

### Phase 5: Gallery & Discovery (Milestones 5.1 - 5.3)

**Goal:** Beautiful, browsable gallery

#### Milestone 5.1: Gallery Grid
- [ ] Pinterest-style responsive grid
- [ ] Config card component (preview thumbnail, title, likes, score badge)
- [ ] Infinite scroll or pagination
- [ ] Sort dropdown (Most liked, Newest, Highest score)
- **Deliverable:** Gallery looks great

#### Milestone 5.2: Filtering & Scoring
- [ ] Filter by customization level
- [ ] Filter by color scheme
- [ ] Minimum score filter (hide boring defaults)
- [ ] Search by title (future: full-text)
- **Deliverable:** Users can find interesting configs

#### Milestone 5.3: Homepage Polish
- [ ] Hero section explaining the site
- [ ] Featured configs section (manually curated)
- [ ] "Recently added" section
- [ ] CTA to editor and upload
- **Deliverable:** Homepage ready for launch

### Phase 6: Social Features (Milestones 6.1 - 6.3)

**Goal:** Likes and comments working

#### Milestone 6.1: Likes
- [ ] toggleLike mutation
- [ ] Like button component
- [ ] Optimistic UI update
- [ ] "My likes" page
- [ ] Sort by likes_count in gallery
- **Deliverable:** Users can like configs

#### Milestone 6.2: Comments
- [ ] addComment mutation
- [ ] Comments list on config detail
- [ ] Comment form (authenticated only)
- [ ] First comment goes to pending (for new users)
- [ ] is_trusted flag auto-set after first approval
- **Deliverable:** Users can comment

#### Milestone 6.3: Fork Feature
- [ ] "Fork" button on config detail
- [ ] forkConfig mutation (creates copy)
- [ ] Opens editor with forked content
- [ ] "Forked from" attribution
- **Deliverable:** Users can fork and remix

### Phase 7: Admin & Moderation (Milestones 7.1 - 7.3)

**Goal:** Admin can moderate content

#### Milestone 7.1: Admin Dashboard
- [ ] /admin route (protected, is_admin check)
- [ ] Stats overview (total configs, pending items, etc.)
- [ ] Navigation tabs
- **Deliverable:** Admin dashboard shell

#### Milestone 7.2: Moderation Queue
- [ ] Flagged configs queue
- [ ] Pending comments queue
- [ ] Approve/Reject buttons
- [ ] Rejection reason input
- [ ] Bulk actions (future)
- **Deliverable:** Admins can moderate

#### Milestone 7.3: Rate Limiting & Reporting
- [ ] Rate limit middleware
- [ ] rate_limits table tracking
- [ ] "Report" button on configs and comments
- [ ] Reports go to admin queue
- **Deliverable:** Anti-abuse measures in place

### Phase 8: Scraper (Milestones 8.1 - 8.3)

**Goal:** Automated config discovery

#### Milestone 8.1: GitHub Scraper
- [ ] GitHub Search API integration
- [ ] Search for filename:htoprc
- [ ] Fetch raw file content
- [ ] Deduplicate by URL and content hash
- [ ] Parse, score, flag low-quality
- [ ] Insert to database
- [ ] Log scraper run
- **Deliverable:** GitHub scraper working

#### Milestone 8.2: Scraper Cron
- [ ] Set up Cloudflare Workers Cron trigger
- [ ] Run scraper on schedule (daily)
- [ ] Pagination cursor for resuming
- [ ] Error handling and retries
- [ ] Scraper status in admin dashboard
- **Deliverable:** Automated daily scraping

#### Milestone 8.3: Additional Sources
- [ ] GitLab scraper
- [ ] Gist scraper
- [ ] Reddit scraper (r/unixporn)
- [ ] Platform priority and rate limiting
- **Deliverable:** Multi-source scraping

### Phase 9: Polish & Launch (Milestones 9.1 - 9.3)

**Goal:** Production-ready launch

#### Milestone 9.1: SEO & Performance
- [ ] Sitemap.xml generation
- [ ] robots.txt
- [ ] OpenGraph meta tags
- [ ] JSON-LD structured data
- [ ] Gallery page caching (KV)
- [ ] Image optimization for previews
- **Deliverable:** SEO optimized

#### Milestone 9.2: Mobile Experience
- [ ] Mobile-adaptive preview component
- [ ] Touch-friendly interactions
- [ ] Test on real devices
- [ ] Lighthouse score > 90
- **Deliverable:** Great mobile experience

#### Milestone 9.3: Launch Prep
- [ ] Seed 100 curated configs
- [ ] Create 10 featured configs
- [ ] Privacy policy page
- [ ] About page
- [ ] Error pages (404, 500)
- [ ] Final testing
- [ ] Production deployment
- **Deliverable:** Ready for public launch

---

## Future Considerations

- Additional auth providers (email, more OAuth)
- OpenGraph image generation for social sharing
- User profiles with stats
- Config collections/favorites
- Embed widget for external sites
- API for third-party integrations
- Turborepo if builds slow down
- Support for btop/bottom configs
