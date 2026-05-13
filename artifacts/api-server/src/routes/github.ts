import type { Repository, ArchitectureMap, FolderNode } from "@workspace/api-zod";
import { buildMockRepository, buildMockArchitecture } from "./mock-data";

const GITHUB_API = "https://api.github.com";
const TOKEN = process.env.GITHUB_TOKEN;

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "ai-research-lab/1.0",
  };
  if (TOKEN) headers["Authorization"] = `Bearer ${TOKEN}`;
  return headers;
}

async function ghFetch(path: string): Promise<unknown> {
  const res = await fetch(`${GITHUB_API}${path}`, { headers: authHeaders() });
  if (!res.ok) {
    throw new Error(`GitHub API ${path} returned ${res.status} ${res.statusText}`);
  }
  return res.json();
}

function detectFramework(language: string | null, repoName: string, topics: string[]): string {
  const n = repoName.toLowerCase();
  const t = topics.map((x) => x.toLowerCase()).join(" ");
  const combined = `${n} ${t}`;
  if (combined.includes("nextjs") || combined.includes("next.js") || combined.includes("next-js")) return "Next.js";
  if (combined.includes("nuxt")) return "Nuxt.js";
  if (combined.includes("angular")) return "Angular";
  if (combined.includes("vue")) return "Vue.js";
  if (combined.includes("svelte")) return "SvelteKit";
  if (combined.includes("remix")) return "Remix";
  if (combined.includes("astro")) return "Astro";
  if (combined.includes("django")) return "Django";
  if (combined.includes("fastapi") || combined.includes("fast-api")) return "FastAPI";
  if (combined.includes("flask")) return "Flask";
  if (combined.includes("rails")) return "Ruby on Rails";
  if (combined.includes("spring")) return "Spring Boot";
  if (combined.includes("express")) return "Express.js";
  if (combined.includes("nest") || combined.includes("nestjs")) return "NestJS";
  if (combined.includes("gin")) return "Gin";
  if (combined.includes("axum") || combined.includes("actix")) return "Rust Web";
  if (combined.includes("react")) return "React";
  if (language === "TypeScript" || language === "JavaScript") return "Node.js";
  if (language === "Python") return "Python";
  if (language === "Ruby") return "Ruby";
  if (language === "Go") return "Go";
  if (language === "Rust") return "Rust";
  if (language === "Java") return "Java";
  return language ?? "Unknown";
}

function buildPurpose(ghRepo: GHRepo): string {
  if (ghRepo.description && ghRepo.description.length > 20) {
    return ghRepo.description;
  }
  const lang = ghRepo.language ?? "software";
  return `${ghRepo.name} is an open-source ${lang} project by ${ghRepo.owner.login} with ${ghRepo.stargazers_count.toLocaleString()} stars and ${ghRepo.forks_count.toLocaleString()} forks on GitHub.`;
}

function buildArchSummary(ghRepo: GHRepo, readme: string): string {
  // Extract the first meaningful paragraph from the README
  const lines = readme.split("\n");
  const paragraphs: string[] = [];
  let buf: string[] = [];

  for (const line of lines) {
    if (line.startsWith("#")) {
      if (buf.length) { paragraphs.push(buf.join(" ").trim()); buf = []; }
      continue;
    }
    const stripped = line.trim();
    if (!stripped) {
      if (buf.length) { paragraphs.push(buf.join(" ").trim()); buf = []; }
    } else if (!stripped.startsWith("!") && !stripped.startsWith("[!") && !stripped.startsWith("<")) {
      buf.push(stripped);
    }
  }
  if (buf.length) paragraphs.push(buf.join(" ").trim());

  // Find a paragraph that looks like a description (>60 chars, not a badge line)
  const desc = paragraphs.find(
    (p) => p.length > 60 && !p.startsWith("[![") && !p.includes("badge") && !p.startsWith("|")
  );

  if (desc && desc.length > 80) return desc.slice(0, 600) + (desc.length > 600 ? "…" : "");

  return `${ghRepo.name} is a ${ghRepo.language ?? "software"} repository with ${ghRepo.stargazers_count.toLocaleString()} stars. The project is actively maintained under the ${ghRepo.license?.name ?? "open-source"} license.`;
}

interface GHRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  language: string | null;
  topics: string[];
  default_branch: string;
  license: { name: string } | null;
  owner: { login: string; avatar_url: string };
  created_at: string;
  updated_at: string;
  size: number;
}

interface GHTreeItem {
  path: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
}

interface GHTree {
  sha: string;
  tree: GHTreeItem[];
  truncated: boolean;
}

interface GHReadme {
  content: string;
  encoding: string;
}

interface GHBranch {
  commit: { sha: string };
}

function makeRepoId(owner: string, name: string): string {
  return `${owner}-${name}`.toLowerCase().replace(/[^a-z0-9-]/g, "-");
}

function buildFolderTree(items: GHTreeItem[], rootName: string): FolderNode[] {
  // Only include top 2 levels for clarity; skip deep noise
  const root: FolderNode = { name: rootName, type: "directory", children: [] };
  const nodeMap = new Map<string, FolderNode>();
  nodeMap.set("", root);

  // Sort so directories come first
  const sorted = [...items].sort((a, b) => {
    const aDepth = a.path.split("/").length;
    const bDepth = b.path.split("/").length;
    if (aDepth !== bDepth) return aDepth - bDepth;
    return a.path.localeCompare(b.path);
  });

  // Only keep paths up to depth 3 to avoid massive trees
  const filtered = sorted.filter((item) => item.path.split("/").length <= 3);

  for (const item of filtered) {
    const parts = item.path.split("/");
    const name = parts[parts.length - 1];
    const parentPath = parts.slice(0, -1).join("/");
    const parent = nodeMap.get(parentPath) ?? root;

    const node: FolderNode = {
      name,
      type: item.type === "tree" ? "directory" : "file",
      children: item.type === "tree" ? [] : undefined,
    };
    parent.children = parent.children ?? [];
    parent.children.push(node);
    if (item.type === "tree") nodeMap.set(item.path, node);
  }

  return [root];
}

function buildKeyFiles(items: GHTreeItem[]): string[] {
  const important = [
    "package.json",
    "pnpm-workspace.yaml",
    "turbo.json",
    "tsconfig.json",
    "vite.config.ts",
    "vite.config.js",
    "next.config.ts",
    "next.config.js",
    "nuxt.config.ts",
    "Cargo.toml",
    "go.mod",
    "pyproject.toml",
    "setup.py",
    "Gemfile",
    "build.gradle",
    "pom.xml",
    "Makefile",
    "Dockerfile",
    "docker-compose.yml",
    ".github/workflows",
    "README.md",
    "LICENSE",
  ];

  const found: string[] = [];
  for (const key of important) {
    // Prefer exact root-level match first, then shallowest nested match
    const exact = items.find((i) => i.path === key);
    const nested = items
      .filter((i) => i.path !== key && (i.path.endsWith(`/${key}`) || i.path === key))
      .sort((a, b) => a.path.split("/").length - b.path.split("/").length)[0];
    const match = exact ?? nested;
    if (match) {
      const desc = fileDesc(match.path);
      found.push(desc ? `${match.path} — ${desc}` : match.path);
    }
  }

  // Add a few top-level source dirs
  const srcDirs = items.filter(
    (i) =>
      i.type === "tree" &&
      !i.path.includes("/") &&
      ["src", "lib", "packages", "apps", "internal", "cmd", "pkg"].includes(i.path)
  );
  for (const dir of srcDirs.slice(0, 3)) {
    if (!found.some((f) => f.startsWith(dir.path))) {
      found.push(`${dir.path}/ — Source directory`);
    }
  }

  return found.slice(0, 10);
}

function fileDesc(path: string): string {
  const name = path.split("/").pop() ?? path;
  const map: Record<string, string> = {
    "package.json": "NPM package manifest and scripts",
    "pnpm-workspace.yaml": "pnpm monorepo workspace configuration",
    "turbo.json": "Turborepo pipeline and caching config",
    "tsconfig.json": "TypeScript compiler configuration",
    "vite.config.ts": "Vite bundler and dev server configuration",
    "vite.config.js": "Vite bundler and dev server configuration",
    "next.config.ts": "Next.js framework configuration",
    "next.config.js": "Next.js framework configuration",
    "nuxt.config.ts": "Nuxt.js framework configuration",
    "Cargo.toml": "Rust package and dependency manifest",
    "go.mod": "Go module and dependency declaration",
    "pyproject.toml": "Python project metadata and dependencies",
    "setup.py": "Python package setup script",
    "Gemfile": "Ruby gem dependency specification",
    "pom.xml": "Maven project and dependency configuration",
    "Makefile": "Build automation and task targets",
    "Dockerfile": "Container image build instructions",
    "docker-compose.yml": "Multi-container Docker orchestration",
    "README.md": "Project documentation and getting started guide",
    "LICENSE": "Open-source license terms",
  };
  return map[name] ?? "";
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface GitHubFetchResult {
  repo: Repository;
  architecture: ArchitectureMap;
  fromGitHub: boolean;
}

export async function fetchFromGitHub(
  url: string,
  mockRepoFallback: Repository,
  mockArchFallback: ArchitectureMap
): Promise<GitHubFetchResult> {
  // Parse owner/repo from the url (already validated on frontend)
  const clean = url.trim().replace(/\.git$/, "").replace(/\/$/, "");
  const fullMatch = clean.match(/github\.com\/([^/\s]+)\/([^/\s]+)/);
  const shortMatch = clean.match(/^([^/\s]+)\/([^/\s]+)$/);
  const [owner, repoName] = fullMatch
    ? [fullMatch[1], fullMatch[2]]
    : shortMatch
    ? [shortMatch[1], shortMatch[2]]
    : [null, null];

  if (!owner || !repoName) {
    return { repo: mockRepoFallback, architecture: mockArchFallback, fromGitHub: false };
  }

  try {
    // Fetch repo metadata
    const ghRepo = (await ghFetch(`/repos/${owner}/${repoName}`)) as GHRepo;

    // Fetch file tree and README in parallel
    const [treeResult, readmeResult] = await Promise.allSettled([
      (async () => {
        const branch = (await ghFetch(
          `/repos/${owner}/${repoName}/branches/${ghRepo.default_branch}`
        )) as GHBranch;
        return ghFetch(
          `/repos/${owner}/${repoName}/git/trees/${branch.commit.sha}?recursive=1`
        ) as Promise<GHTree>;
      })(),
      ghFetch(`/repos/${owner}/${repoName}/readme`) as Promise<GHReadme>,
    ]);

    const tree: GHTree | null =
      treeResult.status === "fulfilled" ? treeResult.value : null;
    const readmeRaw: GHReadme | null =
      readmeResult.status === "fulfilled" ? readmeResult.value : null;

    const readme =
      readmeRaw && readmeRaw.encoding === "base64"
        ? Buffer.from(readmeRaw.content.replace(/\n/g, ""), "base64").toString("utf-8")
        : "";

    const language = ghRepo.language ?? "Unknown";
    const framework = detectFramework(ghRepo.language, ghRepo.name, ghRepo.topics ?? []);
    const id = makeRepoId(owner, repoName);

    const repo: Repository = {
      id,
      url: ghRepo.html_url,
      name: ghRepo.name,
      owner: ghRepo.owner.login,
      language,
      framework,
      stars: ghRepo.stargazers_count,
      forks: ghRepo.forks_count,
      purpose: buildPurpose(ghRepo),
      architectureSummary: buildArchSummary(ghRepo, readme),
      maintainabilityScore: mockRepoFallback.maintainabilityScore,
      complexityScore: mockRepoFallback.complexityScore,
      analyzedAt: new Date().toISOString(),
    };

    // Build architecture from real tree
    const treeItems = tree?.tree ?? [];
    const folderTree = buildFolderTree(treeItems, ghRepo.name);
    const keyFiles = buildKeyFiles(treeItems);

    // Dependencies: keep mock ones but note if we found a package.json
    const hasPkg = treeItems.some((i) => i.path === "package.json");
    const architecture: ArchitectureMap = {
      ...mockArchFallback,
      folderTree,
      keyFiles: keyFiles.length > 0 ? keyFiles : mockArchFallback.keyFiles,
    };

    return { repo, architecture, fromGitHub: true };
  } catch (err) {
    // Any GitHub API error → silent fallback to mock
    return { repo: mockRepoFallback, architecture: mockArchFallback, fromGitHub: false };
  }
}
