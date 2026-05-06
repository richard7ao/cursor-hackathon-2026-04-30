import type { EnrichedRejection, AnalysisResult, RejectionResult } from "../types.js";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompts.js";
import { parseAgentResponse, buildRejectionResults, buildFallbackResults } from "./tools.js";

export async function runAnalysis(
  enrichedRejections: EnrichedRejection[],
  _options?: { forceAgent?: boolean }
): Promise<AnalysisResult> {
  const analysisId = `analysis-${Date.now()}`;
  const now = new Date().toISOString();

  let rejections: RejectionResult[];

  try {
    rejections = await runCursorAgent(enrichedRejections);
  } catch (err) {
    console.warn("Cursor SDK agent failed, using deterministic fallback:", err);
    rejections = buildFallbackResults(enrichedRejections);
  }

  const summary = {
    total: rejections.length,
    critical: rejections.filter((r) => r.diagnosis.severity === "critical").length,
    warning: rejections.filter((r) => r.diagnosis.severity === "warning").length,
    info: rejections.filter((r) => r.diagnosis.severity === "info").length,
  };

  return {
    id: analysisId,
    createdAt: now,
    status: "complete",
    summary,
    rejections,
  };
}

async function runCursorAgent(
  enrichedRejections: EnrichedRejection[]
): Promise<RejectionResult[]> {
  const { Agent } = await import("@cursor/sdk");
  const prompt = `${SYSTEM_PROMPT}\n\n${buildUserPrompt(enrichedRejections)}`;

  const result = await Agent.prompt(prompt, {
    apiKey: process.env.CURSOR_API_KEY,
    model: { id: "claude-sonnet-4-6" },
    name: "mifir-rejection-analyst",
  });

  if (result.status !== "finished") {
    throw new Error(`Agent run failed: status=${result.status}`);
  }

  const text = result.result ?? "";
  if (!text) throw new Error("Agent returned no text");

  const diagnoses = parseAgentResponse(text);
  return buildRejectionResults(enrichedRejections, diagnoses);
}
