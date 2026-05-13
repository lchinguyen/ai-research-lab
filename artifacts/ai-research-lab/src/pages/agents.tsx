import { useParams } from "wouter";
import { motion } from "framer-motion";
import { useGetAgents, getGetAgentsQueryKey } from "@workspace/api-client-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Search, Building2, Code2, AlertCircle, Wrench, GitPullRequest,
  CheckCircle2, Clock, Loader2, ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const AGENT_META: Record<string, { icon: typeof Search; color: string }> = {
  "research-lead": { icon: Search, color: "text-violet-400" },
  "architecture": { icon: Building2, color: "text-blue-400" },
  "code-review": { icon: Code2, color: "text-cyan-400" },
  "issue-triage": { icon: AlertCircle, color: "text-orange-400" },
  "fix-engineer": { icon: Wrench, color: "text-green-400" },
  "pr-writer": { icon: GitPullRequest, color: "text-pink-400" },
};

const RISK_COLORS: Record<string, string> = {
  low: "bg-green-500/15 text-green-400 border-green-500/30",
  medium: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  high: "bg-red-500/15 text-red-400 border-red-500/30",
};

const STATUS_ICON = {
  complete: <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />,
  running: <Loader2 className="w-3.5 h-3.5 text-yellow-400 animate-spin" />,
  pending: <Clock className="w-3.5 h-3.5 text-muted-foreground" />,
};

export default function Agents() {
  const params = useParams<{ repoId: string }>();
  const repoId = params.repoId;
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: agents, isLoading } = useGetAgents(repoId, {
    query: { enabled: !!repoId, queryKey: getGetAgentsQueryKey(repoId) },
  });

  return (
    <DashboardLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-foreground">AI Agent Workspace</h1>
          <p className="text-sm text-muted-foreground mt-0.5">6 specialized engineering agents analyzing your repository</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-xl" />
            ))}
          </div>
        ) : agents ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {agents.map((agent, i) => {
              const meta = AGENT_META[agent.agentType] ?? { icon: Search, color: "text-primary" };
              const Icon = meta.icon;
              const isOpen = expanded === agent.agentType;

              return (
                <motion.div
                  key={agent.agentType}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.25 }}
                  data-testid={`card-agent-${agent.agentType}`}
                  className="rounded-xl border border-border/60 bg-card/60 overflow-hidden"
                >
                  {/* Header */}
                  <button
                    className="w-full text-left p-4 hover:bg-accent/30 transition-colors"
                    onClick={() => setExpanded(isOpen ? null : agent.agentType)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                          <Icon className={cn("w-4 h-4", meta.color)} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">{agent.agentName}</p>
                            <div className="flex items-center gap-1">
                              {STATUS_ICON[agent.status]}
                              <span className="text-[11px] text-muted-foreground capitalize">{agent.status}</span>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 pr-4">{agent.summary}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                        {agent.riskLevel && (
                          <Badge className={cn("text-[10px] border capitalize", RISK_COLORS[agent.riskLevel])}>
                            {agent.riskLevel} risk
                          </Badge>
                        )}
                        <ChevronRight className={cn("w-4 h-4 text-muted-foreground transition-transform", isOpen && "rotate-90")} />
                      </div>
                    </div>
                  </button>

                  {/* Expanded content */}
                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-border/60 px-4 pb-4 pt-3 space-y-3"
                    >
                      <div>
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Findings</p>
                        <ul className="space-y-1.5">
                          {agent.findings.map((f, fi) => (
                            <li key={fi} className="flex items-start gap-2 text-xs text-foreground/80">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                              {f}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Recommendations</p>
                        <ul className="space-y-1.5">
                          {agent.recommendations.map((r, ri) => (
                            <li key={ri} className="flex items-start gap-2 text-xs text-foreground/80">
                              <ChevronRight className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
                              {r}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 text-sm text-muted-foreground">No agent data available.</div>
        )}
      </div>
    </DashboardLayout>
  );
}
