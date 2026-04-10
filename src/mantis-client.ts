/**
 * MantisClient — a typed Axios wrapper for the MantisBT REST API v2.
 *
 * Responsibilities:
 *  - Centralise all HTTP communication with the MantisBT instance
 *  - Attach the X-Mantis-Token header on every request
 *  - Map HTTP error codes to domain-specific error messages
 *  - Enforce a global 10-second timeout
 */

import axios, { AxiosInstance, AxiosError } from "axios";
import type {
  MantisIssue,
  MantisIssueListResponse,
  MantisComment,
  MantisAddCommentResponse,
  MantisHistoryResponse,
  MantisAttachment,
  MantisProject,
  MantisProjectsResponse,
  MantisVersion,
  MantisVersionsResponse,
  MantisFilter,
  MantisFiltersResponse,
  MantisRelationship,
  MantisCurrentUser,
} from "./types.js";

// ---------------------------------------------------------------------------
// Custom error class so callers can distinguish API errors from bugs
// ---------------------------------------------------------------------------

export class MantisApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = "MantisApiError";
  }
}

// ---------------------------------------------------------------------------
// Query-parameter shapes
// ---------------------------------------------------------------------------

export interface ListIssuesParams {
  project_id?: number;
  status?: string;
  handler_name?: string;
  page_size?: number;
  page?: number;
}

export interface SearchIssuesParams {
  search?: string;
  project_id?: number;
  page_size?: number;
  page?: number;
}

export interface FilterIssuesParams {
  filter_id: number;
  page_size?: number;
  page?: number;
}

// ---------------------------------------------------------------------------
// MantisClient
// ---------------------------------------------------------------------------

export class MantisClient {
  private readonly http: AxiosInstance;
  private readonly instanceUrl: string;

  constructor(baseUrl: string, token: string) {
    this.instanceUrl = baseUrl.replace(/\/+$/, "");
    this.http = axios.create({
      baseURL: this.instanceUrl + "/api/rest",
      timeout: 10_000,
      headers: {
        "X-Mantis-Token": token,
        // Apache reverse-proxy in front of MantisBT requires the token
        // to also be present in the Authorization header (API Key scheme).
        "Authorization": token,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
  }

  // -------------------------------------------------------------------------
  // Error mapping — converts Axios HTTP errors into human-readable messages
  // -------------------------------------------------------------------------

  private mapError(error: unknown, resourceHint?: string): MantisApiError {
    if (axios.isAxiosError(error)) {
      const axiosErr = error as AxiosError;
      const status = axiosErr.response?.status;

      if (!axiosErr.response) {
        // Network-level failure (timeout, ECONNREFUSED, etc.)
        return new MantisApiError(
          `MantisBT instance unreachable: ${this.instanceUrl}`,
          undefined
        );
      }

      switch (status) {
        case 401:
          return new MantisApiError(
            "Invalid or expired MantisBT token",
            401
          );
        case 403:
          return new MantisApiError(
            "Insufficient permissions for this operation",
            403
          );
        case 404:
          return new MantisApiError(
            resourceHint
              ? `Resource not found: ${resourceHint}`
              : "Resource not found",
            404
          );
        default:
          return new MantisApiError(
            `MantisBT API error: HTTP ${status ?? "unknown"}`,
            status
          );
      }
    }

    if (error instanceof Error) {
      return new MantisApiError(error.message);
    }

    return new MantisApiError("Unknown error occurred");
  }

  // -------------------------------------------------------------------------
  // Issues
  // -------------------------------------------------------------------------

  async getIssue(issueId: number): Promise<MantisIssue> {
    try {
      const response = await this.http.get<{ issues: MantisIssue[] }>(
        `/issues/${issueId}`
      );
      // MantisBT wraps a single issue in an "issues" array
      const issues = response.data.issues;
      if (!issues || issues.length === 0) {
        throw new MantisApiError(`Resource not found: issue #${issueId}`, 404);
      }
      return issues[0];
    } catch (error) {
      if (error instanceof MantisApiError) throw error;
      throw this.mapError(error, `issue #${issueId}`);
    }
  }

  async listIssues(params: ListIssuesParams): Promise<MantisIssueListResponse> {
    try {
      const response = await this.http.get<MantisIssueListResponse>("/issues", {
        params: {
          project_id: params.project_id,
          status: params.status,
          handler_name: params.handler_name,
          page_size: params.page_size,
          page: params.page,
          select: "id,summary,status,priority,handler,created_at,updated_at,project",
        },
      });
      return response.data;
    } catch (error) {
      throw this.mapError(error, "issues list");
    }
  }

  async searchIssues(params: SearchIssuesParams): Promise<MantisIssueListResponse> {
    try {
      const response = await this.http.get<MantisIssueListResponse>("/issues", {
        params: {
          search: params.search,
          project_id: params.project_id,
          page_size: params.page_size,
          page: params.page,
        },
      });
      return response.data;
    } catch (error) {
      throw this.mapError(error, "issues search");
    }
  }

  // -------------------------------------------------------------------------
  // Comments
  // -------------------------------------------------------------------------

  async getIssueComments(issueId: number): Promise<MantisComment[]> {
    try {
      // Comments are embedded in the issue detail response under "notes"
      const response = await this.http.get<{ issues: MantisIssue[] }>(
        `/issues/${issueId}`
      );
      const issues = response.data.issues;
      if (!issues || issues.length === 0) {
        throw new MantisApiError(`Resource not found: issue #${issueId}`, 404);
      }
      return issues[0].notes ?? [];
    } catch (error) {
      if (error instanceof MantisApiError) throw error;
      throw this.mapError(error, `issue #${issueId} comments`);
    }
  }

  async addComment(issueId: number, text: string): Promise<MantisAddCommentResponse> {
    try {
      const response = await this.http.post<MantisAddCommentResponse>(
        `/issues/${issueId}/notes`,
        { text }
      );
      return response.data;
    } catch (error) {
      throw this.mapError(error, `issue #${issueId}`);
    }
  }

  // -------------------------------------------------------------------------
  // History
  // -------------------------------------------------------------------------

  async getIssueHistory(issueId: number): Promise<MantisHistoryResponse> {
    try {
      const response = await this.http.get<MantisHistoryResponse>(
        `/issues/${issueId}/history`
      );
      return response.data;
    } catch (error) {
      throw this.mapError(error, `issue #${issueId} history`);
    }
  }

  // -------------------------------------------------------------------------
  // Attachments
  // -------------------------------------------------------------------------

  async getIssueAttachments(issueId: number): Promise<MantisAttachment[]> {
    try {
      const response = await this.http.get<{ issues: MantisIssue[] }>(
        `/issues/${issueId}`
      );
      const issues = response.data.issues;
      if (!issues || issues.length === 0) {
        throw new MantisApiError(`Resource not found: issue #${issueId}`, 404);
      }
      return issues[0].attachments ?? [];
    } catch (error) {
      if (error instanceof MantisApiError) throw error;
      throw this.mapError(error, `issue #${issueId} attachments`);
    }
  }

  async downloadAttachment(
    issueId: number,
    attachmentId: number
  ): Promise<{ content: Buffer; filename: string; content_type: string }> {
    try {
      const response = await this.http.get<ArrayBuffer>(
        `/issues/${issueId}/files/${attachmentId}`,
        { responseType: "arraybuffer" }
      );

      const contentDisposition =
        (response.headers["content-disposition"] as string | undefined) ?? "";
      const filenameMatch = /filename="?([^";]+)"?/.exec(contentDisposition);
      const filename = filenameMatch?.[1] ?? `attachment_${attachmentId}`;
      const content_type =
        (response.headers["content-type"] as string | undefined) ??
        "application/octet-stream";

      return {
        content: Buffer.from(response.data),
        filename,
        content_type,
      };
    } catch (error) {
      throw this.mapError(
        error,
        `attachment #${attachmentId} on issue #${issueId}`
      );
    }
  }

  // -------------------------------------------------------------------------
  // Projects
  // -------------------------------------------------------------------------

  async listProjects(): Promise<MantisProject[]> {
    try {
      const response =
        await this.http.get<MantisProjectsResponse>("/projects");
      return response.data.projects ?? [];
    } catch (error) {
      throw this.mapError(error, "projects");
    }
  }

  async getProjectVersions(projectId: number): Promise<MantisVersion[]> {
    try {
      const response = await this.http.get<MantisVersionsResponse>(
        `/projects/${projectId}/versions`
      );
      return response.data.versions ?? [];
    } catch (error) {
      throw this.mapError(error, `project #${projectId} versions`);
    }
  }

  // -------------------------------------------------------------------------
  // Filters
  // -------------------------------------------------------------------------

  async listFilters(): Promise<MantisFilter[]> {
    try {
      const response =
        await this.http.get<MantisFiltersResponse>("/filters");
      return response.data.filters ?? [];
    } catch (error) {
      throw this.mapError(error, "filters");
    }
  }

  async getFilterIssues(params: FilterIssuesParams): Promise<MantisIssueListResponse> {
    try {
      const response = await this.http.get<MantisIssueListResponse>("/issues", {
        params: {
          filter_id: params.filter_id,
          page_size: params.page_size,
          page: params.page,
        },
      });
      return response.data;
    } catch (error) {
      throw this.mapError(error, `filter #${params.filter_id} issues`);
    }
  }

  // -------------------------------------------------------------------------
  // Relationships
  // -------------------------------------------------------------------------

  async getIssueRelationships(issueId: number): Promise<MantisRelationship[]> {
    try {
      const response = await this.http.get<{ issues: MantisIssue[] }>(
        `/issues/${issueId}`
      );
      const issues = response.data.issues;
      if (!issues || issues.length === 0) {
        throw new MantisApiError(`Resource not found: issue #${issueId}`, 404);
      }
      return issues[0].relationships ?? [];
    } catch (error) {
      if (error instanceof MantisApiError) throw error;
      throw this.mapError(error, `issue #${issueId} relationships`);
    }
  }

  // -------------------------------------------------------------------------
  // Current user
  // -------------------------------------------------------------------------

  async getCurrentUser(): Promise<MantisCurrentUser> {
    try {
      const response = await this.http.get<MantisCurrentUser>("/users/me");
      return response.data;
    } catch (error) {
      throw this.mapError(error, "current user");
    }
  }
}
