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
  if (!res.ok) throw new Error(`GitHub API ${path} → ${res.status}`);
  return res.json();
}

// ── Type definitions ─────────────────────────────────────────────────────────

interface GHRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  watchers_count: number;
  language: string | null;
  topics: string[];
  default_branch: string;
  license: { name: string } | null;
  owner: { login: string; avatar_url: string };
  created_at: string;
  updated_at: string;
  size: number;
}

export interface GHTreeItem {
  path: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
}

interface GHTree { sha: string; tree: GHTreeItem[]; truncated: boolean; }
interface GHReadme { content: string; encoding: string; }
interface GHBranch { commit: { sha: string } }

interface GHContributor {
  login: string;
  avatar_url: string;
  contributions: number;
  html_url: string;
}

interface GHRelease {
  name: string | null;
  tag_name: string;
  published_at: string;
  body: string | null;
  prerelease: boolean;
}

interface GHCommit {
  sha: string;
  commit: {
    message: string;
    author: { name: string; date: string } | null;
  };
  html_url: string;
}

// ── Processed types exported for use in the rest of the server ───────────────

export interface LanguageStat {
  language: string;
  bytes: number;
  percentage: number;
}

export interface ContributorInfo {
  login: string;
  avatarUrl: string;
  contributions: number;
  profileUrl: string;
}

export interface ReleaseInfo {
  name: string;
  tagName: string;
  publishedAt: string;
  body: string;
  isPrerelease: boolean;
}

export interface CommitInfo {
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string;
}

// ── Helper functions ─────────────────────────────────────────────────────────

function detectFramework(language: string | null, repoName: string, topics: string[]): string {
  const n = repoName.toLowerCase();
  const t = topics.join(" ").toLowerCase();
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

function makeRepoId(owner: string, name: string): string {
  return `${owner}-${name}`.toLowerCase().replace(/[^a-z0-9-]/g, "-");
}

function buildPurpose(ghRepo: GHRepo): string {
  if (ghRepo.description && ghRepo.description.length > 20) return ghRepo.description;
  const lang = ghRepo.language ?? "software";
  return `${ghRepo.name} is an open-source ${lang} project by ${ghRepo.owner.login} with ${ghRepo.stargazers_count.toLocaleString()} stars and ${ghRepo.forks_count.toLocaleString()} forks.`;
}

function buildArchSummary(ghRepo: GHRepo, readme: string): string {
  const lines = readme.split("\n");
  const paragraphs: string[] = [];
  let buf: string[] = [];
  for (const line of lines) {
    if (line.startsWith("#")) { if (buf.length) { paragraphs.push(buf.join(" ").trim()); buf = []; } continue; }
    const stripped = line.trim();
    if (!stripped) { if (buf.length) { paragraphs.push(buf.join(" ").trim()); buf = []; } }
    else if (!stripped.startsWith("!") && !stripped.startsWith("[!") && !stripped.startsWith("<")) buf.push(stripped);
  }
  if (buf.length) paragraphs.push(buf.join(" ").trim());
  const desc = paragraphs.find((p) => p.length > 60 && !p.startsWith("[![") && !p.includes("badge") && !p.startsWith("|"));
  if (desc && desc.length > 80) return desc.slice(0, 600) + (desc.length > 600 ? "…" : "");
  return `${ghRepo.name} is a ${ghRepo.language ?? "software"} repository with ${ghRepo.stargazers_count.toLocaleString()} stars, maintained under the ${ghRepo.license?.name ?? "open-source"} license.`;
}

function buildFolderTree(items: GHTreeItem[], rootName: string): FolderNode[] {
  const root: FolderNode = { name: rootName, type: "directory", children: [] };
  const nodeMap = new Map<string, FolderNode>();
  nodeMap.set("", root);
  const sorted = [...items].sort((a, b) => a.path.split("/").length - b.path.split("/").length || a.path.localeCompare(b.path));
  const filtered = sorted.filter((item) => item.path.split("/").length <= 3);
  for (const item of filtered) {
    const parts = item.path.split("/");
    const name = parts[parts.length - 1];
    const parentPath = parts.slice(0, -1).join("/");
    const parent = nodeMap.get(parentPath) ?? root;
    const node: FolderNode = { name, type: item.type === "tree" ? "directory" : "file", children: item.type === "tree" ? [] : undefined };
    parent.children = parent.children ?? [];
    parent.children.push(node);
    if (item.type === "tree") nodeMap.set(item.path, node);
  }
  return [root];
}

function buildKeyFiles(items: GHTreeItem[]): string[] {
  const important = [
    "package.json","pnpm-workspace.yaml","turbo.json","tsconfig.json","vite.config.ts","vite.config.js",
    "next.config.ts","next.config.js","nuxt.config.ts","Cargo.toml","go.mod","pyproject.toml","setup.py",
    "Gemfile","build.gradle","pom.xml","Makefile","Dockerfile","docker-compose.yml",
    ".github/workflows","README.md","LICENSE","CONTRIBUTING.md",
  ];
  const DESC: Record<string, string> = {
    "package.json": "NPM package manifest and scripts",
    "pnpm-workspace.yaml": "pnpm monorepo workspace configuration",
    "turbo.json": "Turborepo pipeline and caching config",
    "tsconfig.json": "TypeScript compiler configuration",
    "vite.config.ts": "Vite bundler configuration",
    "vite.config.js": "Vite bundler configuration",
    "next.config.ts": "Next.js framework configuration",
    "next.config.js": "Next.js framework configuration",
    "nuxt.config.ts": "Nuxt.js framework configuration",
    "Cargo.toml": "Rust package and dependency manifest",
    "go.mod": "Go module and dependency declaration",
    "pyproject.toml": "Python project metadata and dependencies",
    "setup.py": "Python package setup script",
    "Gemfile": "Ruby gem dependency specification",
    "Makefile": "Build automation and task targets",
    "Dockerfile": "Container image build instructions",
    "docker-compose.yml": "Multi-container Docker orchestration",
    "README.md": "Project documentation and getting started guide",
    "LICENSE": "Open-source license terms",
    "CONTRIBUTING.md": "Contribution guidelines and PR process",
  };
  const found: string[] = [];
  for (const key of important) {
    const exact = items.find((i) => i.path === key);
    const nested = items.filter((i) => i.path !== key && i.path.endsWith(`/${key}`))
      .sort((a, b) => a.path.split("/").length - b.path.split("/").length)[0];
    const match = exact ?? nested;
    if (match) {
      const desc = DESC[key] ?? "";
      found.push(desc ? `${match.path} — ${desc}` : match.path);
    }
  }
  const srcDirs = items.filter((i) => i.type === "tree" && !i.path.includes("/") && ["src","lib","packages","apps","cmd","pkg"].includes(i.path));
  for (const dir of srcDirs.slice(0, 3)) {
    if (!found.some((f) => f.startsWith(dir.path))) found.push(`${dir.path}/ — Source directory`);
  }
  return found.slice(0, 12);
}

function computeScores(
  treePaths: string[],
  openIssuesCount: number,
  stars: number,
  contributorCount: number,
  languageCount: number,
  size: number,
): { maintainabilityScore: number; complexityScore: number } {
  const has = (...patterns: string[]) => patterns.some((p) => treePaths.some((path) => path === p || path.includes(p)));
  let m = 40;
  if (has(".github/workflows", ".circleci")) m += 20;
  if (has("test/", "tests/", "__tests__/", "spec/")) m += 15;
  if (has("README.md")) m += 8;
  if (has("LICENSE", "LICENSE.md")) m += 7;
  if (has("CONTRIBUTING.md")) m += 5;
  if (has("tsconfig.json")) m += 5;
  if (openIssuesCount > 0 && stars > 0) {
    const ratio = openIssuesCount / stars;
    if (ratio < 0.01) m += 10;
    else if (ratio < 0.05) m += 5;
    else if (ratio > 0.2) m -= 5;
  }
  if (contributorCount > 50) m += 5;
  else if (contributorCount > 10) m += 3;
  const maintainabilityScore = Math.max(10, Math.min(98, m));

  let c = 30;
  if (has("packages/", "pnpm-workspace.yaml", "lerna.json", "turbo.json")) c += 20;
  if (languageCount > 3) c += 10;
  if (languageCount > 6) c += 10;
  if (size > 50000) c += 10;
  else if (size > 10000) c += 5;
  if (has("Dockerfile", "docker-compose")) c += 5;
  if (has(".github/workflows")) c += 5;
  const topDirs = treePaths.filter((p) => !p.includes("/")).length;
  if (topDirs > 15) c += 10;
  else if (topDirs > 8) c += 5;
  const complexityScore = Math.max(10, Math.min(95, c));

  return { maintainabilityScore, complexityScore };
}

function processLanguages(raw: Record<string, number>): LanguageStat[] {
  const total = Object.values(raw).reduce((s, n) => s + n, 0);
  return Object.entries(raw)
    .sort(([, a], [, b]) => b - a)
    .map(([language, bytes]) => ({
      language,
      bytes,
      percentage: total > 0 ? Math.round((bytes / total) * 1000) / 10 : 0,
    }));
}

// ── Public result type ────────────────────────────────────────────────────────

export interface GitHubFetchResult {
  repo: Repository;
  architecture: ArchitectureMap;
  fromGitHub: boolean;
  readmeText: string;
  treeItems: GHTreeItem[];
  keyFiles: string[];
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

// ── Main fetch function ───────────────────────────────────────────────────────

export async function fetchFromGitHub(
  url: string,
  mockRepoFallback: Repository,
  mockArchFallback: ArchitectureMap,
): Promise<GitHubFetchResult> {
  const clean = url.trim().replace(/\.git$/, "").replace(/\/$/, "");
  const fullMatch = clean.match(/github\.com\/([^/\s]+)\/([^/\s]+)/);
  const shortMatch = clean.match(/^([^/\s]+)\/([^/\s]+)$/);
  const [owner, repoName] = fullMatch
    ? [fullMatch[1], fullMatch[2]]
    : shortMatch
    ? [shortMatch[1], shortMatch[2]]
    : [null, null];

  if (!owner || !repoName) {
    return {
      repo: mockRepoFallback, architecture: mockArchFallback, fromGitHub: false,
      readmeText: "", treeItems: [], keyFiles: [], languages: [], contributors: [],
      releases: [], recentCommits: [], topics: [], openIssuesCount: 0,
      watchersCount: 0, size: 0, license: "Unknown", createdAt: "",
    };
  }

  try {
    const ghRepo = (await ghFetch(`/repos/${owner}/${repoName}`)) as GHRepo;

    // Parallel fetch: tree, readme, languages, contributors, releases, commits
    const [treeResult, readmeResult, langsResult, contribResult, releasesResult, commitsResult] = await Promise.allSettled([
      (async () => {
        const branch = (await ghFetch(`/repos/${owner}/${repoName}/branches/${ghRepo.default_branch}`)) as GHBranch;
        return ghFetch(`/repos/${owner}/${repoName}/git/trees/${branch.commit.sha}?recursive=1`) as Promise<GHTree>;
      })(),
      ghFetch(`/repos/${owner}/${repoName}/readme`) as Promise<GHReadme>,
      ghFetch(`/repos/${owner}/${repoName}/languages`) as Promise<Record<string, number>>,
      ghFetch(`/repos/${owner}/${repoName}/contributors?per_page=10&anon=false`) as Promise<GHContributor[]>,
      ghFetch(`/repos/${owner}/${repoName}/releases?per_page=5`) as Promise<GHRelease[]>,
      ghFetch(`/repos/${owner}/${repoName}/commits?per_page=12`) as Promise<GHCommit[]>,
    ]);

    const tree: GHTree | null = treeResult.status === "fulfilled" ? treeResult.value : null;
    const readmeRaw: GHReadme | null = readmeResult.status === "fulfilled" ? readmeResult.value : null;
    const rawLangs: Record<string, number> = langsResult.status === "fulfilled" ? langsResult.value : {};
    const rawContribs: GHContributor[] = contribResult.status === "fulfilled" && Array.isArray(contribResult.value) ? contribResult.value : [];
    const rawReleases: GHRelease[] = releasesResult.status === "fulfilled" && Array.isArray(releasesResult.value) ? releasesResult.value : [];
    const rawCommits: GHCommit[] = commitsResult.status === "fulfilled" && Array.isArray(commitsResult.value) ? commitsResult.value : [];

    const readme = readmeRaw?.encoding === "base64"
      ? Buffer.from(readmeRaw.content.replace(/\n/g, ""), "base64").toString("utf-8")
      : "";

    const treeItems = tree?.tree ?? [];
    const treePaths = treeItems.map((i) => i.path);
    const folderTree = buildFolderTree(treeItems, ghRepo.name);
    const keyFiles = buildKeyFiles(treeItems);
    const language = ghRepo.language ?? "Unknown";
    const framework = detectFramework(ghRepo.language, ghRepo.name, ghRepo.topics ?? []);
    const id = makeRepoId(owner, repoName);
    const languages = processLanguages(rawLangs);
    const languageCount = languages.length;

    const contributors: ContributorInfo[] = rawContribs.map((c) => ({
      login: c.login,
      avatarUrl: c.avatar_url,
      contributions: c.contributions,
      profileUrl: c.html_url,
    }));

    const releases: ReleaseInfo[] = rawReleases.map((r) => ({
      name: r.name ?? r.tag_name,
      tagName: r.tag_name,
      publishedAt: r.published_at,
      body: (r.body ?? "").slice(0, 500),
      isPrerelease: r.prerelease,
    }));

    const recentCommits: CommitInfo[] = rawCommits.map((c) => ({
      sha: c.sha.slice(0, 7),
      message: c.commit.message.split("\n")[0].slice(0, 100),
      author: c.commit.author?.name ?? "Unknown",
      date: c.commit.author?.date ?? "",
      url: c.html_url,
    }));

    const { maintainabilityScore, complexityScore } = computeScores(
      treePaths, ghRepo.open_issues_count, ghRepo.stargazers_count,
      contributors.length, languageCount, ghRepo.size,
    );

    const repo: Repository = {
      id, url: ghRepo.html_url, name: ghRepo.name, owner: ghRepo.owner.login,
      language, framework,
      stars: ghRepo.stargazers_count, forks: ghRepo.forks_count,
      purpose: buildPurpose(ghRepo),
      architectureSummary: buildArchSummary(ghRepo, readme),
      maintainabilityScore, complexityScore,
      analyzedAt: new Date().toISOString(),
    };

    const architecture: ArchitectureMap = {
      folderTree,
      keyFiles: keyFiles.length > 0 ? keyFiles : mockArchFallback.keyFiles,
      dependencies: mockArchFallback.dependencies,
      componentRelationships: mockArchFallback.componentRelationships,
      dataFlow: mockArchFallback.dataFlow,
    };

    return {
      repo, architecture, fromGitHub: true, readmeText: readme,
      treeItems, keyFiles, languages, contributors, releases, recentCommits,
      topics: ghRepo.topics ?? [], openIssuesCount: ghRepo.open_issues_count,
      watchersCount: ghRepo.watchers_count, size: ghRepo.size,
      license: ghRepo.license?.name ?? "Not specified", createdAt: ghRepo.created_at,
    };
  } catch {
    return {
      repo: mockRepoFallback, architecture: mockArchFallback, fromGitHub: false,
      readmeText: "", treeItems: [], keyFiles: [], languages: [], contributors: [],
      releases: [], recentCommits: [], topics: [], openIssuesCount: 0,
      watchersCount: 0, size: 0, license: "Unknown", createdAt: "",
    };
  }
}
