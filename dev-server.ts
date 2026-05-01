import { createServer } from "http";
import { readFileSync } from "fs";
import { resolve } from "path";
import { parseFCAFeedbackXML } from "./lib/parsers/fca-xml-parser.js";
import {
  loadFCARejections,
  parseFCARejectionsCSV,
  loadSubmittedReports,
  loadTradeRegistry,
  loadRelationshipManagers,
  loadLEIRecords,
} from "./lib/parsers/csv-loader.js";
import { enrichRejections } from "./lib/enrichment/join-engine.js";
import { runAnalysis } from "./lib/agent/orchestrator.js";
import type { AnalysisResult, RejectionResult } from "./lib/types.js";

const analysisCache = new Map<string, AnalysisResult>();

const corsHeaders: Record<string, string> = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function readBody(req: import("http").IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString()));
    req.on("error", reject);
  });
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:3001`);
  const send = (status: number, body: unknown) => {
    res.writeHead(status, corsHeaders);
    res.end(JSON.stringify(body));
  };

  if (req.method === "OPTIONS") { res.writeHead(204, corsHeaders); res.end(); return; }

  if (url.pathname === "/api/analyze" && req.method === "POST") {
    try {
      const raw = await readBody(req);
      const body = raw ? JSON.parse(raw) : {};
      const useAgent = body.useAgent === true;

      const rejections = body.csv
        ? parseFCARejectionsCSV(body.csv)
        : body.xml
          ? parseFCAFeedbackXML(body.xml)
          : loadFCARejections();

      if (rejections.length === 0) return send(400, { error: "No rejected transactions found" });

      const reports = loadSubmittedReports();
      const trades = loadTradeRegistry();
      const rms = loadRelationshipManagers();
      const leis = loadLEIRecords();
      const enriched = enrichRejections(rejections, reports, trades, rms, leis);
      const result = await runAnalysis(enriched, { forceAgent: useAgent });

      analysisCache.set(result.id, result);
      return send(200, result);
    } catch (err) {
      return send(500, { error: String(err) });
    }
  }

  if (url.pathname === "/api/approve" && req.method === "POST") {
    try {
      const raw = await readBody(req);
      const { analysisId, rejectionId, action } = JSON.parse(raw);
      const analysis = analysisCache.get(analysisId);
      if (!analysis) return send(404, { error: "Analysis not found" });

      const rejection = analysis.rejections.find((r: RejectionResult) => r.id === rejectionId);
      if (!rejection) return send(404, { error: "Rejection not found" });

      rejection.status = action as RejectionResult["status"];
      rejection.approvedAt = action === "approved" ? new Date().toISOString() : null;
      return send(200, { success: true, rejectionId, newStatus: rejection.status, approvedAt: rejection.approvedAt });
    } catch (err) {
      return send(500, { error: String(err) });
    }
  }

  if (url.pathname === "/api/preview-data" && req.method === "GET") {
    try {
      const dataDir = resolve(process.cwd(), "data");
      const files = [
        "reg_feedback_rejects.csv",
        "submitted_mifir_reports.csv",
        "fxall_trade_registry.csv",
        "gleif_lei_snapshot.csv",
        "relationship_management_database.csv",
      ];
      const result = files.map((name) => ({
        name,
        content: readFileSync(resolve(dataDir, name), "utf-8"),
      }));
      return send(200, result);
    } catch (err) {
      return send(500, { error: String(err) });
    }
  }

  send(404, { error: "Not found" });
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception (kept alive):", err.message);
});
process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection (kept alive):", err);
});

server.listen(3001, () => {
  console.log("API dev server running on http://localhost:3001");
});
