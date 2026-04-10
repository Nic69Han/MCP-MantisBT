/**
 * History-related MCP tools:
 *  - get_issue_history → retrieve the full audit trail of an issue
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { MantisClient, MantisApiError } from "../mantis-client.js";

function apiErrorContent(error: unknown): { content: Array<{ type: "text"; text: string }>; isError: true } {
  const message =
    error instanceof MantisApiError
      ? error.message
      : error instanceof Error
        ? error.message
        : "An unexpected error occurred";

  return {
    content: [{ type: "text" as const, text: JSON.stringify({ error: message }) }],
    isError: true,
  };
}

export function registerTools(server: McpServer, client: MantisClient): void {

  // ------------------------------------------------------------------
  // get_issue_history
  // ------------------------------------------------------------------
  server.tool(
    "get_issue_history",
    "Retrieve the full change history (audit trail) of a MantisBT issue. Returns each history entry with the field that changed, its old value, new value, the user who made the change, and the timestamp.",
    {
      issue_id: z.number().int().positive().describe("The numeric ID of the issue"),
    },
    async ({ issue_id }) => {
      try {
        const response = await client.getIssueHistory(issue_id);
        const entries = (response.history ?? []).map((entry) => ({
          timestamp: entry.created_at,
          user: entry.user?.name,
          type: entry.type?.name,
          field: entry.field,
          old_value: entry.old_value,
          new_value: entry.new_value,
        }));

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                { issue_id, total: entries.length, history: entries },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return apiErrorContent(error);
      }
    }
  );
}
