import type { Repository, ArchitectureMap } from "@workspace/api-zod";

export interface RawContext {
  repo: Repository;
  architecture: ArchitectureMap;
  treePaths: string[];
}

function has(paths: string[], ...patterns: string[]): boolean {
  return patterns.some((p) =>
    paths.some((path) => path === p || path.includes(p))
  );
}

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

// ── HEALTH SCORE ─────────────────────────────────────────────────────────────

export function buildHealthScore(ctx: RawContext) {
  const { repo, treePaths } = ctx;

  const hasDocs = has(treePaths, "docs/", "wiki/", "documentation/");
  const hasContributing = has(treePaths, "CONTRIBUTING.md", "contributing.md", "CONTRIBUTING");
  const hasReadme = has(treePaths, "README.md", "readme.md", "README");
  const hasLicense = has(treePaths, "LICENSE", "LICENSE.md", "license");
  const hasTests = has(treePaths, "test/", "tests/", "__tests__/", "spec/", "e2e/");
  const hasTestConfig = has(treePaths, "jest.config", "vitest.config", "cypress.config", "playwright.config", ".mocharc");
  const hasCI = has(treePaths, ".github/workflows", ".circleci", ".travis.yml", "Jenkinsfile", ".gitlab-ci.yml");
  const hasPRTemplate = has(treePaths, "PULL_REQUEST_TEMPLATE", "pull_request_template");
  const hasIssueTemplate = has(treePaths, "ISSUE_TEMPLATE", "issue_template");
  const hasCodeOfConduct = has(treePaths, "CODE_OF_CONDUCT");
  const hasChangelog = has(treePaths, "CHANGELOG", "CHANGES", "HISTORY");
  const isMonorepo = has(treePaths, "packages/", "apps/", "pnpm-workspace.yaml", "lerna.json", "turbo.json");
  const hasDockerfile = has(treePaths, "Dockerfile", "docker-compose");
  const hasSrc = has(treePaths, "src/");

  // 1. Maintainability
  const maintainability = clamp(repo.maintainabilityScore);

  // 2. Documentation Quality
  let docScore = 0;
  if (hasReadme) docScore += 30;
  if (hasContributing) docScore += 20;
  if (hasDocs) docScore += 20;
  if (hasLicense) docScore += 15;
  if (hasChangelog) docScore += 15;
  const documentation = clamp(docScore);

  // 3. Architecture Complexity (lower complexity = higher score)
  let archScore = 100 - repo.complexityScore;
  if (hasSrc) archScore += 5;
  if (isMonorepo) archScore += 5; // structured monorepo is good
  const architecture = clamp(archScore);

  // 4. Contributor Friendliness
  let contribScore = 0;
  if (hasContributing) contribScore += 25;
  if (hasIssueTemplate) contribScore += 20;
  if (hasPRTemplate) contribScore += 15;
  if (hasCodeOfConduct) contribScore += 15;
  if (hasReadme) contribScore += 15;
  if (repo.forks > 100) contribScore += 10;
  const contributorFriendliness = clamp(contribScore);

  // 5. Testing Coverage Estimate
  let testScore = 0;
  if (hasTests) testScore += 35;
  if (hasTestConfig) testScore += 25;
  if (hasCI) testScore += 20;
  if (repo.maintainabilityScore > 75) testScore += 20; // well-maintained usually means good tests
  const testing = clamp(testScore);

  // 6. Project Activity
  let activityScore = 0;
  if (repo.stars > 100) activityScore += 15;
  if (repo.stars > 1000) activityScore += 15;
  if (repo.stars > 10000) activityScore += 15;
  if (repo.stars > 50000) activityScore += 10;
  if (repo.forks > 50) activityScore += 10;
  if (repo.forks > 500) activityScore += 10;
  const forksStarsRatio = repo.stars > 0 ? repo.forks / repo.stars : 0;
  if (forksStarsRatio > 0.05) activityScore += 10;
  if (hasCI) activityScore += 15;
  const activity = clamp(activityScore);

  const dimensions = [
    {
      id: "maintainability",
      label: "Maintainability",
      score: maintainability,
      description: "Code organisation, consistency, and long-term health",
      insight: maintainability >= 80
        ? "Excellent code organisation with consistent patterns"
        : maintainability >= 60
        ? "Good overall structure with some areas to improve"
        : "Significant refactoring opportunities identified",
    },
    {
      id: "documentation",
      label: "Documentation Quality",
      score: documentation,
      description: "README, guides, changelogs, and inline docs",
      insight: documentation >= 80
        ? "Comprehensive documentation covering all key areas"
        : documentation >= 50
        ? "Core documentation present; consider adding changelog and contributing guide"
        : "Documentation gaps — missing README, CONTRIBUTING, or LICENSE",
    },
    {
      id: "architecture",
      label: "Architecture Clarity",
      score: architecture,
      description: "Structural clarity, separation of concerns, modularity",
      insight: architecture >= 80
        ? "Clear layered architecture with well-defined module boundaries"
        : architecture >= 55
        ? "Reasonable structure; some coupling between modules detected"
        : "High architectural complexity — consider decomposing into smaller modules",
    },
    {
      id: "contributor",
      label: "Contributor Friendliness",
      score: contributorFriendliness,
      description: "Issue templates, PR templates, code of conduct, contribution guide",
      insight: contributorFriendliness >= 75
        ? "Excellent onboarding infrastructure for new contributors"
        : contributorFriendliness >= 40
        ? "Basic contributor tooling present; add issue/PR templates to improve"
        : "Missing key contributor infrastructure — add CONTRIBUTING.md and templates",
    },
    {
      id: "testing",
      label: "Testing Coverage Estimate",
      score: testing,
      description: "Test presence, CI pipelines, testing framework configuration",
      insight: testing >= 75
        ? "Strong testing infrastructure with CI automation"
        : testing >= 45
        ? "Tests present but CI or test framework config could be strengthened"
        : "Limited testing detected — consider adding test suite and CI pipeline",
    },
    {
      id: "activity",
      label: "Project Activity",
      score: activity,
      description: "Stars, forks, community traction, and development momentum",
      insight: activity >= 80
        ? "Highly active project with strong community engagement"
        : activity >= 50
        ? "Moderate activity with a growing community"
        : "Early-stage or niche project with limited community traction so far",
    },
  ];

  const overallScore = clamp(
    Math.round(
      maintainability * 0.20 +
      documentation * 0.15 +
      architecture * 0.15 +
      contributorFriendliness * 0.15 +
      testing * 0.20 +
      activity * 0.15
    )
  );

  const grade =
    overallScore >= 90 ? "A+"
    : overallScore >= 80 ? "A"
    : overallScore >= 70 ? "B"
    : overallScore >= 60 ? "C"
    : overallScore >= 50 ? "D"
    : "F";

  const summary =
    overallScore >= 80
      ? `${repo.name} is a high-quality, well-maintained repository with strong documentation and active community engagement.`
      : overallScore >= 60
      ? `${repo.name} is a solid project with good fundamentals. Focus on improving testing coverage and contributor tooling to reach the next level.`
      : `${repo.name} has growth opportunities across documentation, testing, and contributor experience. Systematic improvements in these areas will significantly raise the health score.`;

  return { overallScore, grade, dimensions, summary };
}

// ── DEPENDENCY RISK ───────────────────────────────────────────────────────────

export function buildDependencyRisk(ctx: RawContext) {
  const { repo, architecture, treePaths } = ctx;

  const lang = repo.language.toLowerCase();
  const fw = repo.framework.toLowerCase();

  // Detect package manager
  const hasPkg = has(treePaths, "package.json");
  const hasCargo = has(treePaths, "Cargo.toml");
  const hasGoMod = has(treePaths, "go.mod");
  const hasPyproject = has(treePaths, "pyproject.toml", "requirements.txt", "Pipfile");
  const hasGemfile = has(treePaths, "Gemfile");

  // Framework detection
  const majorFrameworks: string[] = [];
  if (repo.framework && repo.framework !== "Unknown") majorFrameworks.push(repo.framework);
  if (has(treePaths, "turbo.json")) majorFrameworks.push("Turborepo");
  if (has(treePaths, "docker-compose")) majorFrameworks.push("Docker");
  if (has(treePaths, ".github/workflows")) majorFrameworks.push("GitHub Actions");
  if (has(treePaths, "terraform", ".tf")) majorFrameworks.push("Terraform");

  // Estimate counts from architecture deps + heuristics
  const knownDeps = architecture.dependencies.length;
  const totalCount = knownDeps > 0
    ? knownDeps + Math.floor(repo.stars / 5000) + (hasPkg ? 12 : 0)
    : Math.max(8, Math.floor(repo.stars / 3000) + 15);

  // Outdated estimate: newer/active = fewer outdated
  const outdatedRatio = repo.stars > 20000 ? 0.1 : repo.stars > 5000 ? 0.18 : 0.28;
  const estimatedOutdated = Math.max(1, Math.round(totalCount * outdatedRatio));

  // Bundle complexity
  const bundleComplexity =
    totalCount > 60 ? "High"
    : totalCount > 30 ? "Medium"
    : "Low";

  // Overall risk
  const overallRisk: "low" | "medium" | "high" | "critical" =
    estimatedOutdated > 15 ? "high"
    : estimatedOutdated > 8 ? "medium"
    : "low";

  // Generate dependency items
  const items = [
    {
      name: repo.framework || repo.language,
      category: "Core Framework",
      riskLevel: "low" as const,
      reason: "Major framework with active maintenance and LTS support",
    },
    {
      name: hasCargo ? "Cargo ecosystem" : hasGoMod ? "Go modules" : hasPyproject ? "Python packages" : "npm/pnpm packages",
      category: "Package Ecosystem",
      riskLevel: (overallRisk === "high" ? "medium" : "low") as "low" | "medium" | "high" | "critical",
      reason: `${estimatedOutdated} packages estimated to be behind their latest major version`,
    },
    {
      name: has(treePaths, ".github/workflows") ? "GitHub Actions" : "CI/CD Pipeline",
      category: "DevOps",
      riskLevel: has(treePaths, ".github/workflows") ? "low" as const : "medium" as const,
      reason: has(treePaths, ".github/workflows")
        ? "Automated CI pipeline reduces deployment risk"
        : "No automated CI detected — manual deployments increase risk",
    },
    {
      name: "Transitive dependencies",
      category: "Supply Chain",
      riskLevel: totalCount > 50 ? "medium" as const : "low" as const,
      reason: totalCount > 50
        ? "Large dependency graph increases exposure to supply-chain vulnerabilities"
        : "Manageable dependency footprint with limited transitive exposure",
    },
    {
      name: has(treePaths, "Dockerfile", "docker-compose") ? "Container base images" : "Runtime environment",
      category: "Runtime",
      riskLevel: "low" as const,
      reason: has(treePaths, "Dockerfile")
        ? "Containerised deployment isolates runtime dependencies"
        : "Ensure runtime version is pinned in deployment configuration",
    },
  ];

  const warnings: string[] = [];
  if (estimatedOutdated > 10)
    warnings.push(`~${estimatedOutdated} dependencies estimated to be outdated — run an audit to confirm`);
  if (totalCount > 60)
    warnings.push("High dependency count increases bundle size and attack surface");
  if (!has(treePaths, ".github/workflows", ".circleci", ".travis.yml"))
    warnings.push("No CI pipeline detected — automated security scanning is recommended");
  if (!has(treePaths, "LICENSE", "LICENSE.md"))
    warnings.push("No LICENSE file found — license compatibility of dependencies cannot be verified");
  if (has(treePaths, ".env", ".env.example") && !has(treePaths, ".gitignore"))
    warnings.push("Potential secret exposure — ensure .env files are in .gitignore");

  const recommendations = [
    `Run \`${hasCargo ? "cargo audit" : hasGoMod ? "govulncheck ./..." : hasPyproject ? "pip-audit" : "pnpm audit"}\` to identify known vulnerabilities`,
    "Enable Dependabot or Renovate for automated dependency updates",
    "Pin dependency versions in lock files and commit them to version control",
    "Review transitive dependencies with a tool like `npm ls --depth=0` or `cargo tree`",
    "Set up automated license compatibility scanning in CI",
  ];

  return {
    totalCount,
    majorFrameworks,
    estimatedOutdated,
    overallRisk,
    bundleComplexity,
    warnings,
    recommendations,
    items,
  };
}

// ── ENGINEERING TIMELINE ──────────────────────────────────────────────────────

export function buildTimeline(ctx: RawContext) {
  const { repo, treePaths } = ctx;

  const isMonorepo = has(treePaths, "packages/", "pnpm-workspace.yaml", "lerna.json", "turbo.json");
  const hasDockerfile = has(treePaths, "Dockerfile", "docker-compose");
  const hasCI = has(treePaths, ".github/workflows", ".circleci");
  const hasTests = has(treePaths, "test/", "tests/", "__tests__/", "spec/");
  const complexity = repo.complexityScore;
  const isHighComplexity = complexity >= 65;
  const isMediumComplexity = complexity >= 40 && complexity < 65;

  // Estimate weeks based on complexity
  const baseWeeks = isHighComplexity ? 16 : isMediumComplexity ? 10 : 6;

  const phases = [
    {
      phaseNumber: 1,
      phase: "Discovery & Planning",
      weeks: isHighComplexity ? 2 : 1,
      milestone: "Technical specification and architecture document approved",
      status: "complete" as const,
      tasks: [
        "Read README and architecture documentation",
        "Map all existing modules and dependencies",
        "Identify technical debt and constraints",
        "Define success metrics and acceptance criteria",
        isMonorepo ? "Understand monorepo package boundaries" : "Audit main entry points and exports",
      ],
    },
    {
      phaseNumber: 2,
      phase: "Environment Setup",
      weeks: 1,
      milestone: "All engineers have a working local dev environment",
      status: "in-progress" as const,
      tasks: [
        `Install ${repo.language} runtime and package dependencies`,
        hasDockerfile ? "Build and run Docker containers locally" : "Configure local environment variables",
        "Run existing test suite to establish baseline",
        hasCI ? "Review CI pipeline configuration and gates" : "Set up basic CI pipeline",
        "Configure code editor with project linting rules",
      ],
    },
    {
      phaseNumber: 3,
      phase: "Core Implementation",
      weeks: isHighComplexity ? 6 : isMediumComplexity ? 4 : 2,
      milestone: "Primary feature set implemented with unit tests",
      status: "upcoming" as const,
      tasks: [
        "Implement core business logic changes",
        "Write unit tests for all new functions (target: 80% coverage)",
        isMonorepo ? "Update shared packages and regenerate types" : "Update module exports and type definitions",
        "Code review and pair programming sessions",
        "Address code review feedback and refactor hot paths",
      ],
    },
    {
      phaseNumber: 4,
      phase: "Integration & Testing",
      weeks: isHighComplexity ? 3 : 2,
      milestone: "Full test suite passing with integration coverage",
      status: "upcoming" as const,
      tasks: [
        "Write integration tests across module boundaries",
        "Performance benchmarking against baseline",
        "Security audit of new dependencies",
        hasTests ? "Run full regression suite and fix failures" : "Create integration test framework",
        "Load testing for critical API paths",
      ],
    },
    {
      phaseNumber: 5,
      phase: "Staging & Validation",
      weeks: isHighComplexity ? 2 : 1,
      milestone: "Staging environment green, stakeholder sign-off received",
      status: "upcoming" as const,
      tasks: [
        "Deploy to staging environment",
        "End-to-end user acceptance testing",
        "Monitor error rates and performance metrics",
        "Fix staging-identified issues",
        "Prepare deployment runbook and rollback plan",
      ],
    },
    {
      phaseNumber: 6,
      phase: "Production Deployment",
      weeks: isHighComplexity ? 2 : 1,
      milestone: "Production deployment complete, monitoring active",
      status: "upcoming" as const,
      tasks: [
        "Phased rollout (canary → 10% → 50% → 100%)",
        "Monitor error budgets and SLOs in production",
        "Hot-patch any critical production issues",
        "Post-deployment retrospective",
        "Update documentation and onboarding guide",
      ],
    },
  ];

  const totalWeeks = phases.reduce((sum, p) => sum + p.weeks, 0);

  const deploymentReadiness =
    hasCI && hasTests && hasDockerfile
      ? "High — CI/CD pipeline, tests, and containerisation all detected"
      : hasCI && hasTests
      ? "Medium-High — CI and tests present; consider adding containerisation"
      : hasCI
      ? "Medium — CI pipeline detected; add automated tests to increase confidence"
      : "Low — No CI or test infrastructure detected; establish these before deploying";

  const projectType = isMonorepo
    ? "Monorepo"
    : has(treePaths, "Dockerfile")
    ? "Containerised Application"
    : repo.framework.includes("Next") || repo.framework.includes("Nuxt") || repo.framework.includes("React")
    ? "Frontend Application"
    : repo.framework.includes("Express") || repo.framework.includes("Django") || repo.framework.includes("Rails")
    ? "Backend Service"
    : "Library / Package";

  const summary = `${repo.name} is a ${projectType.toLowerCase()} with ${complexity >= 65 ? "high" : complexity >= 40 ? "medium" : "low"} complexity. The estimated delivery timeline is ${totalWeeks} weeks across ${phases.length} phases, from discovery through to production deployment.`;

  return { phases, totalWeeks, deploymentReadiness, projectType, summary };
}

// ── ARCHITECTURE VISUALIZATION ────────────────────────────────────────────────

export function buildArchViz(ctx: RawContext) {
  const { repo, treePaths } = ctx;
  const nodes: { id: string; label: string; layer: string; type: string; description: string; files: string[] }[] = [];
  const connections: { from: string; to: string; label: string }[] = [];
  const detectedLayers = new Set<string>();

  function addNode(id: string, label: string, layer: string, type: string, desc: string, files: string[]) {
    nodes.push({ id, label, layer, type, description: desc, files });
    detectedLayers.add(layer);
  }

  // Config layer — always present
  const configFiles = treePaths.filter((p) =>
    ["tsconfig.json", "package.json", ".eslintrc", "vite.config", "next.config", "turbo.json",
     "docker-compose", "Dockerfile", ".env", "Makefile", "Cargo.toml", "go.mod"].some((k) => p.includes(k))
  ).slice(0, 5);
  addNode("config", "Configuration", "config", "config", "Build tools, environment, and project configuration files", configFiles);

  // CI layer
  if (has(treePaths, ".github/workflows", ".circleci", ".travis.yml")) {
    addNode("ci", "CI / CD Pipeline", "config", "ci", "Automated build, test, and deployment workflows", [".github/workflows"]);
    connections.push({ from: "config", to: "ci", label: "triggers" });
  }

  // Frontend layer
  const frontendDirs = treePaths.filter((p) =>
    ["src/", "app/", "pages/", "components/", "views/", "ui/", "client/", "frontend/", "web/"].some((k) => p.startsWith(k) || p.includes(k))
  );
  if (frontendDirs.length > 0) {
    addNode("frontend", "Frontend / UI", "frontend", "ui", `${repo.framework} user interface layer`, frontendDirs.slice(0, 4));
    if (has(treePaths, "components/", "src/components")) {
      addNode("components", "UI Components", "frontend", "components", "Reusable presentational components", ["components/"]);
      connections.push({ from: "frontend", to: "components", label: "renders" });
    }
    if (has(treePaths, "pages/", "src/pages", "app/")) {
      addNode("pages", "Pages / Routes", "frontend", "routes", "Top-level route handlers and page layouts", ["pages/"]);
      connections.push({ from: "frontend", to: "pages", label: "routes to" });
    }
  }

  // Backend / API layer
  const backendDirs = treePaths.filter((p) =>
    ["server/", "api/", "routes/", "handlers/", "controllers/", "backend/", "src/server", "src/api"].some((k) => p.includes(k))
  );
  if (backendDirs.length > 0) {
    addNode("backend", "Backend / API", "backend", "server", "Server-side business logic and route handlers", backendDirs.slice(0, 4));
    if (has(frontendDirs, "frontend")) {
      connections.push({ from: "frontend", to: "backend", label: "HTTP requests" });
    }
  } else if (has(treePaths, "src/", "lib/") && !frontendDirs.length) {
    addNode("backend", "Core Library", "backend", "library", "Core business logic and exported functions", ["src/", "lib/"]);
  }

  // Services layer
  if (has(treePaths, "services/", "workers/", "jobs/", "queue/", "cron/")) {
    const svcFiles = treePaths.filter((p) => ["services/", "workers/", "jobs/"].some((k) => p.includes(k))).slice(0, 3);
    addNode("services", "Background Services", "services", "worker", "Async workers, cron jobs, and background processors", svcFiles);
    connections.push({ from: "backend", to: "services", label: "dispatches to" });
  }

  // Shared / Utilities
  const sharedDirs = treePaths.filter((p) =>
    ["lib/", "shared/", "common/", "utils/", "helpers/", "core/"].some((k) => p.startsWith(k) || p.includes(`/${k}`))
  );
  if (sharedDirs.length > 0) {
    addNode("shared", "Shared Utilities", "shared", "utilities", "Cross-cutting helpers, types, and utilities", sharedDirs.slice(0, 4));
    if (nodes.find((n) => n.id === "frontend"))
      connections.push({ from: "frontend", to: "shared", label: "imports" });
    if (nodes.find((n) => n.id === "backend"))
      connections.push({ from: "backend", to: "shared", label: "imports" });
  }

  // Database layer
  if (has(treePaths, "db/", "database/", "models/", "migrations/", "schema/", "prisma/", "drizzle/")) {
    const dbFiles = treePaths.filter((p) => ["db/", "models/", "migrations/", "prisma/", "schema/"].some((k) => p.includes(k))).slice(0, 3);
    addNode("database", "Data Layer", "database", "database", "Database schemas, migrations, and ORM models", dbFiles);
    if (nodes.find((n) => n.id === "backend"))
      connections.push({ from: "backend", to: "database", label: "queries" });
    if (nodes.find((n) => n.id === "services"))
      connections.push({ from: "services", to: "database", label: "reads/writes" });
  }

  // Testing layer
  if (has(treePaths, "test/", "tests/", "__tests__/", "spec/", "e2e/")) {
    const testFiles = treePaths.filter((p) => ["test/", "tests/", "__tests__/", "spec/", "e2e/"].some((k) => p.includes(k))).slice(0, 3);
    addNode("testing", "Test Suite", "testing", "tests", "Unit, integration, and end-to-end tests", testFiles);
    nodes.forEach((n) => {
      if (n.id !== "testing" && n.id !== "config" && n.id !== "ci") {
        connections.push({ from: "testing", to: n.id, label: "tests" });
      }
    });
  }

  // Packages layer (monorepo)
  if (has(treePaths, "packages/")) {
    const pkgFiles = treePaths.filter((p) => p.startsWith("packages/") && p.split("/").length === 2).slice(0, 4);
    addNode("packages", "Monorepo Packages", "shared", "monorepo", "Internal workspace packages shared across apps", pkgFiles);
  }

  // Ensure at least something exists for the main layer
  if (!nodes.find((n) => n.layer === "frontend") && !nodes.find((n) => n.layer === "backend")) {
    addNode("core", `${repo.name} Core`, "backend", "library", `Core ${repo.language} library`, ["src/", "lib/"]);
  }

  const projectType =
    detectedLayers.has("frontend") && detectedLayers.has("backend") ? "Full-Stack Application"
    : detectedLayers.has("frontend") ? "Frontend Application"
    : detectedLayers.has("database") ? "Backend Service"
    : has(treePaths, "packages/", "pnpm-workspace.yaml") ? "Monorepo"
    : "Library / Package";

  return {
    nodes,
    connections: connections.slice(0, 20),
    projectType,
    layers: Array.from(detectedLayers),
  };
}

// ── ONBOARDING GUIDE ─────────────────────────────────────────────────────────

export function buildOnboarding(ctx: RawContext) {
  const { repo, architecture, treePaths } = ctx;

  const hasPnpm = has(treePaths, "pnpm-lock.yaml", "pnpm-workspace.yaml");
  const hasYarn = has(treePaths, "yarn.lock");
  const hasBun = has(treePaths, "bun.lockb");
  const hasCargo = has(treePaths, "Cargo.toml");
  const hasGoMod = has(treePaths, "go.mod");
  const hasPyproject = has(treePaths, "pyproject.toml");
  const hasGemfile = has(treePaths, "Gemfile");
  const hasDockerfile = has(treePaths, "Dockerfile", "docker-compose.yml");

  const packageManager = hasPnpm ? "pnpm" : hasYarn ? "yarn" : hasBun ? "bun" : hasCargo ? "cargo" : hasGoMod ? "go" : hasPyproject ? "pip" : hasGemfile ? "bundle" : "npm";

  const installCmd =
    hasCargo ? "cargo build" :
    hasGoMod ? "go mod download" :
    hasPyproject ? "pip install -e .[dev]" :
    hasGemfile ? "bundle install" :
    `${packageManager} install`;

  const devCmd =
    hasCargo ? "cargo run" :
    hasGoMod ? "go run ." :
    hasPyproject ? "python -m uvicorn main:app --reload" :
    hasGemfile ? "bundle exec rails server" :
    `${packageManager} run dev`;

  const testCmd =
    hasCargo ? "cargo test" :
    hasGoMod ? "go test ./..." :
    hasPyproject ? "pytest" :
    hasGemfile ? "bundle exec rspec" :
    `${packageManager} test`;

  const setupSteps = [
    {
      step: 1,
      title: "Clone the repository",
      command: `git clone ${repo.url}.git && cd ${repo.name}`,
      description: `Clone ${repo.owner}/${repo.name} from GitHub and navigate into the project directory.`,
    },
    ...(hasDockerfile ? [{
      step: 2,
      title: "Start with Docker (recommended)",
      command: "docker compose up --build",
      description: "Use Docker Compose to spin up all required services with a single command. This is the fastest path to a working environment.",
    }] : [{
      step: 2,
      title: "Install dependencies",
      command: installCmd,
      description: `Install all ${repo.language} dependencies using ${packageManager}. This may take a few minutes on first run.`,
    }]),
    {
      step: 3,
      title: "Configure environment",
      command: has(treePaths, ".env.example") ? "cp .env.example .env" : "touch .env",
      description: has(treePaths, ".env.example")
        ? "Copy the example environment file and fill in the required values. Check the README for required variables."
        : "Create a local .env file. Check the README for required environment variables and their expected values.",
    },
    {
      step: 4,
      title: "Run the test suite",
      command: testCmd,
      description: "Run the full test suite to confirm your environment is correctly set up before making any changes.",
    },
    {
      step: 5,
      title: "Start the development server",
      command: devCmd,
      description: `Launch the development server. The app will be available locally and will hot-reload on file changes.`,
    },
  ];

  // First files to read
  const firstFiles: string[] = [];
  if (has(treePaths, "README.md")) firstFiles.push("README.md — Start here: project overview, setup, and usage");
  if (has(treePaths, "CONTRIBUTING.md", "contributing.md")) firstFiles.push("CONTRIBUTING.md — Contribution guidelines, branching strategy, and PR process");
  if (has(treePaths, "ARCHITECTURE.md", "docs/architecture")) firstFiles.push("ARCHITECTURE.md — High-level design decisions and system design");
  architecture.keyFiles.slice(0, 4).forEach((kf) => {
    if (!firstFiles.some((f) => f.includes(kf.split(" —")[0]))) {
      firstFiles.push(kf);
    }
  });
  if (has(treePaths, "package.json")) firstFiles.push("package.json — Available npm scripts, dependencies, and project metadata");
  if (hasCargo) firstFiles.push("Cargo.toml — Crate metadata and Rust dependencies");
  if (hasGoMod) firstFiles.push("go.mod — Go module name and dependency graph");

  // Beginner issues
  const beginnerIssues = [
    {
      title: `Add ${repo.name} usage examples to the README`,
      difficulty: "beginner" as const,
      area: "Documentation",
      description: "The README would benefit from more concrete code examples showing real-world usage patterns. This is a great first contribution.",
    },
    {
      title: "Fix typos and grammar in documentation files",
      difficulty: "beginner" as const,
      area: "Documentation",
      description: "Scan markdown files for typos, broken links, or outdated version references and submit a clean-up PR.",
    },
    {
      title: `Write tests for edge cases in core ${repo.language} utilities`,
      difficulty: "intermediate" as const,
      area: "Testing",
      description: "Identify utility functions with low test coverage and add tests for boundary conditions and error paths.",
    },
    {
      title: "Add JSDoc / TSDoc comments to exported public APIs",
      difficulty: "intermediate" as const,
      area: "Documentation",
      description: `Improve IDE intellisense and auto-generated docs by adding parameter and return type descriptions to the ${repo.language} public API surface.`,
    },
    {
      title: "Improve error messages to include suggested fixes",
      difficulty: "intermediate" as const,
      area: "Developer Experience",
      description: "Find error throws that give only a code or terse message and expand them with context about what went wrong and how to fix it.",
    },
  ];

  const localDevSteps = [
    `Run \`${installCmd}\` after every \`git pull\` to keep dependencies in sync`,
    "Use feature branches: \`git checkout -b feat/your-feature-name\`",
    "Run tests before each commit: \`${testCmd}\`",
    has(treePaths, ".eslintrc", "eslint.config") ? `Lint your code: \`${packageManager} run lint\`` : "Enable editor formatting and follow the existing code style",
    "Open a draft PR early to get feedback before the implementation is finalised",
    has(treePaths, ".github/PULL_REQUEST_TEMPLATE") ? "Fill out the PR template completely — reviewers will check it" : "Describe the motivation and approach clearly in your PR description",
  ];

  const estimatedSetupMinutes = hasDockerfile ? 10 : hasCargo || hasPyproject ? 20 : 12;

  return {
    setupSteps,
    firstFilesToRead: firstFiles.slice(0, 8),
    beginnerIssues,
    architectureOverview: repo.architectureSummary,
    localDevSteps,
    packageManager,
    estimatedSetupMinutes,
  };
}
