export interface OrchestratorClient {
  /**
   * Sends a normalized payload to the orchestrator and returns the orchestrator response.
   */
  send(payload: any): Promise<any>;
}

/**
 * A simple stub implementation that can be swapped with a real HTTP/gRPC client.
 */
export class SimpleOrchestratorClient implements OrchestratorClient {
  private endpoint: string;
  constructor(endpoint: string) {
    this.endpoint = endpoint;
  }

  async send(payload: any): Promise<any> {
    // TODO: implement HTTP/gRPC call to orchestrator; this is a stub returning a mock response
    return { ok: true, forwardedTo: this.endpoint, payloadSummary: { type: payload.type } };
  }
}
