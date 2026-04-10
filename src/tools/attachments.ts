/**
 * Attachment-related MCP tools:
 *  - get_issue_attachments → list all attachments with metadata
 *  - download_attachment   → download a specific attachment as base64
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
  // get_issue_attachments
  // ------------------------------------------------------------------
  server.tool(
    "get_issue_attachments",
    "List all file attachments for a MantisBT issue. Returns metadata including attachment ID, filename, file size, content type, and download URL.",
    {
      issue_id: z.number().int().positive().describe("The numeric ID of the issue"),
    },
    async ({ issue_id }) => {
      try {
        const attachments = await client.getIssueAttachments(issue_id);

        const formatted = attachments.map((a) => ({
          id: a.id,
          filename: a.filename,
          size: a.size,
          content_type: a.content_type,
          download_url: a.download_url,
          created_at: a.created_at,
          reporter: a.reporter?.name,
          description: a.description,
        }));

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                { issue_id, total: formatted.length, attachments: formatted },
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
  // download_attachment
  // ------------------------------------------------------------------
  server.tool(
    "download_attachment",
    "Download a specific file attachment from a MantisBT issue and return it as a base64-encoded string along with its filename and content type. Useful for reading log files, screenshots, or documents attached to issues.",
    {
      issue_id: z.number().int().positive().describe("The numeric ID of the issue"),
      attachment_id: z.number().int().positive().describe("The numeric ID of the attachment to download"),
    },
    async ({ issue_id, attachment_id }) => {
      try {
        const { content, filename, content_type } =
          await client.downloadAttachment(issue_id, attachment_id);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  filename,
                  content_type,
                  size_bytes: content.length,
                  content_base64: content.toString("base64"),
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
