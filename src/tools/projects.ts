/**
 * Project-related MCP tools:
 *  - list_projects        → enumerate all accessible projects
 *  - get_project_versions → list all versions for a project
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
  // list_projects
  // ------------------------------------------------------------------
  server.tool(
    "list_projects",
    "List all MantisBT projects accessible to the configured API token. Returns project IDs, names, status, and descriptions.",
    {},
    async () => {
      try {
        const projects = await client.listProjects();

        const formatted = projects.map((p) => ({
          id: p.id,
          name: p.name,
          status: p.status?.name,
          description: p.description,
          enabled: p.enabled,
          view_state: p.view_state?.name,
          subprojects: p.subprojects?.map((sp) => ({
            id: sp.id,
            name: sp.name,
          })),
        }));

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ total: formatted.length, projects: formatted }, null, 2),
            },
          ],
        };
      } catch (error) {
        return apiErrorContent(error);
      }
    }
  );

  // ------------------------------------------------------------------
  // get_project_versions
  // ------------------------------------------------------------------
  server.tool(
    "get_project_versions",
    "Retrieve all versions defined for a MantisBT project. Returns each version's ID, name, release status, obsolete flag, and release date.",
    {
      project_id: z.number().int().positive().describe("The numeric ID of the project"),
    },
    async ({ project_id }) => {
      try {
        const versions = await client.getProjectVersions(project_id);

        const formatted = versions.map((v) => ({
          id: v.id,
          name: v.name,
          description: v.description,
          released: v.released,
          obsolete: v.obsolete,
          date: v.timestamp,
        }));

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                { project_id, total: formatted.length, versions: formatted },
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
