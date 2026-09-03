import { Request, Response } from "express";
import { ContextService } from "../services/context.service";
import { SimpleOrchestratorClient } from "../services/orchestrator.client";

const orchestrator = new SimpleOrchestratorClient(process.env.ORCHESTRATOR_ENDPOINT || 'http://orchestrator.local');
const svc = new ContextService(orchestrator);

export async function processContext(req: Request, res: Response) {
  const raw = req.body;
  const result = await svc.processRequest(raw);
  if (result.status === 'rejected') return res.status(400).json(result);
  if (result.status === 'accepted') return res.status(202).json(result);
  return res.status(200).json(result);
}
