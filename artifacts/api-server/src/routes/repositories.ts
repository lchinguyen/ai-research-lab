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
import {
  buildHealthScore,
  buildDependencyRisk,
  buildTimeline,
  buildArchViz,
  buildOnboarding,
} from "./enhancements";

const router = Router();

interface StoreEntry {
  repo: Repository;
  architecture: ArchitectureMap;
  agents: AgentOutput[];
  issues: Issue[];
  prSummary: PrSummary;
  treePaths: string[];
}

const store = new Map<string, StoreEntry>();

function getStored(id: string): StoreEntry | null {
  return store.get(id) ?? null;
}

function makeCtx(entry: StoreEntry) {
  return { repo: entry.repo, architecture: entry.architecture, treePaths: entry.treePaths };
}

// POST /api/repositories/analyze
router.post("/repositories/analyze", async (req, res) => {
  const { url } = req.body as { url?: string };
  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "url is required" });
    return;
  }

  const id = makeRepoId(url);
  const cached = getStored(id);
  if (cached) { res.json(cached.repo); return; }

  const mockRepo = buildMockRepository(url);
  const mockArch = buildMockArchitecture(mockRepo.name);
  const mockAgents = buildMockAgents(mockRepo.name);
  const mockIssues = buildMockIssues(mockRepo.name);
  const mockPrSummary = buildMockPrSummary(mockRepo.name);

  const ghResult = await fetchFromGitHub(url, mockRepo, mockArch);

  const topLevelPaths = ghResult.treeItems
    .filter((i) => !i.path.includes("/"))
    .map((i) => i.path);

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
      topLevelPaths,
    },
    {
      agents: mockAgents,
      issues: mockIssues,
      prSummary: mockPrSummary,
      maintainabilityScore: mockRepo.maintainabilityScore,
      complexityScore: mockRepo.complexityScore,
    }
  );

  const finalRepo: Repository = {
    ...ghResult.repo,
    purpose: aiAnalysis.purpose,
    architectureSummary: aiAnalysis.architectureSummary,
    maintainabilityScore: aiAnalysis.maintainabilityScore,
    complexityScore: aiAnalysis.complexityScore,
  };

  const finalArch: ArchitectureMap = {
    ...ghResult.architecture,
    componentRelationships: ghResult.architecture.componentRelationships.length > 0
      ? ghResult.architecture.componentRelationships
      : mockArch.componentRelationships,
    dataFlow: ghResult.architecture.dataFlow.length > 0
      ? ghResult.architecture.dataFlow
      : mockArch.dataFlow,
    dependencies: ghResult.architecture.dependencies.length > 0
      ? ghResult.architecture.dependencies
      : mockArch.dependencies,
  };

  const treePaths = ghResult.treeItems.map((i) => i.path);

  store.set(id, {
    repo: finalRepo,
    architecture: finalArch,
    agents: aiAnalysis.agents,
    issues: aiAnalysis.issues,
    prSummary: aiAnalysis.prSummary,
    treePaths,
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

// GET /api/repositories/:repoId/health-score
router.get("/repositories/:repoId/health-score", (req, res) => {
  const entry = getStored(req.params.repoId);
  if (!entry) { res.status(404).json({ error: "Repository not found" }); return; }
  res.json(buildHealthScore(makeCtx(entry)));
});

// GET /api/repositories/:repoId/dependency-risk
router.get("/repositories/:repoId/dependency-risk", (req, res) => {
  const entry = getStored(req.params.repoId);
  if (!entry) { res.status(404).json({ error: "Repository not found" }); return; }
  res.json(buildDependencyRisk(makeCtx(entry)));
});

// GET /api/repositories/:repoId/timeline
router.get("/repositories/:repoId/timeline", (req, res) => {
  const entry = getStored(req.params.repoId);
  if (!entry) { res.status(404).json({ error: "Repository not found" }); return; }
  res.json(buildTimeline(makeCtx(entry)));
});

// GET /api/repositories/:repoId/arch-viz
router.get("/repositories/:repoId/arch-viz", (req, res) => {
  const entry = getStored(req.params.repoId);
  if (!entry) { res.status(404).json({ error: "Repository not found" }); return; }
  res.json(buildArchViz(makeCtx(entry)));
});

// GET /api/repositories/:repoId/onboarding
router.get("/repositories/:repoId/onboarding", (req, res) => {
  const entry = getStored(req.params.repoId);
  if (!entry) { res.status(404).json({ error: "Repository not found" }); return; }
  res.json(buildOnboarding(makeCtx(entry)));
});

export default router;
