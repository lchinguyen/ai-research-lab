import type { Repository, AgentOutput, ArchitectureMap, Issue, PrSummary } from "@workspace/api-zod";

function parseGitHubUrl(url: string): { owner: string; name: string } {
  try {
    const clean = url.replace(/\.git$/, "").replace(/\/$/, "");
    const match = clean.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (match) return { owner: match[1], name: match[2] };
  } catch {}
  return { owner: "unknown", name: "repository" };
}

function repoId(url: string): string {
  const { owner, name } = parseGitHubUrl(url);
  return `${owner}-${name}`.toLowerCase().replace(/[^a-z0-9-]/g, "-");
}

function detectLanguage(name: string): { language: string; framework: string } {
  const n = name.toLowerCase();
  if (n.includes("next") || n.includes("react")) return { language: "TypeScript", framework: "Next.js / React" };
  if (n.includes("vue") || n.includes("nuxt")) return { language: "TypeScript", framework: "Vue / Nuxt" };
  if (n.includes("angular")) return { language: "TypeScript", framework: "Angular" };
  if (n.includes("django") || n.includes("python")) return { language: "Python", framework: "Django" };
  if (n.includes("rails") || n.includes("ruby")) return { language: "Ruby", framework: "Rails" };
  if (n.includes("express") || n.includes("node")) return { language: "JavaScript", framework: "Express.js" };
  if (n.includes("spring") || n.includes("java")) return { language: "Java", framework: "Spring Boot" };
  if (n.includes("rust")) return { language: "Rust", framework: "Axum / Tokio" };
  if (n.includes("go") || n.includes("gin")) return { language: "Go", framework: "Gin" };
  return { language: "TypeScript", framework: "Node.js" };
}

export function buildMockRepository(url: string): Repository {
  const { owner, name } = parseGitHubUrl(url);
  const { language, framework } = detectLanguage(name);
  const id = repoId(url);
  const stars = Math.floor(Math.random() * 80000) + 1200;
  const forks = Math.floor(stars * 0.15);

  return {
    id,
    url,
    name,
    owner,
    language,
    framework,
    stars,
    forks,
    purpose: `${name} is a production-grade open-source ${framework} project maintained by ${owner}. It provides a robust foundation for building scalable, high-performance applications with a rich ecosystem of plugins and community contributions. The codebase prioritizes developer experience, type safety, and modular architecture.`,
    architectureSummary: `The repository follows a layered monorepo architecture with clearly separated concerns. The core ${framework} runtime is isolated from plugin interfaces, utility libraries, and build tooling. Configuration-driven extension points allow downstream consumers to customise behavior without forking internals. Build outputs target multiple module formats (ESM, CJS) and ship with pre-generated type declarations.`,
    maintainabilityScore: Math.floor(Math.random() * 20) + 72,
    complexityScore: Math.floor(Math.random() * 25) + 48,
    analyzedAt: new Date().toISOString(),
  };
}

export function buildMockAgents(repoName: string): AgentOutput[] {
  return [
    {
      agentType: "research-lead",
      agentName: "Research Lead Agent",
      status: "complete",
      summary: `Completed comprehensive analysis of ${repoName}. The project demonstrates mature engineering practices with well-defined module boundaries and consistent coding conventions throughout the codebase.`,
      findings: [
        "Codebase spans 1,240+ source files across 34 packages",
        "Primary language is TypeScript with 94% type coverage",
        "Active contributor base with 180+ merged PRs in last 90 days",
        "Release cadence: major every 6 months, patches weekly",
        "Test infrastructure uses Vitest + Playwright with 87% branch coverage",
      ],
      recommendations: [
        "Consolidate duplicate utility functions across packages into shared lib",
        "Upgrade remaining CJS-only dependencies to ESM-compatible alternatives",
        "Add performance regression benchmarks to CI pipeline",
        "Document internal plugin API surface more thoroughly",
      ],
      riskLevel: "low",
    },
    {
      agentType: "architecture",
      agentName: "Architecture Agent",
      status: "complete",
      summary: `Architecture review complete. The project uses a well-structured layered design with clear separation between core runtime, plugin interfaces, and public APIs.`,
      findings: [
        "Monorepo managed with pnpm workspaces — 12 internal packages",
        "Core runtime is framework-agnostic with adapter pattern for integrations",
        "Circular dependency detected between packages/core and packages/config",
        "Plugin system uses a hook-based lifecycle with async composition support",
        "Build pipeline produces tree-shakeable ESM bundles with source maps",
      ],
      recommendations: [
        "Break the core/config circular dependency by extracting shared types to packages/types",
        "Add architectural decision records (ADRs) to document key design choices",
        "Introduce dependency injection container to improve testability of core services",
        "Consider extracting heavy regex-based parser to a WASM module for performance",
      ],
      riskLevel: "medium",
    },
    {
      agentType: "code-review",
      agentName: "Code Review Agent",
      status: "complete",
      summary: `Performed automated code review across all modules. Overall code quality is high, with a few patterns that warrant attention for maintainability and safety.`,
      findings: [
        "14 instances of unhandled Promise rejections in async route handlers",
        "3 files exceed 500 lines — candidates for decomposition",
        "Inconsistent error handling: some modules throw, others return error objects",
        "Several hot-path functions lack memoization despite pure computation",
        "2 deprecated Node.js APIs in use (Buffer() constructor, domain module)",
      ],
      recommendations: [
        "Adopt a unified Result<T, E> pattern for error handling across all modules",
        "Add eslint-plugin-no-floating-promises to catch unhandled async errors at CI time",
        "Memoize the schema compilation step — it's called on every request in some paths",
        "Replace deprecated Node.js APIs before next major Node.js LTS drop",
      ],
      riskLevel: "medium",
    },
    {
      agentType: "issue-triage",
      agentName: "Issue Triage Agent",
      status: "complete",
      summary: `Triaged 47 open issues from the GitHub issue tracker. Categorised by type, priority, and estimated effort. 8 issues are blocking minor releases.`,
      findings: [
        "8 high-priority bugs blocking the next patch release",
        "12 feature requests with community traction (50+ upvotes each)",
        "6 performance issues with reproducible benchmarks attached",
        "11 documentation gaps identified from repeated user questions",
        "10 issues are stale (no activity in 90+ days) — candidates for closure",
      ],
      recommendations: [
        "Address the 8 blocking bugs before cutting the next patch release",
        "Create a public roadmap issue for the top 12 feature requests",
        "Assign performance issues to the core team — they require deep runtime knowledge",
        "Auto-close stale issues after 30-day warning using a GitHub Action",
      ],
      riskLevel: "high",
    },
    {
      agentType: "fix-engineer",
      agentName: "Fix Engineer Agent",
      status: "complete",
      summary: `Generated fix proposals for the top 6 identified bugs. All fixes are scoped, non-breaking, and include test cases.`,
      findings: [
        "Memory leak in event emitter: listeners not removed on module teardown",
        "Race condition in concurrent cache writes under high load",
        "Off-by-one error in pagination logic for large result sets",
        "Type narrowing regression introduced in v3.2.1 for union types",
        "Config file watcher emitting duplicate events on macOS (FSEvents quirk)",
        "Incorrect MIME type detection for .mjs files in static server",
      ],
      recommendations: [
        "Fix memory leak with WeakRef-based listener registry (3-line change)",
        "Use a read-write lock (async-mutex) to serialise concurrent cache writes",
        "Add regression test for pagination edge cases before merging the off-by-one fix",
        "Revert the type narrowing change and redesign with a discriminated union approach",
      ],
      riskLevel: "medium",
    },
    {
      agentType: "pr-writer",
      agentName: "PR Writer Agent",
      status: "complete",
      summary: `Drafted pull request descriptions for the top 4 fixes. Each PR includes a clear problem statement, solution rationale, testing evidence, and reviewer checklist.`,
      findings: [
        "Fix: Memory leak in module teardown — uses WeakRef listener registry",
        "Fix: Race condition in CacheManager via async-mutex read-write lock",
        "Fix: Pagination off-by-one for edge case where total equals page size",
        "Revert: Type narrowing regression in v3.2.1, with redesigned discriminated union",
      ],
      recommendations: [
        "Merge the memory leak fix first — it has no dependencies and unblocks QA",
        "Request review from the concurrency specialist for the CacheManager fix",
        "Add the pagination fix to the regression test suite with property-based tests",
        "The type narrowing revert needs a design review before merge",
      ],
      riskLevel: "low",
    },
  ];
}

export function buildMockArchitecture(repoName: string): ArchitectureMap {
  return {
    folderTree: [
      {
        name: repoName,
        type: "directory",
        children: [
          {
            name: "packages",
            type: "directory",
            children: [
              {
                name: "core",
                type: "directory",
                children: [
                  { name: "src", type: "directory", children: [
                    { name: "index.ts", type: "file" },
                    { name: "runtime.ts", type: "file" },
                    { name: "config.ts", type: "file" },
                  ]},
                  { name: "package.json", type: "file" },
                ],
              },
              {
                name: "plugins",
                type: "directory",
                children: [
                  { name: "src", type: "directory", children: [
                    { name: "loader.ts", type: "file" },
                    { name: "registry.ts", type: "file" },
                  ]},
                ],
              },
              {
                name: "utils",
                type: "directory",
                children: [
                  { name: "src", type: "directory", children: [
                    { name: "logger.ts", type: "file" },
                    { name: "errors.ts", type: "file" },
                    { name: "types.ts", type: "file" },
                  ]},
                ],
              },
            ],
          },
          {
            name: "apps",
            type: "directory",
            children: [
              {
                name: "cli",
                type: "directory",
                children: [
                  { name: "src", type: "directory", children: [
                    { name: "commands", type: "directory", children: [
                      { name: "build.ts", type: "file" },
                      { name: "dev.ts", type: "file" },
                      { name: "test.ts", type: "file" },
                    ]},
                    { name: "index.ts", type: "file" },
                  ]},
                ],
              },
            ],
          },
          { name: "pnpm-workspace.yaml", type: "file" },
          { name: "package.json", type: "file" },
          { name: "tsconfig.json", type: "file" },
          { name: "turbo.json", type: "file" },
        ],
      },
    ],
    keyFiles: [
      "packages/core/src/index.ts — Main entry point and public API surface",
      "packages/core/src/runtime.ts — Core runtime engine and lifecycle management",
      "packages/plugins/src/registry.ts — Plugin discovery and registration logic",
      "packages/utils/src/errors.ts — Centralised error types and factory functions",
      "apps/cli/src/commands/build.ts — Production build command implementation",
      "pnpm-workspace.yaml — Monorepo package graph and catalog definitions",
      "turbo.json — Build pipeline task graph and caching configuration",
    ],
    dependencies: [
      { name: "typescript", version: "^5.4.0", purpose: "Static typing and compilation target for all packages" },
      { name: "vite", version: "^5.2.0", purpose: "Development server and production bundler" },
      { name: "vitest", version: "^1.5.0", purpose: "Unit and integration test runner with coverage" },
      { name: "turbo", version: "^1.13.0", purpose: "Monorepo task orchestration and remote caching" },
      { name: "esbuild", version: "^0.20.0", purpose: "High-performance JS/TS bundler for library builds" },
      { name: "zod", version: "^3.22.0", purpose: "Runtime schema validation and type inference" },
      { name: "pino", version: "^9.0.0", purpose: "Structured JSON logging for server-side code" },
      { name: "commander", version: "^12.0.0", purpose: "CLI argument parsing and command registration" },
    ],
    componentRelationships: [
      "CLI depends on Core runtime for all build/dev/test command implementations",
      "Core runtime imports Config resolver from packages/utils for environment handling",
      "Plugin registry is consumed by Core to dynamically load user-defined extensions",
      "All packages share the centralised error types from packages/utils/src/errors.ts",
      "The Dev server (in Core) wraps Vite's HMR server with custom middleware hooks",
    ],
    dataFlow: [
      "User config (vite.config.ts) is read and validated by Core at startup",
      "CLI command triggers Core.build() which resolves the plugin chain from the registry",
      "Each plugin in the chain receives the resolved config and returns transform hooks",
      "Transform hooks are composed in plugin registration order during the build pipeline",
      "Final bundle is emitted to the output directory; sourcemaps written alongside",
    ],
  };
}

export function buildMockIssues(repoName: string): Issue[] {
  return [
    {
      id: "issue-1",
      title: "Memory leak in event emitter — listeners not cleaned up on module teardown",
      priority: "critical",
      type: "bug",
      description: `When a module using the internal event emitter is hot-reloaded during development, the old listener references are not removed before the module instance is replaced. Over time this causes memory pressure and eventually crashes long-running dev servers.`,
      suggestedFix: `In the module teardown hook, call \`emitter.removeAllListeners()\` before the module is garbage collected. Consider using a WeakRef-based listener registry to make this automatic.`,
      affectedFiles: ["packages/core/src/runtime.ts", "packages/core/src/events.ts"],
    },
    {
      id: "issue-2",
      title: "Race condition in CacheManager under concurrent writes",
      priority: "high",
      type: "bug",
      description: `Under high concurrency (50+ simultaneous requests), the CacheManager's write path is not serialised. Two concurrent writers can both read a stale value, compute independently, and clobber each other's results. Observed in production with Redis-backed caches.`,
      suggestedFix: `Introduce a read-write lock using the \`async-mutex\` package. Writers acquire an exclusive lock; readers acquire a shared lock. This eliminates the race without blocking unrelated cache keys.`,
      affectedFiles: ["packages/core/src/cache.ts"],
    },
    {
      id: "issue-3",
      title: "Type narrowing regression for union types introduced in v3.2.1",
      priority: "high",
      type: "bug",
      description: `A refactor in v3.2.1 broke TypeScript's ability to narrow union types inside conditional branches. Downstream consumers using \`if (x.type === 'foo')\` patterns now get \`never\` instead of the narrowed type, causing widespread TS errors in user projects.`,
      suggestedFix: `Revert the type narrowing change and redesign using a discriminated union pattern. Add a regression test that asserts type narrowing works correctly for all documented union variants.`,
      affectedFiles: ["packages/core/src/types.ts", "packages/utils/src/types.ts"],
    },
    {
      id: "issue-4",
      title: "Config file watcher emitting duplicate events on macOS",
      priority: "medium",
      type: "bug",
      description: `On macOS, the FSEvents API can emit multiple change events for a single file save (especially when editors write atomically via rename). This causes the dev server to restart 2-3 times per save, significantly degrading developer experience.`,
      suggestedFix: `Add a 50ms debounce to the file watcher callback. Alternatively, deduplicate events by path within a 100ms window before triggering a reload.`,
      affectedFiles: ["packages/core/src/watcher.ts"],
    },
    {
      id: "issue-5",
      title: "Build performance degrades 40% on projects with 500+ modules",
      priority: "high",
      type: "performance",
      description: `Profiling shows the schema compilation step is called on every module resolution, even for modules whose schemas haven't changed. For large projects (500+ modules), this accounts for 40% of total build time.`,
      suggestedFix: `Cache compiled schemas keyed by file content hash. Only recompile when the hash changes. This should reduce schema compilation overhead from O(n) per build to O(changed) per build.`,
      affectedFiles: ["packages/core/src/schema.ts", "packages/core/src/build.ts"],
    },
    {
      id: "issue-6",
      title: "Incorrect MIME type for .mjs files in development static server",
      priority: "medium",
      type: "bug",
      description: `The built-in static file server serves \`.mjs\` files with \`Content-Type: application/octet-stream\` instead of \`application/javascript\`. Browsers refuse to execute ES modules unless they are served with the correct MIME type.`,
      suggestedFix: `Add \`.mjs\` to the MIME type registry in the static server configuration: \`{ '.mjs': 'application/javascript; charset=utf-8' }\`.`,
      affectedFiles: ["packages/core/src/server/static.ts"],
    },
    {
      id: "issue-7",
      title: "Add source map support to the production CLI build output",
      priority: "medium",
      type: "enhancement",
      description: `Production builds currently do not emit source maps. When users report errors from production bundles, the stack traces are unreadable. This significantly increases debugging time for production incidents.`,
      suggestedFix: `Add a \`--sourcemap\` flag to the CLI build command. When enabled, pass \`{ sourcemap: 'linked' }\` to the esbuild config. Default to \`false\` to keep bundle sizes minimal for users who don't need it.`,
      affectedFiles: ["apps/cli/src/commands/build.ts", "packages/core/src/build.ts"],
    },
    {
      id: "issue-8",
      title: "Document internal plugin API lifecycle hooks",
      priority: "low",
      type: "documentation",
      description: `The plugin API exposes 11 lifecycle hooks but only 4 are documented. Contributors frequently misuse \`transform\`, \`resolveId\`, and \`load\` hooks because the expected return shapes are undocumented. This leads to subtle bugs that are hard to diagnose.`,
      suggestedFix: `Add JSDoc comments to each hook interface in \`packages/plugins/src/types.ts\`. Include parameter descriptions, return type semantics, and one example per hook. Auto-generate API reference docs from JSDoc using typedoc.`,
      affectedFiles: ["packages/plugins/src/types.ts", "docs/plugin-api.md"],
    },
  ];
}

export function buildMockPrSummary(repoName: string): PrSummary {
  return {
    title: `fix(core): resolve memory leak, race condition, and type narrowing regression`,
    summary: `This PR addresses three critical issues identified during automated analysis of ${repoName}. It resolves a memory leak caused by orphaned event listeners during hot module replacement, fixes a race condition in the CacheManager under concurrent write load, and reverts a type narrowing regression introduced in v3.2.1 that broke discriminated union narrowing for downstream TypeScript consumers. All changes are non-breaking and include updated test coverage.`,
    implementationNotes: [
      "Memory leak fix: Added WeakRef-based listener registry in packages/core/src/events.ts. The module teardown hook now calls emitter.removeAllListeners() via the registry before the module is replaced.",
      "Race condition fix: Introduced async-mutex read-write lock in CacheManager. Writers acquire an exclusive write lock; readers acquire a shared read lock. Unrelated cache keys remain unaffected.",
      "Type narrowing revert: Reverted the breaking change from v3.2.1 and redesigned the affected types using a discriminated union pattern. The new design is backward compatible and correctly narrows in all documented use cases.",
      "Added 50ms debounce to the FSEvents file watcher to eliminate duplicate reload events on macOS (bonus fix bundled in this PR).",
    ],
    testingChecklist: [
      "Unit tests for WeakRef listener registry cleanup on module teardown",
      "Concurrency test for CacheManager: 100 simultaneous writers, assert no stale reads",
      "TypeScript compilation test asserting union narrowing works for all variant types",
      "Integration test: dev server hot reload cycle — assert memory does not grow over 20 iterations",
      "Regression test: file watcher emits exactly 1 reload event per save on macOS",
      "Run full test suite: pnpm test --coverage, assert coverage stays above 87%",
      "Manual smoke test: create a new project, run dev and build commands end-to-end",
    ],
    riskNotes: [
      "The type narrowing revert touches packages/core/src/types.ts which is imported by 34 other files — full typecheck is required before merge.",
      "The async-mutex dependency (v4.x) is new to this project — verify it is compatible with the existing ESM build pipeline.",
      "The memory leak fix changes the event emitter API internally — verify no public-facing event hook signatures were accidentally altered.",
      "The debounce change may mask rapid legitimate file changes in edge cases (e.g., batch file generation scripts) — document the 50ms threshold in the changelog.",
    ],
  };
}

const store = new Map<string, { repo: Repository; url: string }>();

export function getOrCreateRepo(url: string): Repository {
  const id = repoId(url);
  if (!store.has(id)) {
    const repo = buildMockRepository(url);
    store.set(id, { repo, url });
  }
  return store.get(id)!.repo;
}

export function getRepoById(id: string): Repository | null {
  return store.get(id)?.repo ?? null;
}

export { repoId };
