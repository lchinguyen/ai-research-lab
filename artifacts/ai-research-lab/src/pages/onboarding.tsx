import { useParams } from "wouter";
import { motion } from "framer-motion";
import { useGetOnboarding } from "@workspace/api-client-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { Copy } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const DIFFICULTY_STYLES = {
  beginner: "bg-green-500/15 text-green-400 border-green-500/30",
  intermediate: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
};

function CopyButton({ text }: { text: string }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: "Copied", description: "Command copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      onClick={copy}
      className="flex-shrink-0 p-1.5 rounded-md hover:bg-background/60 text-muted-foreground hover:text-foreground transition-colors"
      title="Copy command"
    >
      <Copy className={cn("w-3.5 h-3.5", copied && "text-green-400")} />
    </button>
  );
}

export default function OnboardingPage() {
  const params = useParams<{ repoId: string }>();
  const { data, isLoading } = useGetOnboarding(params.repoId, {
    query: { enabled: !!params.repoId },
  });

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-foreground">Contributor Onboarding Guide</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Everything a new contributor needs to get up and running</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
          </div>
        ) : data ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Package Manager", value: data.packageManager },
                { label: "Est. Setup Time", value: `~${data.estimatedSetupMinutes} min` },
                { label: "First Files", value: `${data.firstFilesToRead.length} recommended` },
              ].map((s) => (
                <div key={s.label} className="p-4 rounded-xl border border-border/60 bg-card/60 text-center">
                  <p className="text-[11px] text-muted-foreground mb-1">{s.label}</p>
                  <p className="text-sm font-semibold text-foreground">{s.value}</p>
                </div>
              ))}
            </div>

            {/* Setup steps */}
            <div className="p-5 rounded-xl border border-border/60 bg-card/60">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Setup Steps</h3>
              <div className="space-y-4">
                {data.setupSteps.map((step, i) => (
                  <motion.div
                    key={step.step}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.07 }}
                    className="flex gap-3"
                  >
                    <div className="w-7 h-7 rounded-full bg-primary/15 text-primary text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
                      {step.step}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground mb-1">{step.title}</p>
                      <div className="flex items-center gap-2 mb-1.5 bg-accent/40 border border-border/40 rounded-lg px-3 py-2">
                        <code className="text-xs font-mono text-primary flex-1 min-w-0 break-all">{step.command}</code>
                        <CopyButton text={step.command} />
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* First files to read */}
              <div className="p-5 rounded-xl border border-border/60 bg-card/60">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Start By Reading</h3>
                <ul className="space-y-2">
                  {data.firstFilesToRead.map((file, i) => {
                    const [path, ...desc] = file.split(" — ");
                    return (
                      <li key={i} className="flex flex-col gap-0.5">
                        <span className="text-xs font-mono text-primary font-medium">{path}</span>
                        {desc.length > 0 && <span className="text-[11px] text-muted-foreground">{desc.join(" — ")}</span>}
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Local dev tips */}
              <div className="p-5 rounded-xl border border-border/60 bg-card/60">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Local Dev Tips</h3>
                <ul className="space-y-2">
                  {data.localDevSteps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                      {step}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Architecture overview */}
            <div className="p-5 rounded-xl border border-border/60 bg-card/60">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Architecture Overview</h3>
              <p className="text-sm text-foreground leading-relaxed">{data.architectureOverview}</p>
            </div>

            {/* Beginner issues */}
            <div className="p-5 rounded-xl border border-border/60 bg-card/60">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Good First Issues</h3>
              <div className="space-y-3">
                {data.beginnerIssues.map((issue, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.06 }}
                    className="p-3 rounded-lg bg-accent/20 border border-border/30"
                  >
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-sm font-medium text-foreground">{issue.title}</p>
                      <span className={cn("text-[10px] px-2 py-0.5 rounded border capitalize", DIFFICULTY_STYLES[issue.difficulty])}>
                        {issue.difficulty}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded border border-border/40 text-muted-foreground bg-accent/30">
                        {issue.area}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{issue.description}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="text-center py-20 text-sm text-muted-foreground">Run an analysis first to see the onboarding guide.</div>
        )}
      </div>
    </DashboardLayout>
  );
}
