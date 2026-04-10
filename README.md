# MCP-MantisBT

## Overview

`MCP-MantisBT` is a **Model Context Protocol (MCP)** server that bridges MCP-compatible AI clients (VS Code Copilot, Claude Code, Cursor) with a **MantisBT** bug-tracking instance.

It exposes 14 typed tools that allow any MCP client to:
- Query, search, and list issues with rich filtering
- Read issue comments, history, attachments, and relationships
- Download file attachments as base64
- Browse projects, versions, and saved filters
- Post new comments (write operation)
- Inspect the authenticated user's profile

The server is stateless (no database), communicates over **stdio**, and is configured entirely through environment variables injected by the MCP host.

---

## Prerequisites

| Requirement | Details |
|---|---|
| Node.js | >= 18 |
| MantisBT | Instance with REST API v2 enabled (`/api/rest/`) |
| API Token | Generated in MantisBT user profile (see below) |

---

## Quick Start

**Step 1 — Create `.vscode/mcp.json`** in your workspace:

```json
{
  "servers": {
    "mantisbt": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "mantisbt-mcp-server"],
      "env": {
        "MANTIS_URL": "https://your-mantis-instance.com",
        "MANTIS_TOKEN": "your_api_token_here",
        "MANTIS_PROJECT": "1",
        "MANTIS_PAGE_SIZE": "25"
      }
    }
  }
}
```

**Step 2 — Replace the placeholder values:**
- `MANTIS_URL`: full URL of your MantisBT instance
- `MANTIS_TOKEN`: your personal API token (see section below)

**Step 3 — Open VS Code and start chatting:**

The MantisBT tools will be available to GitHub Copilot and any other MCP-compatible client. Try:
> "List all open issues assigned to me in project 3"
> "Show me the history of issue #1042"
> "Download the log file attached to issue #995"

---

## How to Get Your API Token

1. Log into MantisBT as your user
2. Navigate to: **My Account** → **API Tokens**
3. Enter a token name (e.g. `mcp-copilot`) and click **Create API Token**
4. Copy the token — it is shown **only once**
5. Paste it as the value of `MANTIS_TOKEN` in your `mcp.json`

> **Security note:** Treat this token like a password. Do not commit `mcp.json` to source control with real tokens. Use VS Code's user-level settings or a secrets manager for shared environments.

---

## Available Tools

| Tool Name | Description | Required Inputs |
|---|---|---|
| `get_issue` | Retrieve a full issue by ID | `issue_id` |
| `list_issues` | Paginated issue list with optional filters | *(all optional)* `project_id`, `status`, `assignee`, `limit`, `page` |
| `search_issues` | Full-text search across issues | `query` |
| `get_issue_comments` | All comments on an issue | `issue_id` |
| `add_comment` ⚠️ | Post a new comment (WRITE) | `issue_id`, `text` |
| `get_issue_history` | Full audit trail of changes | `issue_id` |
| `get_issue_attachments` | Attachment metadata for an issue | `issue_id` |
| `download_attachment` | Download attachment as base64 | `issue_id`, `attachment_id` |
| `list_projects` | All accessible projects | *(none)* |
| `get_project_versions` | All versions for a project | `project_id` |
| `list_filters` | All saved filters | *(none)* |
| `get_filter_issues` | Issues matching a saved filter | `filter_id` |
| `get_issue_relationships` | Related/duplicate/parent/child issues | `issue_id` |
| `get_current_user` | Authenticated user info | *(none)* |

> ⚠️ `add_comment` is a **write/mutating** operation. It permanently posts a comment to the specified issue.

---

## Environment Variables

| Name | Required | Default | Description |
|---|---|---|---|
| `MANTIS_URL` | ✅ Yes | — | Base URL of the MantisBT instance (e.g. `https://bugs.example.com`) |
| `MANTIS_TOKEN` | ✅ Yes | — | API token from MantisBT user profile |
| `MANTIS_PROJECT` | No | — | Default project scope for `list_issues` / `search_issues` (supports project ID or exact project name) |
| `MANTIS_PAGE_SIZE` | No | `25` | Default number of results per page for list operations |

---

## Local Development

```bash
npm install && npm run dev

# Compile to dist/ for production
npm run build

# Run compiled output
npm start
```

---

## Troubleshooting

### 1. `Error: MANTIS_URL environment variable is required`

The server exited before connecting because `MANTIS_URL` was not set.
**Fix:** Ensure both `MANTIS_URL` and `MANTIS_TOKEN` are present in the `env` block of your `mcp.json`.

### 2. `Invalid or expired MantisBT token`

The token was rejected by the MantisBT API with HTTP 401.
**Fix:** Regenerate the token in **My Account → API Tokens** and update `mcp.json`.

### 3. `MantisBT instance unreachable: https://...`

The server timed out trying to reach MantisBT (10-second limit).
**Fix:** Verify the `MANTIS_URL` is correct and accessible from the machine running VS Code. Check firewall rules or VPN connectivity.

### 4. `Insufficient permissions for this operation`

The API returned HTTP 403. Your token user lacks the required access level.
**Fix:** Ask your MantisBT administrator to grant the user at least **Reporter** access to the relevant project(s).
