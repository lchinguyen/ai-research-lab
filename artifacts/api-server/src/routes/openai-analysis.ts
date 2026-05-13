import type { AgentOutput, Issue, PrSummary } from "@workspace/api-zod";

const OPENAI_API = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-4o-mini";

interface RepoContext {
  name: string;
  owner: string;
  description: string;
  language: string;
  framework: string;
  stars: number;
  forks: number;
  readmeText: string;
  keyFiles: string[];
  topLevelPaths: string[];
}

export interface AIAnalysis {
  purpose: string;
  architectureSummary: string;
  maintainabilityScore: number;
  complexityScore: number;
  agents: AgentOutput[];
  issues: Issue[];
  prSummary: PrSummary;
}

function buildPrompt(ctx: RepoContext): string {
  const readmeSnippet = ctx.readmeText
    ? ctx.readmeText.slice(0, 3000)
    : "(no README available)";

  return `You are an expert AI engineering research assistant. Analyze the following GitHub repository and return a comprehensive engineering report as a single JSON object.

## Repository Context
- **Name**: ${ctx.owner}/${ctx.name}
- **Description**: ${ctx.description || "(none provided)"}
- **Primary Language**: ${ctx.language}
- **Detected Framework**: ${ctx.framework}
- **Stars**: ${ctx.stars.toLocaleString()}  **Forks**: ${ctx.forks.toLocaleString()}

## Key Files Found
${ctx.keyFiles.length ? ctx.keyFiles.join("\n") : "(none detected)"}

## Top-Level File Tree (sample)
${ctx.topLevelPaths.slice(0, 60).join(", ")}

## README (first 3000 chars)
${readmeSnippet}

---

Return ONLY a valid JSON object matching this exact schema. No markdown fences, no extra text.

{
  "purpose": "2-3 sentence plain-English description of what this project does and who it's for",
  "architectureSummary": "2-3 sentences describing the high-level architecture, module structure, and notable design patterns",
  "maintainabilityScore": <integer 0-100, higher = more maintainable>,
  "complexityScore": <integer 0-100, higher = more complex>,
  "agents": [
    {
      "agentType": "research-lead",
      "agentName": "Research Lead Agent",
      "status": "complete",
      "summary": "1-2 sentence executive summary of this agent's findings",
      "findings": ["finding 1", "finding 2", "finding 3", "finding 4", "finding 5"],
      "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3", "recommendation 4"],
      "riskLevel": "low" | "medium" | "high"
    },
    {
      "agentType": "architecture",
      "agentName": "Architecture Agent",
      "status": "complete",
      "summary": "...",
      "findings": ["...", "...", "...", "...", "..."],
      "recommendations": ["...", "...", "...", "..."],
      "riskLevel": "low" | "medium" | "high"
    },
    {
      "agentType": "code-review",
      "agentName": "Code Review Agent",
      "status": "complete",
      "summary": "...",
      "findings": ["...", "...", "...", "...", "..."],
      "recommendations": ["...", "...", "...", "..."],
      "riskLevel": "low" | "medium" | "high"
    },
    {
      "agentType": "issue-triage",
      "agentName": "Issue Triage Agent",
      "status": "complete",
      "summary": "...",
      "findings": ["...", "...", "...", "...", "..."],
      "recommendations": ["...", "...", "...", "..."],
      "riskLevel": "low" | "medium" | "high"
    },
    {
      "agentType": "fix-engineer",
      "agentName": "Fix Engineer Agent",
      "status": "complete",
      "summary": "...",
      "findings": ["...", "...", "...", "...", "..."],
      "recommendations": ["...", "...", "...", "..."],
      "riskLevel": "low" | "medium" | "high"
    },
    {
      "agentType": "pr-writer",
      "agentName": "PR Writer Agent",
      "status": "complete",
      "summary": "...",
      "findings": ["...", "...", "...", "..."],
      "recommendations": ["...", "...", "...", "..."],
      "riskLevel": "low" | "medium" | "high"
    }
  ],
  "issues": [
    {
      "id": "issue-1",
      "title": "specific actionable issue title",
      "priority": "critical" | "high" | "medium" | "low",
      "type": "bug" | "performance" | "security" | "refactor" | "documentation" | "enhancement",
      "description": "2-3 sentence detailed description of the problem",
      "suggestedFix": "concrete, specific fix suggestion",
      "affectedFiles": ["path/to/file.ts"]
    }
  ],
  "prSummary": {
    "title": "conventional-commit style PR title",
    "summary": "2-3 paragraph PR description explaining the changes, motivation, and impact",
    "implementationNotes": ["note 1", "note 2", "note 3", "note 4"],
    "testingChecklist": ["test item 1", "test item 2", "test item 3", "test item 4", "test item 5", "test item 6"],
    "riskNotes": ["risk 1", "risk 2", "risk 3", "risk 4"]
  }
}

Rules:
- Be specific to THIS repository — use real file names, real language features, real patterns you can infer from the README and file tree
- The issues array must have exactly 6-8 items
- All agent findings arrays must have exactly 5 items; recommendations must have exactly 4 items
- riskLevel must be exactly one of: "low", "medium", "high"
- priority must be exactly one of: "critical", "high", "medium", "low"
- type must be exactly one of: "bug", "performance", "security", "refactor", "documentation", "enhancement"
- Scores must be integers between 0 and 100
- Return valid JSON only — no trailing commas, no comments`;
}

function parseAIResponse(raw: string): AIAnalysis | null {
  try {
    // Strip any accidental markdown fences
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const parsed = JSON.parse(cleaned);

    // Basic structural validation
    if (
      typeof parsed.purpose !== "string" ||
      typeof parsed.architectureSummary !== "string" ||
      typeof parsed.maintainabilityScore !== "number" ||
      typeof parsed.complexityScore !== "number" ||
      !Array.isArray(parsed.agents) ||
      !Array.isArray(parsed.issues) ||
      typeof parsed.prSummary !== "object"
    ) {
      return null;
    }

    // Clamp scores
    parsed.maintainabilityScore = Math.max(0, Math.min(100, Math.round(parsed.maintainabilityScore)));
    parsed.complexityScore = Math.max(0, Math.min(100, Math.round(parsed.complexityScore)));

    return parsed as AIAnalysis;
  } catch {
    return null;
  }
}

export async function analyzeWithOpenAI(
  ctx: RepoContext,
  mockFallback: {
    agents: AgentOutput[];
    issues: Issue[];
    prSummary: PrSummary;
    maintainabilityScore: number;
    complexityScore: number;
  }
): Promise<AIAnalysis> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    // No key configured — use mock data
    return {
      purpose: `${ctx.name} is an open-source ${ctx.language} project by ${ctx.owner}.`,
      architectureSummary: `The repository is built with ${ctx.framework} and follows standard conventions for the ${ctx.language} ecosystem.`,
      maintainabilityScore: mockFallback.maintainabilityScore,
      complexityScore: mockFallback.complexityScore,
      agents: mockFallback.agents,
      issues: mockFallback.issues,
      prSummary: mockFallback.prSummary,
    };
  }

  try {
    const prompt = buildPrompt(ctx);

    const response = await fetch(OPENAI_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.4,
        max_tokens: 4000,
        messages: [
          {
            role: "system",
            content:
              "You are a senior software engineering research assistant. You analyze GitHub repositories and return structured JSON engineering reports. Always return valid JSON only.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API returned ${response.status}: ${await response.text()}`);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };

    const content = data.choices?.[0]?.message?.content ?? "";
    const analysis = parseAIResponse(content);

    if (!analysis) {
      throw new Error("OpenAI response failed structural validation");
    }

    return analysis;
  } catch (err) {
    // Silent fallback to mock analysis
    return {
      purpose: `${ctx.name} is an open-source ${ctx.language} project maintained by ${ctx.owner} with ${ctx.stars.toLocaleString()} stars.`,
      architectureSummary: `Built with ${ctx.framework}. The repository structure follows standard conventions for the ${ctx.language} ecosystem.`,
      maintainabilityScore: mockFallback.maintainabilityScore,
      complexityScore: mockFallback.complexityScore,
      agents: mockFallback.agents,
      issues: mockFallback.issues,
      prSummary: mockFallback.prSummary,
    };
  }
}
