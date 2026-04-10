#!/usr/bin/env node
/**
 * MantisBT MCP Server — entry point
 *
 * Responsibilities (in order):
 *  1. Validate required environment variables
 *  2. Instantiate MantisClient
 *  3. Register all tool modules
 *  4. Connect to stdio transport and start serving
 *
 * Configuration is injected exclusively via environment variables —
 * no config files or .env loading at runtime.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { MantisClient } from "./mantis-client.js";
import * as issueTools from "./tools/issues.js";
import * as commentTools from "./tools/comments.js";
import * as historyTools from "./tools/history.js";
import * as attachmentTools from "./tools/attachments.js";
import * as projectTools from "./tools/projects.js";
import * as filterTools from "./tools/filters.js";
import * as relationTools from "./tools/relations.js";
import * as userTools from "./tools/users.js";

// ---------------------------------------------------------------------------
// Environment variable validation
// ---------------------------------------------------------------------------

const MANTIS_URL = process.env["MANTIS_URL"];
const MANTIS_TOKEN = process.env["MANTIS_TOKEN"];
const MANTIS_PROJECT = process.env["MANTIS_PROJECT"];
const MANTIS_PAGE_SIZE = parseInt(process.env["MANTIS_PAGE_SIZE"] ?? "25", 10);

if (!MANTIS_URL) {
  throw new Error("MANTIS_URL environment variable is required");
}

if (!MANTIS_TOKEN) {
  throw new Error("MANTIS_TOKEN environment variable is required");
}

const pageSize = isNaN(MANTIS_PAGE_SIZE) || MANTIS_PAGE_SIZE <= 0 ? 25 : MANTIS_PAGE_SIZE;

// ---------------------------------------------------------------------------
// Client initialisation
// ---------------------------------------------------------------------------

const client = new MantisClient(MANTIS_URL, MANTIS_TOKEN);

// ---------------------------------------------------------------------------
// MCP server initialisation
// ---------------------------------------------------------------------------

const server = new McpServer({
  name: "mantisbt-mcp-server",
  version: "1.0.0",
});

// ---------------------------------------------------------------------------
// Tool registration
// ---------------------------------------------------------------------------

issueTools.registerTools(server, client, pageSize, MANTIS_PROJECT);
commentTools.registerTools(server, client);
historyTools.registerTools(server, client);
attachmentTools.registerTools(server, client);
projectTools.registerTools(server, client);
filterTools.registerTools(server, client, pageSize);
relationTools.registerTools(server, client);
userTools.registerTools(server, client);

// ---------------------------------------------------------------------------
// Transport connection
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write(
    `[mantisbt-mcp-server] Connected to MantisBT at ${MANTIS_URL}\n`
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[mantisbt-mcp-server] Fatal error: ${message}\n`);
  process.exit(1);
});
