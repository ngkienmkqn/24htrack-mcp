# 24hTrack MCP Server

Universal package tracking for AI agents via [Model Context Protocol](https://modelcontextprotocol.io). Track packages across **3,200+ carriers** including USPS, UPS, FedEx, DHL, China Post, Yanwen, YunExpress, UniUni, SpeedX, Evri, 4PX, and more — with automatic carrier detection, so agents can paste any tracking number and get a real-time event timeline.

## Quick Setup

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "24htrack": {
      "command": "npx",
      "args": ["-y", "24htrack-mcp"],
      "env": {
        "TRACK24H_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Claude Code

```bash
claude mcp add 24htrack -- npx -y 24htrack-mcp
```

Then set the env variable:
```bash
export TRACK24H_API_KEY=your-api-key-here
```

### Cursor / Windsurf

Add to MCP settings:

```json
{
  "24htrack": {
    "command": "npx",
    "args": ["-y", "24htrack-mcp"],
    "env": {
      "TRACK24H_API_KEY": "your-api-key-here"
    }
  }
}
```

## Get Your API Key

1. Register at [24htrack.com](https://www.24htrack.com/register)
2. Go to **Developer Settings**
3. Create an API key

## Available Tools

| Tool | Description |
|------|-------------|
| `track_package` | Get tracking status and full event history for up to 40 packages |
| `register_tracking` | Register new tracking numbers for monitoring |
| `list_tracking` | List all your registered tracking numbers with status |
| `realtime_track` | Force a real-time re-check (results in 2-5 min) |
| `delete_tracking` | Archive tracking numbers |
| `get_carriers` | List all supported carriers |

## Example Usage

Once connected, just ask your AI:

> "Track my package 1Z999AA10123456784"

> "Register these tracking numbers and check their status: 9400111899223456789012, 1Z999AA10123456784"

> "Show me all my tracked packages"

> "What carriers does 24hTrack support?"

## Supported Carriers

USPS, UPS, FedEx, DHL, YunExpress, Yanwen Express, 4PX, Evri, Canada Post, Royal Mail, Australia Post, DPD, UniUni, SpeedX, and 25+ more via aggregator routing.

## Links

- Website: [24htrack.com](https://www.24htrack.com)
- API Docs: [24htrack.com/api](https://www.24htrack.com/api)
- Pricing: [24htrack.com/pricing](https://www.24htrack.com/pricing)

## License

MIT
