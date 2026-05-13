import { useParams } from "wouter";
import { motion } from "framer-motion";
import { useGetDependencyRisk } from "@workspace/api-client-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, ShieldCheck, ShieldX, Package, AlertTriangle, CheckCircle2, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

const RISK_STYLES = {
  low: { badge: "bg-green-500/15 text-green-400 border-green-500/30", icon: ShieldCheck, dot: "bg-green-400" },
  medium: { badge: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30", icon: ShieldAlert, dot: "bg-yellow-400" },
  high: { badge: "bg-orange-500/15 text-orange-400 border-orange-500/30", icon: ShieldAlert, dot: "bg-orange-400" },
  critical: { badge: "bg-red-500/15 text-red-400 border-red-500/30", icon: ShieldX, dot: "bg-red-400" },
};

export default function DependencyRiskPage() {
  const params = useParams<{ repoId: string }>();
  const { data, isLoading } = useGetDependencyRisk(params.repoId, {
    query: { enabled: !!params.repoId },
  });

  const riskStyle = data ? RISK_STYLES[data.overallRisk] : RISK_STYLES.low;
  const RiskIcon = riskStyle.icon;

  return (
    <DashboardLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-foreground">Dependency Risk Scanner</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Package analysis, supply-chain risks, and security recommendations</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
        ) : data ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total Dependencies", value: data.totalCount, icon: Package, color: "text-primary" },
                { label: "Est. Outdated", value: data.estimatedOutdated, icon: AlertTriangle, color: "text-yellow-400" },
                { label: "Bundle Complexity", value: data.bundleComplexity, icon: Layers, color: "text-cyan-400" },
                {
                  label: "Overall Risk",
                  value: data.overallRisk.charAt(0).toUpperCase() + data.overallRisk.slice(1),
                  icon: RiskIcon,
                  color: data.overallRisk === "low" ? "text-green-400" : data.overallRisk === "medium" ? "text-yellow-400" : "text-red-400"
                },
              ].map((stat) => (
                <div key={stat.label} className="p-4 rounded-xl border border-border/60 bg-card/60">
                  <div className="flex items-center gap-1.5 mb-2">
                    <stat.icon className={cn("w-3.5 h-3.5", stat.color)} />
                    <span className="text-[11px] text-muted-foreground">{stat.label}</span>
                  </div>
                  <p className="text-xl font-bold text-foreground">{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Framework badges */}
            {data.majorFrameworks.length > 0 && (
              <div className="p-5 rounded-xl border border-border/60 bg-card/60">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Detected Frameworks & Tools</h3>
                <div className="flex flex-wrap gap-2">
                  {data.majorFrameworks.map((fw) => (
                    <span key={fw} className="text-xs px-2.5 py-1 rounded-md bg-primary/10 text-primary border border-primary/20 font-medium">{fw}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Dependency items */}
            <div className="p-5 rounded-xl border border-border/60 bg-card/60">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Dependency Analysis</h3>
              <div className="space-y-2">
                {data.items.map((item, i) => {
                  const style = RISK_STYLES[item.riskLevel];
                  const ItemIcon = style.icon;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="flex items-start gap-3 p-3 rounded-lg bg-accent/20 border border-border/30"
                    >
                      <ItemIcon className={cn("w-4 h-4 mt-0.5 flex-shrink-0", style.badge.split(" ")[1])} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="text-sm font-medium text-foreground">{item.name}</span>
                          <span className="text-[11px] text-muted-foreground">{item.category}</span>
                          <Badge className={cn("text-[10px] border capitalize", style.badge)}>{item.riskLevel} risk</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{item.reason}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Warnings */}
              {data.warnings.length > 0 && (
                <div className="p-5 rounded-xl border border-yellow-500/20 bg-yellow-500/5">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-yellow-400" />
                    <h3 className="text-xs font-semibold text-yellow-400 uppercase tracking-wider">Warnings</h3>
                  </div>
                  <ul className="space-y-2">
                    {data.warnings.map((w, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 mt-1.5 flex-shrink-0" />
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              <div className="p-5 rounded-xl border border-green-500/20 bg-green-500/5">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <h3 className="text-xs font-semibold text-green-400 uppercase tracking-wider">Recommendations</h3>
                </div>
                <ul className="space-y-2">
                  {data.recommendations.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 flex-shrink-0" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="text-center py-20 text-sm text-muted-foreground">Run an analysis first to see dependency risks.</div>
        )}
      </div>
    </DashboardLayout>
  );
}
