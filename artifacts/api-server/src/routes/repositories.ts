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
import { fetchFromGitHub, type LanguageStat, type ContributorInfo, type ReleaseInfo, type CommitInfo } from "./github";
import { runHeuristicAnalysis } from "./heuristic-analysis";
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
  languages: LanguageStat[];
  contributors: ContributorInfo[];
  releases: ReleaseInfo[];
  recentCommits: CommitInfo[];
  topics: string[];
  openIssuesCount: number;
  watchersCount: number;
  size: number;
  license: string;
  createdAt: string;
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

  const gh = await fetchFromGitHub(url, mockRepo, mockArch);

  const treePaths = gh.treeItems.map((i) => i.path);

  // Build heuristic analysis from real GitHub data
  const analysis = runHeuristicAnalysis({
    name: gh.repo.name,
    owner: gh.repo.owner,
    language: gh.repo.language,
    framework: gh.repo.framework,
    stars: gh.repo.stars,
    forks: gh.repo.forks,
    treePaths,
    keyFiles: gh.keyFiles,
    languages: gh.languages,
    contributors: gh.contributors,
    releases: gh.releases,
    recentCommits: gh.recentCommits,
    topics: gh.topics,
    openIssuesCount: gh.openIssuesCount,
    watchersCount: gh.watchersCount,
    size: gh.size,
    license: gh.license,
    maintainabilityScore: gh.repo.maintainabilityScore,
    complexityScore: gh.repo.complexityScore,
    purpose: gh.repo.purpose,
    architectureSummary: gh.repo.architectureSummary,
  });

  const finalArch: ArchitectureMap = {
    ...gh.architecture,
    componentRelationships: gh.architecture.componentRelationships.length > 0
      ? gh.architecture.componentRelationships
      : mockArch.componentRelationships,
    dataFlow: gh.architecture.dataFlow.length > 0
      ? gh.architecture.dataFlow
      : mockArch.dataFlow,
    dependencies: gh.architecture.dependencies.length > 0
      ? gh.architecture.dependencies
      : mockArch.dependencies,
  };

  store.set(id, {
    repo: gh.repo,
    architecture: finalArch,
    agents: analysis.agents,
    issues: analysis.issues,
    prSummary: analysis.prSummary,
    treePaths,
    languages: gh.languages,
    contributors: gh.contributors,
    releases: gh.releases,
    recentCommits: gh.recentCommits,
    topics: gh.topics,
    openIssuesCount: gh.openIssuesCount,
    watchersCount: gh.watchersCount,
    size: gh.size,
    license: gh.license,
    createdAt: gh.createdAt,
  });

  res.json(gh.repo);
});

// GET /api/repositories/:repoId
router.get("/repositories/:repoId", (req, res) => {
  const entry = getStored(req.params.repoId);
  if (entry) { res.json(entry.repo); return; }
  const mockRepo = getRepoById(req.params.repoId);
  if (mockRepo) { res.json(mockRepo); return; }
  res.status(404).json({ error: "Repository not found" });
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

// GET /api/repositories/:repoId/stats
router.get("/repositories/:repoId/stats", (req, res) => {
  const entry = getStored(req.params.repoId);
  if (!entry) { res.status(404).json({ error: "Repository not found" }); return; }
  res.json({
    languages: entry.languages,
    contributors: entry.contributors,
    releases: entry.releases,
    recentCommits: entry.recentCommits,
    topics: entry.topics,
    openIssuesCount: entry.openIssuesCount,
    watchersCount: entry.watchersCount,
    size: entry.size,
    defaultBranch: "main",
    license: entry.license,
    createdAt: entry.createdAt,
  });
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
