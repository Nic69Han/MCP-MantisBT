/**
 * Issue-related MCP tools:
 *  - get_issue        → fetch a single issue by ID
 *  - list_issues      → paginated list with optional filters
 *  - search_issues    → full-text search across issues
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { MantisClient, MantisApiError } from "../mantis-client.js";

// ---------------------------------------------------------------------------
// Helper — format a MantisApiError into an MCP tool error response
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Register
// ---------------------------------------------------------------------------

export function registerTools(
  server: McpServer,
  client: MantisClient,
  defaultPageSize: number,
  defaultProject?: string
): void {

  async function resolveDefaultProjectId(): Promise<number | undefined> {
    if (!defaultProject) return undefined;

    const numericId = Number.parseInt(defaultProject, 10);
    if (!Number.isNaN(numericId) && numericId > 0) {
      return numericId;
    }

    const projects = await client.listProjects();
    const match = projects.find(
      (p) => p.name.toLowerCase() === defaultProject.toLowerCase()
    );
    return match?.id;
  }

  // ------------------------------------------------------------------
  // get_issue
  // ------------------------------------------------------------------
  server.tool(
    "get_issue",
    "Retrieve a single MantisBT issue by its numeric ID. Returns full details including summary, description, status, priority, severity, reporter, assignee, project, and timestamps.",
    {
      issue_id: z.number().int().positive().describe("The numeric ID of the issue to retrieve"),
    },
    async ({ issue_id }) => {
      try {
        const issue = await client.getIssue(issue_id);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                id: issue.id,
                summary: issue.summary,
                description: issue.description,
                status: issue.status?.name,
                priority: issue.priority?.name,
                severity: issue.severity?.name,
                resolution: issue.resolution?.name,
                project: issue.project?.name,
                category: issue.category?.name,
                reporter: issue.reporter?.name,
                assignee: issue.handler?.name,
                version: issue.version,
                fixed_in_version: issue.fixed_in_version,
                target_version: issue.target_version,
                created_at: issue.created_at,
                updated_at: issue.updated_at,
                due_date: issue.due_date,
                tags: issue.tags?.map((t) => t.name),
                custom_fields: issue.custom_fields?.map((cf) => ({
                  name: cf.field.name,
                  value: cf.value,
                })),
              }, null, 2),
            },
          ],
        };
      } catch (error) {
        return apiErrorContent(error);
      }
    }
  );

  // ------------------------------------------------------------------
  // list_issues
  // ------------------------------------------------------------------
  server.tool(
    "list_issues",
    "List MantisBT issues with optional filtering by project, status, and assignee. Returns a paginated list with summary, status, priority, and assignee for each issue.",
    {
      project_id: z.number().int().positive().optional().describe("Filter by project ID"),
      status: z.string().optional().describe("Filter by status name (e.g. 'new', 'assigned', 'resolved', 'closed')"),
      assignee: z.string().optional().describe("Filter by assignee username"),
      limit: z.number().int().positive().max(100).optional().describe("Number of issues to return (default: MANTIS_PAGE_SIZE env var)"),
      page: z.number().int().positive().optional().default(1).describe("Page number, 1-based (default: 1)"),
    },
    async ({ project_id, status, assignee, limit, page }) => {
      try {
        const resolvedProjectId = project_id ?? (await resolveDefaultProjectId());
        const result = await client.listIssues({
          project_id: resolvedProjectId,
          status,
          handler_name: assignee,
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
              text: JSON.stringify({ total: issues.length, issues }, null, 2),
            },
          ],
        };
      } catch (error) {
        return apiErrorContent(error);
      }
    }
  );

  // ------------------------------------------------------------------
  // search_issues
  // ------------------------------------------------------------------
  server.tool(
    "search_issues",
    "Perform a full-text search across MantisBT issues. Searches in summary and description fields. Returns matching issues with their summary, status, and priority.",
    {
      query: z.string().min(1).describe("Full-text search query string"),
      project_id: z.number().int().positive().optional().describe("Limit search to a specific project ID"),
      limit: z.number().int().positive().max(100).optional().describe("Maximum number of results to return (default: MANTIS_PAGE_SIZE env var)"),
    },
    async ({ query, project_id, limit }) => {
      try {
        const resolvedProjectId = project_id ?? (await resolveDefaultProjectId());
        const result = await client.searchIssues({
          search: query,
          project_id: resolvedProjectId,
          page_size: limit ?? defaultPageSize,
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
                { query, total: issues.length, issues },
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
