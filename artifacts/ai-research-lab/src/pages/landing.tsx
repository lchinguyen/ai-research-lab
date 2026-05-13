import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useAnalyzeRepository } from "@workspace/api-client-react";
import { Cpu, ArrowRight, Github, Zap, Shield, GitBranch, CheckCircle2 } from "lucide-react";

const ANALYSIS_STEPS = [
  "Cloning repository...",
  "Analyzing architecture...",
  "Running AI agents...",
  "Generating insights...",
  "Finalizing report...",
];

const FEATURES = [
  { icon: Zap, label: "6 Specialized AI Agents", desc: "Research Lead, Architecture, Code Review, and more" },
  { icon: GitBranch, label: "Architecture Mapping", desc: "Visual folder trees, dependency graphs, and data flow" },
  { icon: Shield, label: "Issue Generator", desc: "GitHub-style issues with priorities, types, and fix suggestions" },
  { icon: Github, label: "PR Writer", desc: "Complete pull request summaries with testing checklists" },
];

export default function Landing() {
  const [url, setUrl] = useState("");
  const [, setLocation] = useLocation();
  const [stepIdx, setStepIdx] = useState(0);
  const [error, setError] = useState("");

  const analyze = useAnalyzeRepository();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) {
      setError("Please enter a GitHub repository URL");
      return;
    }
    setError("");

    let step = 0;
    setStepIdx(0);
    const interval = setInterval(() => {
      step++;
      if (step < ANALYSIS_STEPS.length) {
        setStepIdx(step);
      } else {
        clearInterval(interval);
      }
    }, 700);

    analyze.mutate(
      { data: { url: url.trim() } },
      {
        onSuccess: (repo) => {
          clearInterval(interval);
          setTimeout(() => setLocation(`/dashboard/${repo.id}`), 400);
        },
        onError: () => {
          clearInterval(interval);
          setStepIdx(0);
          setError("Failed to analyze repository. Please check the URL and try again.");
        },
      }
    );
  }

  const isLoading = analyze.isPending;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/40 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <Cpu className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sm text-foreground">AI Research Lab</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground px-2.5 py-1 rounded-full border border-border/60 bg-accent/30">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              6 Agents Ready
            </span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-2xl text-center"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 text-xs font-medium text-primary bg-primary/10 border border-primary/20 rounded-full px-3 py-1 mb-6">
            <Zap className="w-3 h-3" />
            Powered by AI Engineering Agents
          </div>

          {/* Title */}
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight mb-4 leading-tight">
            AI Research Lab
          </h1>
          <p className="text-lg text-muted-foreground mb-10 leading-relaxed max-w-xl mx-auto">
            An AI engineering agent for understanding and improving GitHub repositories.
          </p>

          {/* Input form */}
          <form onSubmit={handleSubmit} className="w-full mb-3">
            <div className="flex gap-2 p-1.5 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm shadow-lg">
              <div className="flex items-center gap-2 flex-1 px-3">
                <Github className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <input
                  data-testid="input-repo-url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://github.com/vercel/next.js"
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none py-2"
                  disabled={isLoading}
                />
              </div>
              <button
                data-testid="button-analyze"
                type="submit"
                disabled={isLoading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 active:opacity-80 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {isLoading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    Analyze Repository
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-xs text-destructive mb-3"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Loading steps */}
          <AnimatePresence>
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-2 mt-4"
              >
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  <span className="text-primary font-medium">{ANALYSIS_STEPS[stepIdx]}</span>
                </div>
                <div className="flex gap-1 mt-1">
                  {ANALYSIS_STEPS.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 rounded-full transition-all duration-500 ${
                        i <= stepIdx ? "w-6 bg-primary" : "w-2 bg-border"
                      }`}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Example repos */}
          {!isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-2 flex-wrap justify-center mt-4"
            >
              <span className="text-xs text-muted-foreground/60">Try:</span>
              {["vercel/next.js", "facebook/react", "microsoft/typescript"].map((repo) => (
                <button
                  key={repo}
                  type="button"
                  onClick={() => setUrl(`https://github.com/${repo}`)}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors px-2 py-1 rounded-md hover:bg-accent/50"
                >
                  {repo}
                </button>
              ))}
            </motion.div>
          )}
        </motion.div>

        {/* Features grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="w-full max-w-3xl mt-16 grid grid-cols-2 sm:grid-cols-4 gap-3"
        >
          {FEATURES.map((f) => (
            <div key={f.label} className="flex flex-col gap-2 p-4 rounded-xl border border-border/40 bg-card/40 hover:border-primary/30 hover:bg-card/60 transition-all duration-200">
              <f.icon className="w-4 h-4 text-primary" />
              <p className="text-xs font-semibold text-foreground leading-tight">{f.label}</p>
              <p className="text-[11px] text-muted-foreground leading-tight">{f.desc}</p>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-xs text-muted-foreground/50">
          <span>AI Research Lab</span>
          <span>Demo — mock data only</span>
        </div>
      </footer>
    </div>
  );
}
