export type AssistantState =
  | 'idle'
  | 'listening'
  | 'transcribing'
  | 'thinking'
  | 'executing'
  | 'speaking'
  | 'clarification'
  | 'success'
  | 'error';

export interface CanonicalIntent {
  success: boolean;
  intent: string;
  action: string;
  parameters: Record<string, any>;
  entities: Record<string, any>;
  original_text: string;
  normalized_text: string;
  normalization: Record<string, any>;
  confidence: number;
  requires_confirmation: boolean;
  clarification_needed: boolean;
  clarification_question?: string | null;
  error_message?: string | null;
}

export interface ActionExecutionResponse {
  success: boolean;
  action: string;
  result?: any;
  message: string;
  clarification_needed: boolean;
  clarification_question?: string | null;
  requires_confirmation: boolean;
  original_text: string;
  normalized_text: string;
  normalization_notes: Record<string, any>;
}

export interface HistoryItem {
  id: string;
  timestamp: string;
  query: string;
  action: string;
  response: string;
  status: 'success' | 'clarification' | 'error';
}
