/**
 * Filter-related MCP tools:
 *  - list_filters      → enumerate all saved filters for the current user
 *  - get_filter_issues → retrieve paginated issues for a specific filter
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

export function registerTools(server: McpServer, client: MantisClient, defaultPageSize: number): void {

  // ------------------------------------------------------------------
  // list_filters
  // ------------------------------------------------------------------
  server.tool(
    "list_filters",
    "List all saved issue filters accessible to the authenticated MantisBT user. Returns filter IDs, names, owning user, and visibility.",
    {},
    async () => {
      try {
        const filters = await client.listFilters();

        const formatted = filters.map((f) => ({
          id: f.id,
          name: f.name,
          owner: f.owner?.name,
          project: f.project?.name,
          is_public: f.is_public,
        }));

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ total: formatted.length, filters: formatted }, null, 2),
            },
          ],
        };
      } catch (error) {
        return apiErrorContent(error);
      }
    }
  );

  // ------------------------------------------------------------------
  // get_filter_issues
  // ------------------------------------------------------------------
  server.tool(
    "get_filter_issues",
    "Retrieve a paginated list of issues matching a saved MantisBT filter. Use list_filters to find available filter IDs.",
    {
      filter_id: z.number().int().positive().describe("The numeric ID of the saved filter"),
      limit: z.number().int().positive().max(100).optional().describe("Number of issues per page (default: MANTIS_PAGE_SIZE env var)"),
      page: z.number().int().positive().optional().default(1).describe("Page number, 1-based (default: 1)"),
    },
    async ({ filter_id, limit, page }) => {
      try {
        const result = await client.getFilterIssues({
          filter_id,
          page_size: limit ?? defaultPageSize,
          page,
        });

        const issues = (result.issues ?? []).map((issue) => ({
          id: issue.id,
          summary: issue.summary,
          status: issue.status?.name,
          priority: issue.priority?.name,
          severity: issue.severity?.name,
          assignee: issue.handler?.name,
          project: issue.project?.name,
          created_at: issue.created_at,
          updated_at: issue.updated_at,
        }));

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                { filter_id, page, total: issues.length, issues },
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
