import { Router } from "express";
import type { Repository, ArchitectureMap, AgentOutput, Issue, PrSummary } from "@workspace/api-zod";
import {
  buildMockRepository,
  getRepoById,
  buildMockAgents,
  buildMockArchitecture,
  buildMockIssues,
  buildMockPrSummary,
  repoId as makeRepoId,
} from "./mock-data";
import { fetchFromGitHub } from "./github";
import { analyzeWithOpenAI } from "./openai-analysis";

const router = Router();

interface StoreEntry {
  repo: Repository;
  architecture: ArchitectureMap;
  agents: AgentOutput[];
  issues: Issue[];
  prSummary: PrSummary;
}

// In-memory store: repoId → full analysis result
const store = new Map<string, StoreEntry>();

function getStored(id: string): StoreEntry | null {
  return store.get(id) ?? null;
}

// POST /api/repositories/analyze
router.post("/repositories/analyze", async (req, res) => {
  const { url } = req.body as { url?: string };
  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "url is required" });
    return;
  }

  const id = makeRepoId(url);

  // Return cached result if already analyzed
  const cached = getStored(id);
  if (cached) {
    res.json(cached.repo);
    return;
  }

  // 1. Build mock fallbacks (always safe, synchronous)
  const mockRepo = buildMockRepository(url);
  const mockArch = buildMockArchitecture(mockRepo.name);
  const mockAgents = buildMockAgents(mockRepo.name);
  const mockIssues = buildMockIssues(mockRepo.name);
  const mockPrSummary = buildMockPrSummary(mockRepo.name);

  // 2. Fetch real GitHub data
  const ghResult = await fetchFromGitHub(url, mockRepo, mockArch);

  // 3. Run AI analysis using real GitHub context
  const aiAnalysis = await analyzeWithOpenAI(
    {
      name: ghResult.repo.name,
      owner: ghResult.repo.owner,
      description: ghResult.repo.purpose,
      language: ghResult.repo.language,
      framework: ghResult.repo.framework,
      stars: ghResult.repo.stars,
      forks: ghResult.repo.forks,
      readmeText: ghResult.readmeText,
      keyFiles: ghResult.keyFiles,
      topLevelPaths: ghResult.treeItems
        .filter((i) => !i.path.includes("/"))
        .map((i) => i.path),
    },
    {
      agents: mockAgents,
      issues: mockIssues,
      prSummary: mockPrSummary,
      maintainabilityScore: mockRepo.maintainabilityScore,
      complexityScore: mockRepo.complexityScore,
    }
  );

  // 4. Merge AI outputs into the final repo object
  const finalRepo: Repository = {
    ...ghResult.repo,
    purpose: aiAnalysis.purpose,
    architectureSummary: aiAnalysis.architectureSummary,
    maintainabilityScore: aiAnalysis.maintainabilityScore,
    complexityScore: aiAnalysis.complexityScore,
  };

  // 5. Merge AI architecture insights (keep real file tree + AI component data)
  const finalArch: ArchitectureMap = {
    ...ghResult.architecture,
    componentRelationships:
      ghResult.architecture.componentRelationships.length > 0
        ? ghResult.architecture.componentRelationships
        : mockArch.componentRelationships,
    dataFlow:
      ghResult.architecture.dataFlow.length > 0
        ? ghResult.architecture.dataFlow
        : mockArch.dataFlow,
    dependencies: ghResult.architecture.dependencies.length > 0
      ? ghResult.architecture.dependencies
      : mockArch.dependencies,
  };

  // 6. Store everything
  store.set(id, {
    repo: finalRepo,
    architecture: finalArch,
    agents: aiAnalysis.agents,
    issues: aiAnalysis.issues,
    prSummary: aiAnalysis.prSummary,
  });

  res.json(finalRepo);
});

// GET /api/repositories/:repoId
router.get("/repositories/:repoId", (req, res) => {
  const entry = getStored(req.params.repoId);
  if (!entry) {
    const mockRepo = getRepoById(req.params.repoId);
    if (mockRepo) { res.json(mockRepo); return; }
    res.status(404).json({ error: "Repository not found" });
    return;
  }
  res.json(entry.repo);
});

// GET /api/repositories/:repoId/agents
router.get("/repositories/:repoId/agents", (req, res) => {
  const entry = getStored(req.params.repoId);
  if (entry) { res.json(entry.agents); return; }
  const name = getRepoById(req.params.repoId)?.name;
  if (!name) { res.status(404).json({ error: "Repository not found" }); return; }
  res.json(buildMockAgents(name));
});

// GET /api/repositories/:repoId/agents/:agentType
router.get("/repositories/:repoId/agents/:agentType", (req, res) => {
  const entry = getStored(req.params.repoId);
  const agents = entry?.agents ?? (() => {
    const name = getRepoById(req.params.repoId)?.name;
    return name ? buildMockAgents(name) : null;
  })();
  if (!agents) { res.status(404).json({ error: "Repository not found" }); return; }
  const agent = agents.find((a) => a.agentType === req.params.agentType);
  if (!agent) { res.status(404).json({ error: "Agent not found" }); return; }
  res.json(agent);
});

// GET /api/repositories/:repoId/architecture
router.get("/repositories/:repoId/architecture", (req, res) => {
  const entry = getStored(req.params.repoId);
  if (entry) { res.json(entry.architecture); return; }
  const mockRepo = getRepoById(req.params.repoId);
  if (!mockRepo) { res.status(404).json({ error: "Repository not found" }); return; }
  res.json(buildMockArchitecture(mockRepo.name));
});

// GET /api/repositories/:repoId/issues
router.get("/repositories/:repoId/issues", (req, res) => {
  const entry = getStored(req.params.repoId);
  if (entry) { res.json(entry.issues); return; }
  const name = getRepoById(req.params.repoId)?.name;
  if (!name) { res.status(404).json({ error: "Repository not found" }); return; }
  res.json(buildMockIssues(name));
});

// GET /api/repositories/:repoId/pr-summary
router.get("/repositories/:repoId/pr-summary", (req, res) => {
  const entry = getStored(req.params.repoId);
  if (entry) { res.json(entry.prSummary); return; }
  const name = getRepoById(req.params.repoId)?.name;
  if (!name) { res.status(404).json({ error: "Repository not found" }); return; }
  res.json(buildMockPrSummary(name));
});

export default router;
