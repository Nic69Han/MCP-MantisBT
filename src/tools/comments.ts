/**
 * Comment-related MCP tools:
 *  - get_issue_comments → list all comments on an issue
 *  - add_comment        → post a new comment (WRITE/mutating operation)
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
  // get_issue_comments
  // ------------------------------------------------------------------
  server.tool(
    "get_issue_comments",
    "Retrieve all comments (notes) for a specific MantisBT issue. Returns each comment with its ID, text, reporter, and timestamp.",
    {
      issue_id: z.number().int().positive().describe("The numeric ID of the issue"),
    },
    async ({ issue_id }) => {
      try {
        const comments = await client.getIssueComments(issue_id);

        const formatted = comments.map((c) => ({
          id: c.id,
          text: c.text,
          reporter: c.reporter?.name,
          created_at: c.created_at,
          updated_at: c.updated_at,
          view_state: c.view_state?.name,
        }));

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                { issue_id, total: formatted.length, comments: formatted },
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

  // ------------------------------------------------------------------
  // add_comment — WRITE / MUTATING OPERATION
  // ------------------------------------------------------------------
  server.tool(
    "add_comment",
    "⚠️ WRITE OPERATION — Posts a new comment on a MantisBT issue. This permanently adds the comment to the issue. Use with caution. Returns the created comment ID and timestamp.",
    {
      issue_id: z.number().int().positive().describe("The numeric ID of the issue to comment on"),
      text: z.string().min(1).describe("The comment text to post"),
    },
    async ({ issue_id, text }) => {
      try {
        const response = await client.addComment(issue_id, text);
        const note = response.note;

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: true,
                  comment: {
                    id: note.id,
                    text: note.text,
                    reporter: note.reporter?.name,
                    created_at: note.created_at,
                  },
                },
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
