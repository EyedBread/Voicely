import type { TranscriptEntry } from "../meeting/types.js";

export interface MeetingToolContext {
  meetingUrl?: string;
  summary?: string;
  transcript?: TranscriptEntry[];
}

export interface ToolExecutionContext {
  agent: "meeting" | "phone";
  workspaceAccountId?: string;
  meetingContext?: MeetingToolContext;
}
