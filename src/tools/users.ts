/**
 * User-related MCP tools:
 *  - get_current_user → retrieve info about the token's authenticated user
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
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
  // get_current_user
  // ------------------------------------------------------------------
  server.tool(
    "get_current_user",
    "Retrieve information about the currently authenticated MantisBT user (based on the MANTIS_TOKEN). Returns user ID, username, real name, email, and access level.",
    {},
    async () => {
      try {
        const user = await client.getCurrentUser();

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  id: user.id,
                  name: user.name,
                  real_name: user.real_name,
                  email: user.email,
                  access_level: user.access_level?.name,
                  language: user.language,
                  timezone: user.timezone,
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
