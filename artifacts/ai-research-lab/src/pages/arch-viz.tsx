import { useParams } from "wouter";
import { motion } from "framer-motion";
import { useGetArchViz } from "@workspace/api-client-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { Monitor, Server, Database, Settings, TestTube, Layers, Boxes, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const LAYER_CONFIG: Record<string, { icon: typeof Monitor; color: string; bg: string; border: string; label: string }> = {
  frontend: { icon: Monitor, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30", label: "Frontend" },
  backend: { icon: Server, color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/30", label: "Backend" },
  api: { icon: Zap, color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/30", label: "API" },
  services: { icon: Boxes, color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30", label: "Services" },
  database: { icon: Database, color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/30", label: "Database" },
  config: { icon: Settings, color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30", label: "Config" },
  testing: { icon: TestTube, color: "text-pink-400", bg: "bg-pink-500/10", border: "border-pink-500/30", label: "Testing" },
  shared: { icon: Layers, color: "text-primary", bg: "bg-primary/10", border: "border-primary/30", label: "Shared" },
};

const LAYER_ORDER = ["frontend", "api", "backend", "services", "shared", "database", "config", "testing"];

export default function ArchVizPage() {
  const params = useParams<{ repoId: string }>();
  const { data, isLoading } = useGetArchViz(params.repoId, {
    query: { enabled: !!params.repoId },
  });

  const grouped = data
    ? LAYER_ORDER.reduce<Record<string, typeof data.nodes>>((acc, layer) => {
        const nodes = data.nodes.filter((n) => n.layer === layer);
        if (nodes.length) acc[layer] = nodes;
        return acc;
      }, {})
    : {};

  return (
    <DashboardLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-foreground">Architecture Visualization</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Visual map of repository components, layers, and relationships</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-12 rounded-xl" />
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
            </div>
          </div>
        ) : data ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {/* Project type + layer legend */}
            <div className="flex items-center justify-between flex-wrap gap-3 p-4 rounded-xl border border-border/60 bg-card/60">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Project Type</p>
                <p className="text-sm font-semibold text-foreground">{data.projectType}</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {data.layers.map((layer) => {
                  const cfg = LAYER_CONFIG[layer];
                  if (!cfg) return null;
                  const Icon = cfg.icon;
                  return (
                    <div key={layer} className={cn("flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border", cfg.bg, cfg.border, cfg.color)}>
                      <Icon className="w-3 h-3" />
                      {cfg.label}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Architecture layers */}
            <div className="space-y-3">
              {Object.entries(grouped).map(([layer, nodes], layerIdx) => {
                const cfg = LAYER_CONFIG[layer] ?? LAYER_CONFIG.shared;
                const Icon = cfg.icon;
                return (
                  <motion.div
                    key={layer}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: layerIdx * 0.08 }}
                  >
                    {/* Layer label */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className={cn("w-px h-4", cfg.color.replace("text-", "bg-"))} />
                      <Icon className={cn("w-3.5 h-3.5", cfg.color)} />
                      <span className={cn("text-xs font-semibold uppercase tracking-wider", cfg.color)}>{cfg.label} Layer</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pl-4">
                      {nodes.map((node, ni) => (
                        <motion.div
                          key={node.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: layerIdx * 0.08 + ni * 0.04 }}
                          className={cn(
                            "p-4 rounded-xl border",
                            cfg.bg, cfg.border
                          )}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Icon className={cn("w-4 h-4 flex-shrink-0", cfg.color)} />
                            <span className="text-sm font-semibold text-foreground">{node.label}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2 leading-relaxed">{node.description}</p>
                          {node.files && node.files.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {node.files.slice(0, 3).map((f) => (
                                <span key={f} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-background/50 text-muted-foreground border border-border/40">
                                  {f.length > 20 ? `...${f.slice(-18)}` : f}
                                </span>
                              ))}
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Connections */}
            {data.connections.length > 0 && (
              <div className="p-5 rounded-xl border border-border/60 bg-card/60">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Component Relationships</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {data.connections.slice(0, 12).map((conn, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 + i * 0.04 }}
                      className="flex items-center gap-2 text-xs"
                    >
                      <span className="font-medium text-foreground capitalize">{conn.from}</span>
                      <div className="flex items-center gap-1 text-muted-foreground flex-1">
                        <span className="flex-1 h-px bg-border/60" />
                        <span className="text-[10px] text-primary px-1">{conn.label}</span>
                        <span className="flex-1 h-px bg-border/60" />
                        <span className="text-[10px]">→</span>
                      </div>
                      <span className="font-medium text-foreground capitalize">{conn.to}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <div className="text-center py-20 text-sm text-muted-foreground">Run an analysis first to see the architecture visualization.</div>
        )}
      </div>
    </DashboardLayout>
  );
}
