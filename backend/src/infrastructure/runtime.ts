import type { AppConfig } from "../config/env";
import { InMemoryAnalysisMetrics } from "../modules/analysis/observability";
import { AnalysisOrchestrator } from "../modules/analysis/orchestrator";
import type { StageHandler } from "../modules/analysis/orchestrator";
import { InMemoryAnalysisRepository } from "../modules/analysis/repository";
import { SearchService } from "../modules/search/service";
import { InMemorySearchIndex } from "../modules/search/in-memory-index";

const stageHandler: StageHandler = {
  async run() {
    // The production worker supplies the real analysis handler.
  },
};

export const createInfrastructure = (_config: AppConfig) => {
  const analysisRepository = new InMemoryAnalysisRepository();
  const analysis = new AnalysisOrchestrator(analysisRepository, stageHandler);
  const metrics = new InMemoryAnalysisMetrics();
  const searchIndex = new InMemorySearchIndex();
  const search = new SearchService(searchIndex);
  return { analysis, analysisRepository, metrics, search };
};
