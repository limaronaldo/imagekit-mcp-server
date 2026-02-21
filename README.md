# ImageKit MCP Server

A [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server for [ImageKit.io](https://imagekit.io) that lets AI assistants upload, search, transform, and manage media assets in your ImageKit media library.

## Quick Start

```bash
npx imagekit-mcp-server
```

Requires three environment variables:

```bash
IMAGEKIT_PUBLIC_KEY=public_xxx
IMAGEKIT_PRIVATE_KEY=private_xxx
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_id
```

Get your credentials from the [ImageKit Dashboard](https://imagekit.io/dashboard/developer/api-keys).

## MCP Client Configuration

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "imagekit": {
      "command": "npx",
      "args": ["-y", "imagekit-mcp-server"],
      "env": {
        "IMAGEKIT_PUBLIC_KEY": "public_xxx",
        "IMAGEKIT_PRIVATE_KEY": "private_xxx",
        "IMAGEKIT_URL_ENDPOINT": "https://ik.imagekit.io/your_id"
      }
    }
  }
}
```

### Claude Code

Add to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "imagekit": {
      "command": "npx",
      "args": ["-y", "imagekit-mcp-server"],
      "env": {
        "IMAGEKIT_PUBLIC_KEY": "public_xxx",
        "IMAGEKIT_PRIVATE_KEY": "private_xxx",
        "IMAGEKIT_URL_ENDPOINT": "https://ik.imagekit.io/your_id"
      }
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json` in your project:

```json
{
  "mcpServers": {
    "imagekit": {
      "command": "npx",
      "args": ["-y", "imagekit-mcp-server"],
      "env": {
        "IMAGEKIT_PUBLIC_KEY": "public_xxx",
        "IMAGEKIT_PRIVATE_KEY": "private_xxx",
        "IMAGEKIT_URL_ENDPOINT": "https://ik.imagekit.io/your_id"
      }
    }
  }
}
```

## Tools

| Tool | Description |
|------|-------------|
| `list_files` | List and search files with filters (path, type, search query, pagination, sort) |
| `list_folders` | List folders at a given path |
| `get_file_details` | Get full metadata for a file (dimensions, tags, URLs, dates) |
| `upload_file` | Upload a local file |
| `upload_file_from_url` | Upload from a remote URL |
| `upload_base64_file` | Upload from base64 data |
| `delete_file` | Delete a file by ID |
| `create_folder` | Create a new folder |
| `delete_folder` | Delete a folder |
| `move_file` | Move a file to a different folder |
| `generate_url` | Generate URLs with transformations (resize, crop, format, signed URLs) |

## Examples

Ask your AI assistant:

- "List all images in the /products/ folder"
- "Upload this screenshot to /screenshots/2026/"
- "Generate a 300x300 thumbnail for /hero-banner.jpg"
- "Search for files named 'logo'"
- "Move /old-folder/image.jpg to /new-folder/"
- "Delete the file with ID abc123"

## Development

```bash
git clone https://github.com/limaronaldo/imagekit-mcp-server.git
cd imagekit-mcp-server
npm install

# Set credentials
export IMAGEKIT_PUBLIC_KEY=public_xxx
export IMAGEKIT_PRIVATE_KEY=private_xxx
export IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_id

# Run
node index.js
```

## License

MIT
