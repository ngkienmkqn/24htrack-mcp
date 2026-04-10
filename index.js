import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

const API_BASE = 'https://api.24htrack.com'

/**
 * Create a 24hTrack MCP Server instance
 * @param {string} apiKey - 24hTrack API key
 * @returns {McpServer}
 */
export function create24hTrackServer(apiKey) {
    const server = new McpServer({
        name: '24htrack',
        version: '1.0.0',
        description: 'Universal package tracking across 30+ carriers (USPS, UPS, FedEx, DHL, Evri, Yanwen, 4PX, etc.)',
    })

    // ─── Helper: API call ────────────────────────────────────
    async function apiCall(method, path, body) {
        const url = `${API_BASE}${path}`
        const opts = {
            method,
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
        }
        if (body) opts.body = JSON.stringify(body)

        const res = await fetch(url, opts)
        if (!res.ok) {
            const text = await res.text()
            throw new Error(`API ${res.status}: ${text}`)
        }
        return res.json()
    }

    // ─── Tool: track_package ─────────────────────────────────
    server.tool(
        'track_package',
        'Get tracking status and events for one or more packages. Returns carrier, status, latest event, and full event history.',
        {
            tracking_numbers: z.array(z.string()).min(1).max(40)
                .describe('Array of tracking numbers to look up (max 40)'),
        },
        async ({ tracking_numbers }) => {
            const items = tracking_numbers.map(n => ({ number: n.trim() }))
            const result = await apiCall('POST', '/track/v1/gettrackinfo', items)

            if (result.code !== 0) {
                return { content: [{ type: 'text', text: `Error: ${result.message || 'Unknown error'}` }] }
            }

            const lines = []
            for (const item of (result.data?.accepted || [])) {
                const t = item.track || {}
                lines.push(`📦 ${item.number} (${item.carrier})`)
                lines.push(`   Status: ${t.status_name || 'Unknown'} (code ${t.status})`)
                if (t.latest_event?.description) {
                    lines.push(`   Latest: ${t.latest_event.description}`)
                    if (t.latest_event.location) lines.push(`   Location: ${t.latest_event.location}`)
                    if (t.latest_event.time) lines.push(`   Time: ${t.latest_event.time}`)
                }
                if (t.events?.length > 0) {
                    lines.push(`   Events (${t.events.length}):`)
                    for (const e of t.events.slice(0, 10)) {
                        lines.push(`     • ${e.time || ''} — ${e.description || ''} ${e.location ? `(${e.location})` : ''}`)
                    }
                    if (t.events.length > 10) lines.push(`     ... and ${t.events.length - 10} more`)
                }
                lines.push('')
            }
            for (const rej of (result.data?.rejected || [])) {
                lines.push(`❌ ${rej.number}: ${rej.reason}`)
            }

            return { content: [{ type: 'text', text: lines.join('\n') || 'No results' }] }
        }
    )

    // ─── Tool: register_tracking ─────────────────────────────
    server.tool(
        'register_tracking',
        'Register tracking numbers for monitoring. Must be called before track_package if the numbers are new. Each number is auto-detected for carrier.',
        {
            tracking_numbers: z.array(z.object({
                number: z.string().describe('Tracking number'),
                description: z.string().optional().describe('Optional label/description for this package'),
            })).min(1).max(40).describe('Tracking numbers to register (max 40)'),
        },
        async ({ tracking_numbers }) => {
            const items = tracking_numbers.map(t => ({
                number: t.number.trim(),
                tag: t.description || '',
            }))
            const result = await apiCall('POST', '/track/v1/register', items)

            if (result.code !== 0) {
                return { content: [{ type: 'text', text: `Error: ${result.message}` }] }
            }

            const lines = []
            for (const a of (result.data?.accepted || [])) {
                lines.push(`✅ ${a.number} → ${a.carrier}${a.note ? ` (${a.note})` : ''}`)
            }
            for (const r of (result.data?.rejected || [])) {
                lines.push(`❌ ${r.number}: ${r.reason}`)
            }

            return { content: [{ type: 'text', text: lines.join('\n') || 'No items processed' }] }
        }
    )

    // ─── Tool: list_tracking ─────────────────────────────────
    server.tool(
        'list_tracking',
        'List all registered tracking numbers with their current status. Paginated.',
        {
            page: z.number().int().min(1).default(1).optional()
                .describe('Page number (default 1)'),
            page_size: z.number().int().min(1).max(200).default(40).optional()
                .describe('Items per page (default 40, max 200)'),
        },
        async ({ page = 1, page_size = 40 }) => {
            const result = await apiCall('POST', '/track/v1/gettracklist', {
                page_no: page,
                page_size,
            })

            if (result.code !== 0) {
                return { content: [{ type: 'text', text: `Error: ${result.message}` }] }
            }

            const d = result.data
            const lines = [`Tracking List — Page ${d.page_no}/${Math.ceil(d.total / d.page_size)} (${d.total} total)\n`]

            for (const item of d.items) {
                const status = item.status_name || 'Unknown'
                lines.push(`• ${item.number} (${item.carrier}) — ${status}`)
                if (item.detail) lines.push(`  ${item.detail}`)
            }

            return { content: [{ type: 'text', text: lines.join('\n') || 'No tracking numbers registered' }] }
        }
    )

    // ─── Tool: realtime_track ────────────────────────────────
    server.tool(
        'realtime_track',
        'Force a real-time re-check of tracking numbers. Use when you need the freshest status. Results may take 2-5 minutes to update.',
        {
            tracking_numbers: z.array(z.string()).min(1).max(10)
                .describe('Tracking numbers to force re-check (max 10)'),
        },
        async ({ tracking_numbers }) => {
            const items = tracking_numbers.map(n => ({ number: n.trim() }))
            const result = await apiCall('POST', '/track/v1/getrealtimetrackinfo', items)

            if (result.code !== 0) {
                return { content: [{ type: 'text', text: `Error: ${result.message}` }] }
            }

            const lines = []
            for (const a of (result.data?.accepted || [])) {
                const t = a.track || {}
                lines.push(`🔄 ${a.number} (${a.carrier}) — ${t.status_name || 'Queued for re-check'}`)
                if (t._note) lines.push(`   ℹ️ ${t._note}`)
            }
            for (const r of (result.data?.rejected || [])) {
                lines.push(`❌ ${r.number}: ${r.reason}`)
            }

            return { content: [{ type: 'text', text: lines.join('\n') || 'No results' }] }
        }
    )

    // ─── Tool: delete_tracking ───────────────────────────────
    server.tool(
        'delete_tracking',
        'Archive (soft-delete) tracking numbers. They will no longer appear in your tracking list.',
        {
            tracking_numbers: z.array(z.string()).min(1).max(40)
                .describe('Tracking numbers to archive (max 40)'),
        },
        async ({ tracking_numbers }) => {
            const items = tracking_numbers.map(n => ({ number: n.trim() }))
            const result = await apiCall('POST', '/track/v1/deletetrackinfo', items)

            if (result.code !== 0) {
                return { content: [{ type: 'text', text: `Error: ${result.message}` }] }
            }

            const lines = []
            for (const a of (result.data?.accepted || [])) lines.push(`🗑️ ${a.number} archived`)
            for (const r of (result.data?.rejected || [])) lines.push(`❌ ${r.number}: ${r.reason}`)

            return { content: [{ type: 'text', text: lines.join('\n') }] }
        }
    )

    // ─── Tool: get_carriers ──────────────────────────────────
    server.tool(
        'get_carriers',
        'List all supported carriers and their detection patterns.',
        {},
        async () => {
            const result = await apiCall('GET', '/track/v1/getcarrierlist')

            if (result.code !== 0) {
                return { content: [{ type: 'text', text: `Error: ${result.message}` }] }
            }

            const lines = ['Supported Carriers:\n']
            for (const c of (result.data || [])) {
                lines.push(`• ${c.name} (${c.country}) — key: ${c.key}`)
            }
            lines.push('\n+ 25 more via aggregator routing (Evri, Canada Post, Royal Mail, Australia Post, DPD, UniUni, SpeedX, etc.)')

            return { content: [{ type: 'text', text: lines.join('\n') }] }
        }
    )

    return server
}

// ─── Standalone runner ───────────────────────────────────────
export async function main() {
    const apiKey = process.env.TRACK24H_API_KEY || process.env.API_KEY

    if (!apiKey) {
        console.error('Error: Set TRACK24H_API_KEY environment variable')
        console.error('Get your API key at https://www.24htrack.com → Developer Settings')
        process.exit(1)
    }

    const server = create24hTrackServer(apiKey)
    const transport = new StdioServerTransport()
    await server.connect(transport)
}
