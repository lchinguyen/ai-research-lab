import { useParams } from "wouter";
import { motion } from "framer-motion";
import { useGetTimeline } from "@workspace/api-client-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Circle, Clock, Rocket, CalendarDays, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_CONFIG = {
  "complete": { icon: CheckCircle2, color: "text-green-400", bg: "bg-green-400", border: "border-green-400/40", badge: "bg-green-500/15 text-green-400 border-green-500/30" },
  "in-progress": { icon: Clock, color: "text-primary", bg: "bg-primary", border: "border-primary/40", badge: "bg-primary/15 text-primary border-primary/30" },
  "upcoming": { icon: Circle, color: "text-muted-foreground", bg: "bg-border", border: "border-border/60", badge: "bg-accent text-muted-foreground border-border/40" },
};

export default function TimelinePage() {
  const params = useParams<{ repoId: string }>();
  const { data, isLoading } = useGetTimeline(params.repoId, {
    query: { enabled: !!params.repoId },
  });

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-foreground">Engineering Timeline</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Phased implementation roadmap based on repository complexity</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 rounded-xl" />
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        ) : data ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {/* Summary strip */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: CalendarDays, label: "Total Duration", value: `${data.totalWeeks} weeks`, color: "text-primary" },
                { icon: Layers, label: "Project Type", value: data.projectType, color: "text-cyan-400" },
                { icon: Rocket, label: "Deployment Readiness", value: data.deploymentReadiness.split(" —")[0], color: "text-green-400" },
              ].map((item) => (
                <div key={item.label} className="p-4 rounded-xl border border-border/60 bg-card/60">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <item.icon className={cn("w-3.5 h-3.5", item.color)} />
                    <span className="text-[11px] text-muted-foreground">{item.label}</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground leading-tight">{item.value}</p>
                </div>
              ))}
            </div>

            {/* Summary text */}
            <div className="p-4 rounded-xl border border-border/60 bg-card/60">
              <p className="text-sm text-muted-foreground leading-relaxed">{data.summary}</p>
            </div>

            {/* Deployment readiness full */}
            <div className="px-4 py-3 rounded-xl border border-primary/20 bg-primary/5 text-xs text-primary">
              <span className="font-semibold">Deployment Readiness: </span>{data.deploymentReadiness}
            </div>

            {/* Timeline phases */}
            <div className="relative">
              {/* Vertical connector line */}
              <div className="absolute left-[23px] top-6 bottom-6 w-0.5 bg-border/50 z-0" />

              <div className="space-y-3">
                {data.phases.map((phase, i) => {
                  const cfg = STATUS_CONFIG[phase.status];
                  const Icon = cfg.icon;
                  return (
                    <motion.div
                      key={phase.phaseNumber}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08, duration: 0.25 }}
                      className="flex gap-4 relative z-10"
                    >
                      {/* Timeline dot */}
                      <div className="flex-shrink-0 mt-4">
                        <div className={cn("w-12 h-12 rounded-full border-2 flex items-center justify-center", cfg.border,
                          phase.status === "in-progress" ? "bg-primary/10" : "bg-background"
                        )}>
                          <Icon className={cn("w-5 h-5", cfg.color)} />
                        </div>
                      </div>

                      {/* Phase card */}
                      <div className={cn(
                        "flex-1 p-4 rounded-xl border bg-card/60",
                        phase.status === "in-progress" ? "border-primary/30" : "border-border/60"
                      )}>
                        <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                          <div>
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-xs text-muted-foreground">Phase {phase.phaseNumber}</span>
                              <span className={cn("text-[10px] px-2 py-0.5 rounded border capitalize", cfg.badge)}>
                                {phase.status.replace("-", " ")}
                              </span>
                            </div>
                            <h3 className="text-sm font-semibold text-foreground">{phase.phase}</h3>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-lg font-bold text-foreground">{phase.weeks}w</p>
                            <p className="text-[11px] text-muted-foreground">{phase.weeks === 1 ? "1 week" : `${phase.weeks} weeks`}</p>
                          </div>
                        </div>

                        <p className="text-xs text-primary mb-3 font-medium">
                          Milestone: {phase.milestone}
                        </p>

                        <ul className="space-y-1.5">
                          {phase.tasks.map((task, ti) => (
                            <li key={ti} className="flex items-start gap-2 text-xs text-muted-foreground">
                              <span className="w-1.5 h-1.5 rounded-full bg-border mt-1.5 flex-shrink-0" />
                              {task}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="text-center py-20 text-sm text-muted-foreground">Run an analysis first to see the engineering timeline.</div>
        )}
      </div>
    </DashboardLayout>
  );
}
