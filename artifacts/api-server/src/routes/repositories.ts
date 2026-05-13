import { Router } from "express";
import type { Repository, ArchitectureMap } from "@workspace/api-zod";
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

const router = Router();

// In-memory store: repoId → { repo, architecture }
const store = new Map<string, { repo: Repository; architecture: ArchitectureMap }>();

function storeRepo(repo: Repository, architecture: ArchitectureMap) {
  store.set(repo.id, { repo, architecture });
}

function getStored(id: string): { repo: Repository; architecture: ArchitectureMap } | null {
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

  // Build mock fallbacks first (synchronous, always safe)
  const mockRepo = buildMockRepository(url);
  const mockArch = buildMockArchitecture(mockRepo.name);

  // Try to enrich with real GitHub data
  const { repo, architecture } = await fetchFromGitHub(url, mockRepo, mockArch);

  storeRepo(repo, architecture);
  res.json(repo);
});

// GET /api/repositories/:repoId
router.get("/repositories/:repoId", (req, res) => {
  const entry = getStored(req.params.repoId);
  if (!entry) {
    // Also check the old mock store as a fallback
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
  const name = entry?.repo.name ?? getRepoById(req.params.repoId)?.name;
  if (!name) { res.status(404).json({ error: "Repository not found" }); return; }
  res.json(buildMockAgents(name));
});

// GET /api/repositories/:repoId/agents/:agentType
router.get("/repositories/:repoId/agents/:agentType", (req, res) => {
  const entry = getStored(req.params.repoId);
  const name = entry?.repo.name ?? getRepoById(req.params.repoId)?.name;
  if (!name) { res.status(404).json({ error: "Repository not found" }); return; }
  const agents = buildMockAgents(name);
  const agent = agents.find((a) => a.agentType === req.params.agentType);
  if (!agent) { res.status(404).json({ error: "Agent not found" }); return; }
  res.json(agent);
});

// GET /api/repositories/:repoId/architecture
router.get("/repositories/:repoId/architecture", (req, res) => {
  const entry = getStored(req.params.repoId);
  if (entry) {
    res.json(entry.architecture);
    return;
  }
  const mockRepo = getRepoById(req.params.repoId);
  if (!mockRepo) { res.status(404).json({ error: "Repository not found" }); return; }
  res.json(buildMockArchitecture(mockRepo.name));
});

// GET /api/repositories/:repoId/issues
router.get("/repositories/:repoId/issues", (req, res) => {
  const entry = getStored(req.params.repoId);
  const name = entry?.repo.name ?? getRepoById(req.params.repoId)?.name;
  if (!name) { res.status(404).json({ error: "Repository not found" }); return; }
  res.json(buildMockIssues(name));
});

// GET /api/repositories/:repoId/pr-summary
router.get("/repositories/:repoId/pr-summary", (req, res) => {
  const entry = getStored(req.params.repoId);
  const name = entry?.repo.name ?? getRepoById(req.params.repoId)?.name;
  if (!name) { res.status(404).json({ error: "Repository not found" }); return; }
  res.json(buildMockPrSummary(name));
});

export default router;
