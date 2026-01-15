# CI/CD Optimization Design

## Overview

Optimize GitHub Actions workflows for faster CI, safer deployments, and automatic PR previews.

## Current State

- `test.yml`: Sequential tests on PRs (~3-4 min)
- `deploy.yml`: Deploys on main push without waiting for tests
- No PR preview deployments

## Proposed Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  ci.yml (PRs + main pushes)                                 │
│  ┌─────────┐   ┌─────────────────────────────────────────┐  │
│  │  setup  │───│  test-parser ─┐                         │  │
│  │  +build │   │  test-api ────┼── quality (parallel)    │  │
│  │  parser │   │  test-web ────┘                         │  │
│  └─────────┘   └─────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ (on main only, after CI passes)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  deploy.yml (main pushes only)                              │
│  ┌────────────────┐  ┌────────────────┐                     │
│  │  deploy-web    │  │  deploy-api    │  (parallel)         │
│  │  (uses cached  │  │  (uses cached  │                     │
│  │   artifacts)   │  │   artifacts)   │                     │
│  └────────────────┘  └────────────────┘                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  preview.yml (PRs only)                                     │
│  - Deploys to Cloudflare Pages preview URL                  │
│  - Posts preview URL as PR comment                          │
└─────────────────────────────────────────────────────────────┘
```

## Workflow Details

### ci.yml

**Trigger:** PRs to main + pushes to main

**Jobs:**

1. **setup** - Checkout, pnpm install, build parser, upload artifacts
2. **test-parser** - Download artifacts, run parser tests
3. **test-api** - Download artifacts, run API tests
4. **test-web** - Download artifacts, run web tests
5. **quality** - TypeCheck + Lint (parallel with tests)

**Artifacts:**
- Parser dist uploaded by setup job
- Downloaded by all test jobs
- Retained for deploy workflow on main

### deploy.yml

**Trigger:** `workflow_run` after CI passes on main, plus manual `workflow_dispatch`

**Jobs:**

1. **deploy-web** - Download artifacts, deploy to Cloudflare Pages
2. **deploy-api** - Download artifacts, run migrations, deploy to Workers

**Conditions:**
- Only runs if CI workflow succeeded
- Manual trigger bypasses CI check (for emergencies)

### preview.yml

**Trigger:** PR opened/synchronized/reopened

**Jobs:**

1. **preview** - Build and deploy to Cloudflare Pages preview URL
2. Post/update PR comment with preview link

## Expected Improvements

| Metric | Before | After |
|--------|--------|-------|
| CI time | ~3-4 min | ~1.5-2 min |
| Deploy time | ~2 min | ~45 sec |
| Safety | Tests don't gate deploy | Tests required |
| PR review | Manual local testing | Auto preview URLs |

## Files to Modify

1. Create `.github/workflows/ci.yml`
2. Modify `.github/workflows/deploy.yml`
3. Create `.github/workflows/preview.yml`
4. Delete `.github/workflows/test.yml`

## Branch Protection (Manual Setup)

After implementation, configure in GitHub repo settings:
- Require `CI` workflow to pass before merge
- Require PR reviews (recommended)
