import type { RagCoverage } from "./store";

/** Shapes shared by the knowledge-index API and its UI. */

export type RagBuildInfo = {
  id: string;
  scopeId: string | null;
  scopeTitle: string;
  status: "queued" | "running" | "done" | "failed" | "cancelled";
  stage: string;
  embeddings: boolean;
  graph: boolean;
  total: number;
  done: number;
  embedded: number;
  extracted: number;
  failed: number;
  message: string;
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
};

export type RagStatus = {
  coverage: RagCoverage;
  /** the build in progress, whatever its scope */
  running: RagBuildInfo | null;
  /** the most recent build of this scope */
  last: RagBuildInfo | null;
  /** which stages the server is configured for */
  can: { embeddings: boolean; graph: boolean };
};
