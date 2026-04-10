/**
 * Relationship-related MCP tools:
 *  - get_issue_relationships → list related, duplicate, parent, and child issues
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
  // get_issue_relationships
  // ------------------------------------------------------------------
  server.tool(
    "get_issue_relationships",
    "Retrieve all relationships (related, duplicate, parent, child) for a MantisBT issue. Returns each linked issue with its ID, summary, status, and relationship type.",
    {
      issue_id: z.number().int().positive().describe("The numeric ID of the issue"),
    },
    async ({ issue_id }) => {
      try {
        const relationships = await client.getIssueRelationships(issue_id);

        const formatted = relationships.map((r) => ({
          relationship_type: r.type?.name,
          related_issue: {
            id: r.issue?.id,
            summary: r.issue?.summary,
            status: r.issue?.status?.name,
            priority: r.issue?.priority?.name,
            project: r.issue?.project?.name,
          },
        }));

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                { issue_id, total: formatted.length, relationships: formatted },
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
