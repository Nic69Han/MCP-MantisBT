/**
 * TypeScript interfaces representing MantisBT REST API v2 response shapes.
 * All fields are typed explicitly — no use of 'any'.
 */

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

export interface MantisReference {
  id: number;
  name: string;
}

export interface MantisVersionedReference extends MantisReference {
  label?: string;
}

export interface MantisUserSummary {
  id: number;
  name: string;
  real_name?: string;
  email?: string;
}

export interface MantisEnumItem {
  id: number;
  name: string;
  label?: string;
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export interface MantisProject {
  id: number;
  name: string;
  status: MantisEnumItem;
  description?: string;
  enabled?: boolean;
  view_state?: MantisEnumItem;
  access_level?: MantisEnumItem;
  versions?: MantisVersion[];
  subprojects?: MantisProject[];
}

export interface MantisProjectsResponse {
  projects: MantisProject[];
}

// ---------------------------------------------------------------------------
// Versions
// ---------------------------------------------------------------------------

export interface MantisVersion {
  id: number;
  name: string;
  description?: string;
  released: boolean;
  obsolete: boolean;
  timestamp?: string;
  project?: MantisReference;
}

export interface MantisVersionsResponse {
  versions: MantisVersion[];
}

// ---------------------------------------------------------------------------
// Issues
// ---------------------------------------------------------------------------

export interface MantisIssue {
  id: number;
  summary: string;
  description?: string;
  status: MantisEnumItem;
  priority: MantisEnumItem;
  severity: MantisEnumItem;
  resolution?: MantisEnumItem;
  reproducibility?: MantisEnumItem;
  project: MantisReference;
  category?: MantisReference;
  reporter?: MantisUserSummary;
  handler?: MantisUserSummary;
  version?: string;
  fixed_in_version?: string;
  target_version?: string;
  created_at: string;
  updated_at: string;
  notes?: MantisComment[];
  history?: MantisHistoryEntry[];
  attachments?: MantisAttachment[];
  relationships?: MantisRelationship[];
  tags?: MantisReference[];
  custom_fields?: MantisCustomField[];
  due_date?: string;
  view_state?: MantisEnumItem;
}

export interface MantisIssueListResponse {
  issues: MantisIssue[];
}

// ---------------------------------------------------------------------------
// Comments (Notes)
// ---------------------------------------------------------------------------

export interface MantisComment {
  id: number;
  reporter?: MantisUserSummary;
  text: string;
  view_state?: MantisEnumItem;
  created_at: string;
  updated_at?: string;
  time_tracking?: number;
}

export interface MantisCommentsResponse {
  notes: MantisComment[];
}

export interface MantisAddCommentResponse {
  note: MantisComment;
}

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

export interface MantisHistoryEntry {
  created_at: string;
  user?: MantisUserSummary;
  type?: MantisEnumItem;
  field?: string;
  old_value?: string;
  new_value?: string;
}

export interface MantisHistoryResponse {
  history: MantisHistoryEntry[];
}

// ---------------------------------------------------------------------------
// Attachments
// ---------------------------------------------------------------------------

export interface MantisAttachment {
  id: number;
  filename: string;
  size: number;
  content_type: string;
  created_at?: string;
  download_url: string;
  reporter?: MantisUserSummary;
  description?: string;
}

export interface MantisAttachmentsResponse {
  attachments: MantisAttachment[];
}

// ---------------------------------------------------------------------------
// Relationships
// ---------------------------------------------------------------------------

export interface MantisRelationship {
  id: number;
  type: MantisEnumItem;
  issue: MantisIssue;
}

export interface MantisRelationshipsResponse {
  relationships: MantisRelationship[];
}

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

export interface MantisFilter {
  id: number;
  owner?: MantisUserSummary;
  project?: MantisReference;
  is_public?: boolean;
  name: string;
  url?: string;
}

export interface MantisFiltersResponse {
  filters: MantisFilter[];
}

// ---------------------------------------------------------------------------
// Custom fields
// ---------------------------------------------------------------------------

export interface MantisCustomField {
  field: MantisReference;
  value: string;
}

// ---------------------------------------------------------------------------
// Current user
// ---------------------------------------------------------------------------

export interface MantisCurrentUser {
  id: number;
  name: string;
  real_name?: string;
  email?: string;
  language?: string;
  timezone?: string;
  access_level: MantisEnumItem;
}

// ---------------------------------------------------------------------------
// Paged results helper (used internally)
// ---------------------------------------------------------------------------

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}
