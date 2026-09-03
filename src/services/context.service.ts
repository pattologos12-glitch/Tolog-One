import { ContextRequest, ContextResponse } from "../interfaces/context";
import { validateContextRequest } from "../validators/context.validator";
import { hashSensitiveFields } from "../utils/hash";
import { OrchestratorClient } from "./orchestrator.client";

export class ContextService {
  private orchestrator: OrchestratorClient;

  constructor(orchestrator: OrchestratorClient) {
    this.orchestrator = orchestrator;
  }

  /**
   * Receives raw input, validates it, applies required hashing/sanitization,
   * stores or forwards to orchestrator and returns structured result.
   */
  async processRequest(raw: any): Promise<ContextResponse> {
    // Basic validation
    const { valid, errors, normalized } = validateContextRequest(raw);
    if (!valid) {
      return { status: 'rejected', reason: 'validation_failed', result: errors };
    }

    // Hash sensitive fields according to project standards
    const hashed = await hashSensitiveFields(normalized);

    // Prepare payload for orchestrator
    try {
      const orchestrationResult = await this.orchestrator.send(hashed);
      return { status: 'processed', result: orchestrationResult };
    } catch (err: any) {
      // If orchestrator unavailable, accept and enqueue or return rejection depending on policy
      return { status: 'accepted', reason: 'orchestrator_unavailable' };
    }
  }
}
