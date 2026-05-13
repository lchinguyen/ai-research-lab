import { useParams } from "wouter";
import { motion } from "framer-motion";
import { useGetRepository, getGetRepositoryQueryKey } from "@workspace/api-client-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  GitFork,
  Code2,
  Layers,
  Calendar,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Github,
} from "lucide-react";

function ScoreRing({ score, label, color }: { score: number; label: string; color: string }) {
  const radius = 32;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (score / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth="6" />
          <circle
            cx="40" cy="40" r={radius}
            fill="none" stroke={color} strokeWidth="6"
            strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold text-foreground">{score}</span>
        </div>
      </div>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

export default function Dashboard() {
  const params = useParams<{ repoId: string }>();
  const repoId = params.repoId;

  const { data: repo, isLoading } = useGetRepository(repoId, {
    query: { enabled: !!repoId, queryKey: getGetRepositoryQueryKey(repoId) },
  });

  return (
    <DashboardLayout>
      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-foreground">Repository Overview</h1>
          <p className="text-sm text-muted-foreground mt-0.5">AI-generated analysis and insights</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-28 w-full rounded-xl" />
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
            </div>
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        ) : repo ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {/* Repo identity card */}
            <div className="p-5 rounded-xl border border-border/60 bg-card/60">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                    <Github className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold text-foreground">{repo.name}</h2>
                      <Badge variant="secondary" className="text-xs font-normal">{repo.language}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{repo.owner}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5" data-testid="stat-stars">
                    <Star className="w-3.5 h-3.5 text-yellow-400" />
                    <span className="font-medium text-foreground">{repo.stars.toLocaleString()}</span>
                    <span className="text-xs">stars</span>
                  </div>
                  <div className="flex items-center gap-1.5" data-testid="stat-forks">
                    <GitFork className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="font-medium text-foreground">{repo.forks.toLocaleString()}</span>
                    <span className="text-xs">forks</span>
                  </div>
                  <div className="flex items-center gap-1.5" data-testid="stat-framework">
                    <Code2 className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{repo.framework}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Scores */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="col-span-1 p-5 rounded-xl border border-border/60 bg-card/60 flex items-center justify-around">
                <ScoreRing
                  score={repo.maintainabilityScore}
                  label="Maintainability"
                  color="hsl(250 89% 65%)"
                />
                <ScoreRing
                  score={100 - repo.complexityScore}
                  label="Simplicity"
                  color="hsl(180 72% 50%)"
                />
              </div>
              <div className="sm:col-span-2 grid grid-cols-2 gap-4">
                {[
                  {
                    icon: TrendingUp,
                    label: "Maintainability Score",
                    value: `${repo.maintainabilityScore}/100`,
                    desc: repo.maintainabilityScore >= 80 ? "Excellent" : repo.maintainabilityScore >= 60 ? "Good" : "Needs Work",
                    color: "text-green-400",
                  },
                  {
                    icon: repo.complexityScore >= 70 ? AlertTriangle : CheckCircle2,
                    label: "Complexity Score",
                    value: `${repo.complexityScore}/100`,
                    desc: repo.complexityScore >= 70 ? "High complexity" : "Manageable",
                    color: repo.complexityScore >= 70 ? "text-yellow-400" : "text-green-400",
                  },
                  {
                    icon: Layers,
                    label: "Framework",
                    value: repo.framework,
                    desc: repo.language,
                    color: "text-primary",
                  },
                  {
                    icon: Calendar,
                    label: "Analyzed",
                    value: new Date(repo.analyzedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
                    desc: new Date(repo.analyzedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
                    color: "text-muted-foreground",
                  },
                ].map((item) => (
                  <div key={item.label} className="p-4 rounded-xl border border-border/60 bg-card/60">
                    <div className="flex items-center gap-2 mb-2">
                      <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
                      <span className="text-xs text-muted-foreground">{item.label}</span>
                    </div>
                    <p className="text-sm font-semibold text-foreground">{item.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Purpose */}
            <div className="p-5 rounded-xl border border-border/60 bg-card/60">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Project Purpose</h3>
              <p className="text-sm text-foreground leading-relaxed" data-testid="text-purpose">{repo.purpose}</p>
            </div>

            {/* Architecture Summary */}
            <div className="p-5 rounded-xl border border-border/60 bg-card/60">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Architecture Summary</h3>
              <p className="text-sm text-foreground leading-relaxed" data-testid="text-arch-summary">{repo.architectureSummary}</p>
            </div>
          </motion.div>
        ) : (
          <div className="text-center py-20 text-muted-foreground text-sm">Repository not found.</div>
        )}
      </div>
    </DashboardLayout>
  );
}
