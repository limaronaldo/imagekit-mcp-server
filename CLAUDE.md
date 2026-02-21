# ImageKit MCP Server

**Published:** February 21, 2026
**npm:** https://www.npmjs.com/package/imagekit-mcp-server
**GitHub:** https://github.com/limaronaldo/imagekit-mcp-server
**Version:** 1.0.0

## Overview

MCP server for ImageKit.io media management. Runs locally via stdio — no hosting required. Published on npm, installable with `npx imagekit-mcp-server`.

## Architecture

Single file (`index.js`, ~350 lines) using:
- `@modelcontextprotocol/sdk` v1.26 — `McpServer` class with zod schemas
- `imagekit` v6.0 — ImageKit Node.js SDK (deprecated name, works fine; successor is `@imagekit/nodejs`)
- `zod` v3.24 — Schema validation for tool parameters

### Key design decisions
- **Single shared upload helper** (`uploadToImageKit`) — all 3 upload tools delegate to it, eliminating duplication
- **Shared upload schema** (`uploadOptionsSchema`) — spread into each upload tool definition
- **Lazy client init** — `getClient()` creates the ImageKit client on first tool call, not at startup
- **All logging to stderr** — MCP uses stdout for JSON-RPC, so `console.error()` only
- **`isError: true`** on error responses — signals tool failures properly to the MCP client
- **No hardcoded credentials** — fail-fast if env vars missing

## Tools (11)

| Tool | Description | Key params |
|------|-------------|------------|
| `list_files` | List and search files | `path`, `searchQuery`, `limit`, `skip`, `fileType`, `sort` |
| `list_folders` | List folders at path | `path` |
| `get_file_details` | Full metadata for a file | `fileId` |
| `upload_file` | Upload local file | `filePath`, `fileName`, `folder`, `tags` |
| `upload_file_from_url` | Upload from URL | `url`, `fileName`, `folder`, `tags` |
| `upload_base64_file` | Upload base64 data | `base64Data`, `fileName`, `folder`, `tags` |
| `delete_file` | Delete a file | `fileId` |
| `create_folder` | Create folder | `folderName`, `parentFolderPath` |
| `delete_folder` | Delete folder | `folderPath` |
| `move_file` | Move file between folders | `sourceFilePath`, `destinationPath` |
| `generate_url` | URL with transformations | `path`/`src`, `transformation`, `signed`, `expireSeconds` |

## Credentials

From ImageKit Dashboard: https://imagekit.io/dashboard/developer/api-keys

```
IMAGEKIT_PUBLIC_KEY=public_LUN1QeVoI28No5eAmV/jeI4TBKM=
IMAGEKIT_PRIVATE_KEY=private_GYx0LD5QFpIZjBATBidrVULgh4A=
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/xybwnx8js
```

## MCP Configuration

### Claude Code (`~/.claude/mcp.json`)
```json
"imagekit": {
  "command": "npx",
  "args": ["-y", "imagekit-mcp-server"],
  "env": {
    "IMAGEKIT_PUBLIC_KEY": "public_LUN1QeVoI28No5eAmV/jeI4TBKM=",
    "IMAGEKIT_PRIVATE_KEY": "private_GYx0LD5QFpIZjBATBidrVULgh4A=",
    "IMAGEKIT_URL_ENDPOINT": "https://ik.imagekit.io/xybwnx8js"
  }
}
```

### Claude Desktop (`~/Library/Application Support/Claude/claude_desktop_config.json`)
Same config as above, inside `"mcpServers": { ... }`.

## File Structure

```
imagekit-mcp-server/
├── index.js              # MCP server (the only runtime file)
├── package.json          # npm package config (bin: imagekit-mcp-server)
├── package-lock.json     # Dependency lockfile
├── .env                  # Local credentials (gitignored)
├── .env.example          # Template for credentials
├── .gitignore            # node_modules, .env, logs, venv, .claude/
├── LICENSE               # MIT
├── README.md             # Public documentation
├── CLAUDE.md             # This file
│
│ # Legacy files (not in git, kept on disk for reference)
├── imagekit_mcp_server.py  # Python/FastMCP implementation (legacy)
├── Dockerfile              # Python Docker build (legacy)
├── docker-compose.yml      # Docker compose config (legacy)
├── deploy.sh               # Docker deploy script (legacy)
├── requirements.txt        # Python deps (legacy)
└── test_connection.py      # Python test script (legacy)
```

## Development

```bash
cd /Users/ronaldo/Projects/_ATIVO/TOOLS/imagekit-mcp-server
npm install

# Run locally
IMAGEKIT_PUBLIC_KEY=... IMAGEKIT_PRIVATE_KEY=... IMAGEKIT_URL_ENDPOINT=... node index.js

# Test MCP protocol
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | node index.js 2>/dev/null
```

## Publishing

```bash
# Bump version in package.json, then:
npm publish
# Requires npm automation token (2FA bypass) — create at npmjs.com/settings/ronaldomlima/tokens
```

## History

- **v1.0.0 (Feb 21, 2026):** Initial release. Consolidated from dual Python + Node.js implementations into single clean Node.js server. 11 tools, zod schemas, MCP SDK v1.26. Removed hardcoded credentials, eliminated DRY violations (3 upload functions → 1 shared helper), fixed stdout logging that corrupted MCP protocol in Python version. Published to npm and GitHub.
