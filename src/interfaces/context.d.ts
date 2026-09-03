export interface ContextRequest {
  id?: string;
  type: string;
  payload: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface ContextResponse {
  id?: string;
  status: 'accepted' | 'rejected' | 'processed';
  reason?: string;
  result?: any;
}
