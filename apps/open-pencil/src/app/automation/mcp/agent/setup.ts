import { MCP_INSTALL_TARGET } from '@/app/automation/mcp/failure'

/** Stdio entry point installed by `@open-pencil/mcp`; it forwards to the app's local server. */
export const MCP_STDIO_EXECUTABLE = 'openpencil-mcp'

/** Server name agents register OpenPencil under. */
export const MCP_CLIENT_SERVER_NAME = 'open-pencil'

export const MCP_DOCS_URL = 'https://openpencil.dev/programmable/mcp-server'

/** Product names are not translated; copy receives them as placeholders. */
export const AGENT_CLIENT_NAMES = {
  primary: 'Claude Code',
  others: 'Claude Desktop, Cursor',
  all: 'Claude Code, Claude Desktop, Cursor'
} as const

export interface AgentSetupCommands {
  install: string
  claudeCode: string
  clientConfig: string
}

/** Setup commands for connecting an agent to the desktop app over stdio. */
export const agentSetupCommands: AgentSetupCommands = {
  install: `npm install -g ${MCP_INSTALL_TARGET}`,
  claudeCode: `claude mcp add --scope user ${MCP_CLIENT_SERVER_NAME} -- ${MCP_STDIO_EXECUTABLE}`,
  clientConfig: JSON.stringify(
    { mcpServers: { [MCP_CLIENT_SERVER_NAME]: { command: MCP_STDIO_EXECUTABLE } } },
    null,
    2
  )
}

/**
 * The development server runs its MCP server with an isolated discovery file,
 * so the stdio bridge cannot find it. Agents connect over Streamable HTTP instead.
 */
export function developmentHTTPCommand(endpoint: string): string {
  return `claude mcp add --transport http ${MCP_CLIENT_SERVER_NAME} ${endpoint}`
}
