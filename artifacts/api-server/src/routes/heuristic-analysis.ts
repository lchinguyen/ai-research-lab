import type { AgentOutput, Issue, PrSummary } from "@workspace/api-zod";
import type { LanguageStat, ContributorInfo, ReleaseInfo, CommitInfo } from "./github";

export interface AnalysisContext {
  name: string;
  owner: string;
  language: string;
  framework: string;
  stars: number;
  forks: number;
  treePaths: string[];
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
  maintainabilityScore: number;
  complexityScore: number;
  purpose: string;
  architectureSummary: string;
}

export interface HeuristicAnalysis {
  agents: AgentOutput[];
  issues: Issue[];
  prSummary: PrSummary;
}

function has(treePaths: string[], ...patterns: string[]): boolean {
  return patterns.some((p) => treePaths.some((path) => path === p || path.includes(p)));
}

function topContributors(contributors: ContributorInfo[], count = 3): string {
  return contributors.slice(0, count).map((c) => c.login).join(", ") || "the core team";
}

function sizeLabel(kb: number): string {
  if (kb > 100_000) return "very large (>100 MB)";
  if (kb > 10_000) return "large (>10 MB)";
  if (kb > 1_000) return "medium (~1–10 MB)";
  return "compact (<1 MB)";
}

// ── Agent builders ────────────────────────────────────────────────────────────

function researchLeadAgent(ctx: AnalysisContext): AgentOutput {
  const primaryLang = ctx.languages[0]?.language ?? ctx.language;
  const langList = ctx.languages.slice(0, 3).map((l) => `${l.language} (${l.percentage}%)`).join(", ");
  const topContrib = ctx.contributors[0];
  const lastRelease = ctx.releases[0];
  const hasCI = has(ctx.treePaths, ".github/workflows", ".circleci", ".travis.yml");

  const findings: string[] = [
    `Repository has ${ctx.stars.toLocaleString()} stars and ${ctx.forks.toLocaleString()} forks, indicating ${ctx.stars > 10000 ? "very strong" : ctx.stars > 1000 ? "strong" : "growing"} community adoption`,
    langList
      ? `Codebase is primarily ${primaryLang} with ${ctx.languages.length} languages detected: ${langList}`
      : `Primary language is ${primaryLang}`,
    topContrib
      ? `Top contributor is ${topContrib.login} with ${topContrib.contributions.toLocaleString()} commits; ${ctx.contributors.length} contributors in the top-10 list`
      : `${ctx.contributors.length > 0 ? ctx.contributors.length : "Multiple"} contributors identified`,
    lastRelease
      ? `Latest release is ${lastRelease.tagName} published ${new Date(lastRelease.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
      : `No formal releases found — project may use trunk-based deployment`,
    ctx.topics.length > 0
      ? `Project topics: ${ctx.topics.slice(0, 6).join(", ")}`
      : `No repository topics set — adding topics improves discoverability`,
  ];

  const recommendations: string[] = [
    hasCI
      ? "CI pipeline is configured — ensure build status badges are prominent in the README"
      : "Set up a CI pipeline (GitHub Actions recommended) to automate tests and quality checks",
    ctx.releases.length > 0
      ? "Maintain a CHANGELOG.md linked from the README to communicate release changes clearly"
      : "Establish a versioned release process with GitHub Releases and semantic versioning",
    ctx.topics.length < 3
      ? "Add at least 5 repository topics to improve GitHub search discoverability"
      : "Topics are well configured — consider adding ecosystem-specific tags (e.g. 'typescript', 'cli')",
    `Engage ${topContrib?.login ?? "top contributors"} to document unwritten architectural decisions in an ADR folder`,
  ];

  const riskLevel: "low" | "medium" | "high" = ctx.stars > 5000 && hasCI ? "low" : ctx.stars > 500 ? "medium" : "medium";

  return {
    agentType: "research-lead",
    agentName: "Research Lead Agent",
    status: "complete",
    summary: `Completed analysis of ${ctx.owner}/${ctx.name}. The project is a ${ctx.framework} ${ctx.language} repository with ${ctx.stars.toLocaleString()} stars, ${ctx.forks.toLocaleString()} forks, and ${ctx.openIssuesCount} open issues.`,
    findings,
    recommendations,
    riskLevel,
  };
}

function architectureAgent(ctx: AnalysisContext): AgentOutput {
  const isMonorepo = has(ctx.treePaths, "packages/", "pnpm-workspace.yaml", "turbo.json", "lerna.json");
  const hasDockerfile = has(ctx.treePaths, "Dockerfile");
  const hasDockerCompose = has(ctx.treePaths, "docker-compose");
  const hasFrontend = has(ctx.treePaths, "src/", "app/", "pages/", "components/");
  const hasBackend = has(ctx.treePaths, "server/", "api/", "routes/", "controllers/", "handlers/");
  const hasDB = has(ctx.treePaths, "db/", "migrations/", "models/", "prisma/", "drizzle/");
  const hasShared = has(ctx.treePaths, "lib/", "shared/", "common/", "utils/");

  const findings: string[] = [
    isMonorepo
      ? `Monorepo structure detected with packages/${has(ctx.treePaths, "turbo.json") ? " managed by Turborepo" : has(ctx.treePaths, "pnpm-workspace.yaml") ? " using pnpm workspaces" : ""}`
      : `Single-package repository with ${sizeLabel(ctx.size)} codebase`,
    hasFrontend && hasBackend
      ? "Full-stack architecture: frontend and backend code co-located in the repository"
      : hasFrontend
      ? "Frontend-focused architecture with clear component and page structure"
      : hasBackend
      ? "Backend service architecture with route/controller separation"
      : `Library/package architecture — primary ${ctx.language} source in ${has(ctx.treePaths, "src/") ? "src/" : "lib/"} directory`,
    hasDB
      ? `Database layer detected: ${has(ctx.treePaths, "prisma/") ? "Prisma ORM" : has(ctx.treePaths, "drizzle/") ? "Drizzle ORM" : has(ctx.treePaths, "migrations/") ? "SQL migrations" : "database models"} pattern`
      : "No database layer detected — project may use external services or in-memory storage",
    hasDockerfile || hasDockerCompose
      ? `Containerised with ${hasDockerCompose ? "Docker Compose (multi-service)" : "Dockerfile (single container)"}`
      : "No Docker configuration — deployment targets bare-metal or managed PaaS",
    hasShared
      ? "Shared utilities layer isolates cross-cutting concerns from domain logic"
      : "No shared utilities directory — consider extracting common logic to a dedicated layer",
  ];

  const recommendations: string[] = [
    isMonorepo
      ? "Document package ownership and public API surfaces in each package's README"
      : "Consider extracting reusable logic into separate packages as the project scales",
    !hasDockerfile
      ? "Add a Dockerfile to standardise the runtime environment across development and production"
      : "Add a .dockerignore file to minimise image size and keep secrets out of the build context",
    hasDB
      ? "Ensure database migrations are run in CI before integration tests to prevent schema drift"
      : "Document the data persistence strategy (external service, local storage, etc.) in the README",
    has(ctx.treePaths, "ARCHITECTURE.md", "docs/architecture", "docs/ARCHITECTURE")
      ? "Architecture documentation exists — keep it in sync with major structural changes"
      : "Create an ARCHITECTURE.md document to capture key design decisions for new contributors",
  ];

  const riskLevel: "low" | "medium" | "high" = ctx.complexityScore >= 75 ? "high" : ctx.complexityScore >= 50 ? "medium" : "low";

  return {
    agentType: "architecture",
    agentName: "Architecture Agent",
    status: "complete",
    summary: `${ctx.name} follows a ${isMonorepo ? "monorepo" : "single-package"} architecture with ${ctx.complexityScore >= 70 ? "high" : ctx.complexityScore >= 45 ? "moderate" : "manageable"} structural complexity.`,
    findings,
    recommendations,
    riskLevel,
  };
}

function codeReviewAgent(ctx: AnalysisContext): AgentOutput {
  const hasTS = ctx.language === "TypeScript" || has(ctx.treePaths, "tsconfig.json");
  const hasTests = has(ctx.treePaths, "test/", "tests/", "__tests__/", "spec/", "e2e/");
  const hasTestConfig = has(ctx.treePaths, "jest.config", "vitest.config", "cypress.config", "playwright.config");
  const hasCI = has(ctx.treePaths, ".github/workflows", ".circleci", ".travis.yml");
  const hasLinting = has(ctx.treePaths, ".eslintrc", "eslint.config", ".prettierrc", "prettier.config", ".biome");
  const hasPkg = has(ctx.treePaths, "package.json");
  const primaryLang = ctx.languages[0]?.language ?? ctx.language;
  const langPercent = ctx.languages[0]?.percentage ?? 100;

  const findings: string[] = [
    hasTS
      ? "TypeScript provides static type checking — reduces runtime errors and improves IDE support"
      : `${primaryLang} (${langPercent}% of codebase) — ${ctx.language === "Python" ? "Consider adding mypy or pyright for static analysis" : "Consider adding type annotations to improve maintainability"}`,
    hasTests && hasTestConfig
      ? `Full testing infrastructure: test directory and ${has(ctx.treePaths, "vitest.config") ? "Vitest" : has(ctx.treePaths, "jest.config") ? "Jest" : has(ctx.treePaths, "playwright.config") ? "Playwright" : "test framework"} configuration found`
      : hasTests
      ? "Test directory exists but no explicit test framework config found — consider adding explicit test runner configuration"
      : "No test directory detected — adding a test suite would significantly improve reliability",
    hasCI
      ? `CI pipeline in place: ${has(ctx.treePaths, ".github/workflows") ? "GitHub Actions" : has(ctx.treePaths, ".circleci") ? "CircleCI" : "CI"} workflows detected`
      : "No CI configuration found — automated builds and tests on every PR would catch regressions early",
    hasLinting
      ? `Code style enforcement detected: ${has(ctx.treePaths, ".eslintrc", "eslint.config") ? "ESLint" : ""}${has(ctx.treePaths, ".prettierrc", "prettier.config") ? " + Prettier" : ""}${has(ctx.treePaths, ".biome") ? "Biome" : ""}`
      : "No linter or formatter configuration found — consistent code style reduces review friction",
    ctx.maintainabilityScore >= 80
      ? `Maintainability score of ${ctx.maintainabilityScore}/100 — excellent signal for long-term health`
      : `Maintainability score of ${ctx.maintainabilityScore}/100 — targeted improvements in testing and CI will raise this`,
  ];

  const recommendations: string[] = [
    !hasTests
      ? `Add a ${ctx.language === "Python" ? "pytest" : ctx.language === "Go" ? "go test" : ctx.language === "Rust" ? "cargo test" : "Vitest or Jest"} test suite targeting 70%+ coverage of core logic`
      : "Ensure tests run in CI on every PR — consider adding coverage threshold enforcement",
    !hasLinting
      ? `Configure ${ctx.language === "Python" ? "ruff + mypy" : ctx.language === "Go" ? "golangci-lint" : "ESLint + Prettier"} for automated style enforcement`
      : "Add a pre-commit hook (husky or lefthook) to enforce linting before each commit",
    hasTS
      ? "Enable strict mode in tsconfig.json if not already set: `\"strict\": true`"
      : "Consider gradual adoption of TypeScript to improve type safety as the project grows",
    "Add code owners file (.github/CODEOWNERS) to automatically request reviews from domain experts",
  ];

  const riskLevel: "low" | "medium" | "high" = !hasTests && !hasCI ? "high" : !hasTests || !hasCI ? "medium" : "low";

  return {
    agentType: "code-review",
    agentName: "Code Review Agent",
    status: "complete",
    summary: `Code quality review of ${ctx.name}: ${hasTests ? "test coverage present" : "no tests detected"}, ${hasCI ? "CI configured" : "no CI found"}, maintainability score ${ctx.maintainabilityScore}/100.`,
    findings,
    recommendations,
    riskLevel,
  };
}

function issueTriageAgent(ctx: AnalysisContext): AgentOutput {
  const issueRatio = ctx.stars > 0 ? ctx.openIssuesCount / ctx.stars : 0;
  const hasIssueTemplates = has(ctx.treePaths, ".github/ISSUE_TEMPLATE", "ISSUE_TEMPLATE");
  const hasPRTemplate = has(ctx.treePaths, ".github/PULL_REQUEST_TEMPLATE", "PULL_REQUEST_TEMPLATE");
  const lastCommit = ctx.recentCommits[0];

  const findings: string[] = [
    `Currently tracking ${ctx.openIssuesCount.toLocaleString()} open issues (${(issueRatio * 100).toFixed(1)}% of star count — ${issueRatio < 0.05 ? "healthy ratio" : issueRatio < 0.2 ? "moderate backlog" : "large backlog"})`,
    hasIssueTemplates
      ? "Issue templates configured — structured reports reduce triage overhead"
      : "No issue templates detected — unstructured bug reports increase triage time",
    hasPRTemplate
      ? "Pull request template in place — contributors receive clear submission guidance"
      : "No PR template — adding one reduces incomplete submissions and review round-trips",
    lastCommit
      ? `Most recent commit: "${lastCommit.message}" by ${lastCommit.author} — project is actively maintained`
      : "No recent commit data available — activity level cannot be determined",
    ctx.releases.length > 0
      ? `${ctx.releases.length} recent release(s) found — issues may be resolved in unreleased commits`
      : "No releases found — users may be filing issues for bugs already fixed in HEAD",
  ];

  const recommendations: string[] = [
    !hasIssueTemplates
      ? "Create .github/ISSUE_TEMPLATE/ with separate templates for bug reports and feature requests"
      : "Review and update issue templates quarterly to match current project priorities",
    ctx.openIssuesCount > 50
      ? "Hold a monthly issue triage session to label, close stale, and promote 'good-first-issue' tickets"
      : "Apply 'good-first-issue' labels to onboarding-friendly tickets to grow the contributor base",
    "Set up Stale Bot or GitHub Actions to auto-close issues with no activity after 90 days",
    ctx.releases.length === 0
      ? "Start publishing GitHub Releases so users can correlate bug fixes to versions"
      : "Link closed issues to their fix release in the CHANGELOG for user transparency",
  ];

  const riskLevel: "low" | "medium" | "high" = issueRatio > 0.3 ? "high" : issueRatio > 0.1 ? "medium" : "low";

  return {
    agentType: "issue-triage",
    agentName: "Issue Triage Agent",
    status: "complete",
    summary: `Issue analysis for ${ctx.name}: ${ctx.openIssuesCount} open issues with a ${(issueRatio * 100).toFixed(1)}% star-to-issue ratio. ${issueRatio < 0.1 ? "Issue backlog is healthy." : "Backlog management recommended."}`,
    findings,
    recommendations,
    riskLevel,
  };
}

function fixEngineerAgent(ctx: AnalysisContext): AgentOutput {
  const hasMakefile = has(ctx.treePaths, "Makefile");
  const hasPkg = has(ctx.treePaths, "package.json");
  const hasCargo = has(ctx.treePaths, "Cargo.toml");
  const hasGoMod = has(ctx.treePaths, "go.mod");
  const hasPyproject = has(ctx.treePaths, "pyproject.toml", "requirements.txt");
  const hasDockerfile = has(ctx.treePaths, "Dockerfile");
  const hasDockerCompose = has(ctx.treePaths, "docker-compose");
  const hasCI = has(ctx.treePaths, ".github/workflows", ".circleci");
  const pm = hasCargo ? "cargo" : hasGoMod ? "go" : hasPyproject ? "pip/poetry" : "npm/pnpm/yarn";

  const findings: string[] = [
    `Build system: ${hasMakefile ? "Makefile targets" : hasCargo ? "Cargo build" : hasGoMod ? "go build" : hasPyproject ? "Python build tools" : hasPkg ? "npm/pnpm scripts" : "no standard build config detected"}`,
    hasDockerfile
      ? `Containerised with Docker${hasDockerCompose ? " Compose (multi-service setup)" : " (single-container)"} — reproducible builds guaranteed`
      : `No Docker configuration — environment consistency depends on documentation accuracy`,
    hasCI
      ? `CI automation: ${has(ctx.treePaths, ".github/workflows") ? "GitHub Actions workflows" : "CI pipeline"} reduce manual release steps`
      : "No CI detected — releases depend entirely on manual steps which are error-prone",
    `Dependency manager: ${pm} — ${hasCargo || hasGoMod ? "lock file ensures reproducible builds" : hasPkg ? "ensure lock file is committed to version control" : "verify package pinning strategy"}`,
    ctx.releases.length > 0
      ? `Latest fix release: ${ctx.releases[0].tagName} — published ${new Date(ctx.releases[0].publishedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`
      : "No release history — difficult to attribute fixes to specific versions",
  ];

  const recommendations: string[] = [
    !hasDockerfile
      ? `Add a multi-stage Dockerfile to produce lean production images and eliminate "works on my machine" issues`
      : "Document required environment variables in a .env.example file and validate them on startup",
    !hasCI
      ? "Automate the build and publish pipeline with GitHub Actions to eliminate manual release errors"
      : "Add a semantic-release or changesets workflow to automate version bumping and CHANGELOG generation",
    "Pin all dependency versions in lock files and audit them for vulnerabilities in CI",
    `Add a \`${hasMakefile ? "make setup" : pm === "npm/pnpm/yarn" ? "npm run setup" : pm + " run setup"}\` command to automate developer environment bootstrap`,
  ];

  const riskLevel: "low" | "medium" | "high" = !hasCI ? "medium" : "low";

  return {
    agentType: "fix-engineer",
    agentName: "Fix Engineer Agent",
    status: "complete",
    summary: `Build and release pipeline analysis for ${ctx.name}: ${hasCI ? "automated CI detected" : "manual release process"}, using ${pm} with ${hasDockerfile ? "Docker containerization" : "bare-metal deployment"}.`,
    findings,
    recommendations,
    riskLevel,
  };
}

function prWriterAgent(ctx: AnalysisContext): AgentOutput {
  const lastCommit = ctx.recentCommits[0];
  const lastRelease = ctx.releases[0];
  const topContrib = topContributors(ctx.contributors, 2);
  const hasPRTemplate = has(ctx.treePaths, ".github/PULL_REQUEST_TEMPLATE", "PULL_REQUEST_TEMPLATE");
  const hasChangelog = has(ctx.treePaths, "CHANGELOG", "CHANGES", "HISTORY");

  const findings: string[] = [
    ctx.recentCommits.length > 0
      ? `${ctx.recentCommits.length} recent commits sampled — active development with conventional commit messages ${ctx.recentCommits[0].message.match(/^(feat|fix|chore|docs|refactor|test|perf|ci)/) ? "already in use" : "not detected"}`
      : "No recent commit data — unable to assess commit message quality",
    hasPRTemplate
      ? "PR template enforces structured descriptions — improves review quality"
      : "No PR template — PRs likely lack consistent description structure",
    hasChangelog
      ? "CHANGELOG file maintained — facilitates automated release note generation"
      : "No CHANGELOG — consider adopting Keep a Changelog or automated changesets",
    topContrib
      ? `Key collaborators: ${topContrib} — involve them as mandatory reviewers for critical paths`
      : "Contributor data unavailable — establish a CODEOWNERS file to assign review responsibilities",
    lastRelease
      ? `Most recent release ${lastRelease.tagName} — PRs since then form the next release candidate`
      : "No previous release — first release PR will set the project's public API contract",
  ];

  const recommendations: string[] = [
    !hasPRTemplate
      ? "Create .github/PULL_REQUEST_TEMPLATE.md with sections for: motivation, changes, testing, screenshots"
      : "Keep the PR template lean — too many required fields reduce contribution rate",
    "Enforce conventional commits (feat/fix/chore/docs) with commitlint in CI to enable automated changelogs",
    "Require at least one approving review from a CODEOWNER before merge on protected branches",
    hasChangelog
      ? "Automate CHANGELOG updates using semantic-release or changesets to eliminate manual updates"
      : "Add a CHANGELOG.md and update it with every release to communicate changes to users",
  ];

  return {
    agentType: "pr-writer",
    agentName: "PR Writer Agent",
    status: "complete",
    summary: `PR workflow analysis for ${ctx.name}: ${hasPRTemplate ? "template in place" : "no template"}, ${hasChangelog ? "CHANGELOG maintained" : "no CHANGELOG"}. Recent activity by ${topContrib}.`,
    findings,
    recommendations,
    riskLevel: "low",
  };
}

// ── Issue generation ──────────────────────────────────────────────────────────

function generateIssues(ctx: AnalysisContext): Issue[] {
  const issues: Issue[] = [];
  const has_ = (...p: string[]) => has(ctx.treePaths, ...p);

  let idx = 1;
  const add = (
    title: string, priority: Issue["priority"], type: Issue["type"],
    description: string, suggestedFix: string, affectedFiles: string[]
  ) => {
    issues.push({ id: `issue-${idx++}`, title, priority, type, description, suggestedFix, affectedFiles });
  };

  if (!has_("test/", "tests/", "__tests__/", "spec/")) {
    add(
      `Add ${ctx.language} unit test suite to ${ctx.name}`,
      "high", "documentation",
      `No test directory was found in the repository. Without automated tests, regressions are discovered in production rather than during development. The ${ctx.framework} ecosystem has mature testing tooling that can be adopted incrementally.`,
      `Create a \`tests/\` directory and configure ${ctx.language === "Python" ? "pytest" : ctx.language === "Go" ? "go test" : ctx.language === "Rust" ? "cargo test" : "Vitest"} as the test runner. Start with unit tests for core utility functions and expand from there.`,
      has_("src/") ? ["src/"] : ["lib/", "index.ts"]
    );
  }

  if (!has_(".github/workflows", ".circleci", ".travis.yml")) {
    add(
      "Set up automated CI pipeline with GitHub Actions",
      "high", "enhancement",
      `No continuous integration configuration was found. Without CI, code quality checks (tests, linting, type checking) rely on individual contributors running them locally — leading to inconsistent enforcement and preventable regressions reaching the main branch.`,
      `Create \`.github/workflows/ci.yml\` with jobs for install, lint, type-check, and test. Add a status badge to the README. Reference the GitHub Actions documentation for the ${ctx.framework} ecosystem.`,
      [".github/workflows/ci.yml"]
    );
  }

  if (!has_("CONTRIBUTING.md", "contributing.md")) {
    add(
      "Add CONTRIBUTING.md with development setup and PR guidelines",
      "medium", "documentation",
      `New contributors have no documented process for setting up a development environment, running tests, or submitting pull requests. This creates unnecessary friction and leads to lower-quality first contributions.`,
      `Create \`CONTRIBUTING.md\` documenting: prerequisites, local setup steps (clone → install → configure → test → run), branching strategy, commit message conventions, and the PR review process.`,
      ["CONTRIBUTING.md"]
    );
  }

  if (!has_("LICENSE", "LICENSE.md")) {
    add(
      "Add an open-source license to clarify usage rights",
      "medium", "documentation",
      `No LICENSE file was found. Without a license, the repository is legally 'all rights reserved' by default — meaning users cannot legally use, modify, or distribute the code even if it is publicly visible on GitHub.`,
      `Choose an appropriate license (MIT for maximum permissiveness, Apache 2.0 for patent protection, GPL for copyleft) and add a LICENSE file to the repository root. GitHub's license picker can help.`,
      ["LICENSE"]
    );
  }

  if (ctx.openIssuesCount > 100 && ctx.stars > 0) {
    const ratio = ctx.openIssuesCount / ctx.stars;
    add(
      `Triage ${ctx.openIssuesCount} open issues to reduce backlog`,
      ratio > 0.2 ? "high" : "medium", "enhancement",
      `The repository has ${ctx.openIssuesCount} open issues — a ratio of ${(ratio * 100).toFixed(1)}% relative to star count. A large unmanaged backlog reduces contributor trust and makes it harder for users to find relevant information.`,
      `Hold a structured triage session: label all open issues (bug, enhancement, good-first-issue, wontfix), close duplicates and stale issues, and milestone remaining items. Set up GitHub's Stale Action to auto-close inactive issues after 90 days.`,
      [".github/workflows/stale.yml", ".github/ISSUE_TEMPLATE/"]
    );
  }

  if (!has_("CHANGELOG", "CHANGELOG.md", "CHANGES")) {
    add(
      "Create a CHANGELOG to document version history",
      "low", "documentation",
      `No CHANGELOG file exists. Users upgrading between versions have no structured way to discover breaking changes, new features, or bug fixes — forcing them to read raw commit history or release notes.`,
      `Create \`CHANGELOG.md\` following the Keep a Changelog format (https://keepachangelog.com). Consider automating updates with semantic-release or changesets integrated into your CI pipeline.`,
      ["CHANGELOG.md"]
    );
  }

  if (!has_(".github/ISSUE_TEMPLATE", "ISSUE_TEMPLATE")) {
    add(
      "Add GitHub issue templates for bug reports and feature requests",
      "low", "enhancement",
      `Issues are submitted without structured templates, leading to missing reproduction steps, environment information, and expected vs actual behavior descriptions. This significantly increases triage time per issue.`,
      `Create \`.github/ISSUE_TEMPLATE/bug_report.yml\` and \`.github/ISSUE_TEMPLATE/feature_request.yml\` using GitHub's issue form schema. Include fields for: environment, steps to reproduce, expected behavior, and actual behavior.`,
      [".github/ISSUE_TEMPLATE/bug_report.yml", ".github/ISSUE_TEMPLATE/feature_request.yml"]
    );
  }

  if (!has_("Dockerfile") && ctx.framework !== "Go" && ctx.language !== "Rust") {
    add(
      `Add Dockerfile for ${ctx.name} to standardise deployment`,
      "low", "enhancement",
      `No Dockerfile was found. Without containerisation, deploying the project requires manual environment setup on each target host, leading to environment-specific bugs and inconsistent deployments across team members.`,
      `Create a multi-stage Dockerfile: use a build stage to compile/bundle the application, then copy only the runtime artifacts into a minimal production image (e.g. \`node:alpine\` or \`python:slim\`). Document the build command in the README.`,
      ["Dockerfile", ".dockerignore"]
    );
  }

  return issues.slice(0, 8);
}

// ── PR Summary generation ─────────────────────────────────────────────────────

function generatePrSummary(ctx: AnalysisContext): PrSummary {
  const hasTests = has(ctx.treePaths, "test/", "tests/", "__tests__/", "spec/");
  const hasCI = has(ctx.treePaths, ".github/workflows", ".circleci");
  const topContrib = topContributors(ctx.contributors, 1);
  const lastTag = ctx.releases[0]?.tagName ?? "initial";
  const lastCommit = ctx.recentCommits[0]?.message ?? "latest changes";

  return {
    title: `chore(${ctx.name}): infrastructure improvements and developer experience enhancements`,
    summary: `This PR addresses several infrastructure and developer experience gaps identified during the repository health analysis of \`${ctx.owner}/${ctx.name}\`.

The changes focus on improving the contributor onboarding experience, establishing automated quality gates, and documenting the project's architecture and contribution process. These improvements will reduce friction for new contributors and establish a more sustainable maintenance workflow.

The work follows findings from the automated heuristic analysis which scored the repository ${ctx.maintainabilityScore}/100 for maintainability and identified ${ctx.complexityScore >= 70 ? "high" : ctx.complexityScore >= 45 ? "moderate" : "manageable"} architectural complexity. Primary languages: ${ctx.languages.slice(0, 2).map((l) => l.language).join(" and ") || ctx.language}.`,
    implementationNotes: [
      `Base branch: \`${ctx.releases.length > 0 ? "main" : "main"}\`; branch off \`feat/infrastructure-improvements\``,
      `${hasCI ? "Existing CI pipeline extended" : "New GitHub Actions workflow created"} — all jobs must pass before merge`,
      `Documentation changes are in Markdown — preview renders in the GitHub PR diff view`,
      `No functional code changes in this PR — pure infrastructure, tooling, and documentation`,
    ],
    testingChecklist: [
      `Run existing test suite: ${has(ctx.treePaths, "package.json") ? "`pnpm test` or `npm test`" : has(ctx.treePaths, "Cargo.toml") ? "`cargo test`" : has(ctx.treePaths, "go.mod") ? "`go test ./...`" : "`run test command`"}`,
      "Verify CI pipeline runs green on the PR branch",
      "Review CONTRIBUTING.md for factual accuracy against the actual setup steps",
      "Check all internal documentation links resolve correctly",
      has(ctx.treePaths, "Dockerfile") ? "Build Docker image and verify it starts correctly: `docker build . && docker run --rm <image>`" : "Verify local dev setup steps work on a fresh machine or container",
      `Ask ${topContrib} or another maintainer to review for accuracy before merge`,
    ],
    riskNotes: [
      "No production code is changed — risk of runtime regressions is minimal",
      has(ctx.treePaths, ".github/workflows")
        ? "New or modified GitHub Actions workflows should be reviewed carefully to avoid CI cost surprises"
        : "New CI workflow will consume GitHub Actions minutes — verify free tier quota is sufficient",
      `Changes to CONTRIBUTING.md set expectations for future contributors — ensure accuracy`,
      "Branch protection rules may need updating if new required status checks are added",
    ],
  };
}

// ── Main export ───────────────────────────────────────────────────────────────

export function runHeuristicAnalysis(ctx: AnalysisContext): HeuristicAnalysis {
  return {
    agents: [
      researchLeadAgent(ctx),
      architectureAgent(ctx),
      codeReviewAgent(ctx),
      issueTriageAgent(ctx),
      fixEngineerAgent(ctx),
      prWriterAgent(ctx),
    ],
    issues: generateIssues(ctx),
    prSummary: generatePrSummary(ctx),
  };
}
