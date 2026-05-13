import { Router } from "express";
import {
  getOrCreateRepo,
  getRepoById,
  buildMockAgents,
  buildMockArchitecture,
  buildMockIssues,
  buildMockPrSummary,
} from "./mock-data";

const router = Router();

router.post("/repositories/analyze", (req, res) => {
  const { url } = req.body as { url?: string };
  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "url is required" });
    return;
  }
  const repo = getOrCreateRepo(url);
  res.json(repo);
});

router.get("/repositories/:repoId", (req, res) => {
  const repo = getRepoById(req.params.repoId);
  if (!repo) {
    res.status(404).json({ error: "Repository not found" });
    return;
  }
  res.json(repo);
});

router.get("/repositories/:repoId/agents", (req, res) => {
  const repo = getRepoById(req.params.repoId);
  if (!repo) {
    res.status(404).json({ error: "Repository not found" });
    return;
  }
  res.json(buildMockAgents(repo.name));
});

router.get("/repositories/:repoId/agents/:agentType", (req, res) => {
  const repo = getRepoById(req.params.repoId);
  if (!repo) {
    res.status(404).json({ error: "Repository not found" });
    return;
  }
  const agents = buildMockAgents(repo.name);
  const agent = agents.find((a) => a.agentType === req.params.agentType);
  if (!agent) {
    res.status(404).json({ error: "Agent not found" });
    return;
  }
  res.json(agent);
});

router.get("/repositories/:repoId/architecture", (req, res) => {
  const repo = getRepoById(req.params.repoId);
  if (!repo) {
    res.status(404).json({ error: "Repository not found" });
    return;
  }
  res.json(buildMockArchitecture(repo.name));
});

router.get("/repositories/:repoId/issues", (req, res) => {
  const repo = getRepoById(req.params.repoId);
  if (!repo) {
    res.status(404).json({ error: "Repository not found" });
    return;
  }
  res.json(buildMockIssues(repo.name));
});

router.get("/repositories/:repoId/pr-summary", (req, res) => {
  const repo = getRepoById(req.params.repoId);
  if (!repo) {
    res.status(404).json({ error: "Repository not found" });
    return;
  }
  res.json(buildMockPrSummary(repo.name));
});

export default router;
