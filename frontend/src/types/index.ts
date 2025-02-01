export interface User {
  id: number;
  username: string;
  email: string;
  avatar_url: string;
  bio: string;
  github_username: string;
  preferred_languages: string[];
  date_joined: string;
}

export interface Repository {
  id: string;
  name: string;
  description: string;
  owner: User;
  language: string;
  default_branch: string;
  file_count: number;
  created_at: string;
  updated_at: string;
}

export interface CodeFile {
  id: string;
  repository: string;
  path: string;
  content: string;
  language: string;
  sha: string;
  line_count: number;
  created_at: string;
}

export interface CodeFileListItem {
  id: string;
  path: string;
  language: string;
  sha: string;
  line_count: number;
  created_at: string;
}

export type SessionStatus = "open" | "in_progress" | "completed" | "archived";

export interface ReviewSession {
  id: string;
  title: string;
  description: string;
  repository: string;
  author: User;
  reviewers: User[];
  files: string[];
  status: SessionStatus;
  branch: string;
  annotation_count: number;
  created_at: string;
  updated_at: string;
}

export interface Annotation {
  id: string;
  session: string;
  file: string;
  author: User;
  start_line: number;
  end_line: number;
  resolved: boolean;
  comments: Comment[];
  comment_count: number;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  annotation: string;
  author: User;
  body: string;
  is_ai_generated: boolean;
  created_at: string;
}

export interface AISuggestion {
  id: string;
  session: string;
  file: string;
  start_line: number;
  end_line: number;
  suggestion_text: string;
  confidence: number;
  accepted: boolean;
  created_at: string;
}

/** Paginated response from DRF */
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/** WebSocket message types */
export type WSMessageType =
  | "annotation.created"
  | "comment.created"
  | "annotation.resolved"
  | "cursor.updated"
  | "user.joined"
  | "user.left"
  | "suggestion.ready"
  | "suggestion.queued"
  | "error";

export interface WSMessage {
  type: WSMessageType;
  [key: string]: unknown;
}

export interface CursorPosition {
  user: Pick<User, "id" | "username">;
  file_id: string;
  line: number;
  column: number;
}
