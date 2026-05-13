import { useParams } from "wouter";
import { motion } from "framer-motion";
import { useGetArchitecture, getGetArchitectureQueryKey } from "@workspace/api-client-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { Folder, File, ChevronRight, Package, GitMerge, ArrowRight } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { FolderNode } from "@workspace/api-client-react";

function TreeNode({ node, depth = 0 }: { node: FolderNode; depth?: number }) {
  const [open, setOpen] = useState(depth < 2);
  const isDir = node.type === "directory";

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1.5 py-0.5 px-2 rounded hover:bg-accent/40 transition-colors cursor-pointer text-xs",
          isDir ? "text-foreground font-medium" : "text-muted-foreground"
        )}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
        onClick={() => isDir && setOpen(!open)}
      >
        {isDir ? (
          <>
            <ChevronRight className={cn("w-3 h-3 text-muted-foreground transition-transform", open && "rotate-90")} />
            <Folder className="w-3.5 h-3.5 text-yellow-400" />
          </>
        ) : (
          <>
            <span className="w-3 h-3" />
            <File className="w-3.5 h-3.5 text-muted-foreground/60" />
          </>
        )}
        <span>{node.name}</span>
      </div>
      {isDir && open && node.children?.map((child, i) => (
        <TreeNode key={i} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

export default function Architecture() {
  const params = useParams<{ repoId: string }>();
  const repoId = params.repoId;

  const { data: arch, isLoading } = useGetArchitecture(repoId, {
    query: { enabled: !!repoId, queryKey: getGetArchitectureQueryKey(repoId) },
  });

  return (
    <DashboardLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-foreground">Architecture Map</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Folder structure, dependencies, and component relationships</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-80 rounded-xl" />
            <Skeleton className="h-80 rounded-xl" />
            <Skeleton className="h-48 col-span-2 rounded-xl" />
          </div>
        ) : arch ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Folder tree */}
              <div className="p-5 rounded-xl border border-border/60 bg-card/60">
                <div className="flex items-center gap-2 mb-4">
                  <Folder className="w-4 h-4 text-yellow-400" />
                  <h3 className="text-sm font-semibold text-foreground">Folder Structure</h3>
                </div>
                <div className="font-mono overflow-y-auto max-h-64">
                  {arch.folderTree.map((node, i) => (
                    <TreeNode key={i} node={node} />
                  ))}
                </div>
              </div>

              {/* Key files */}
              <div className="p-5 rounded-xl border border-border/60 bg-card/60">
                <div className="flex items-center gap-2 mb-4">
                  <File className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Key Files</h3>
                </div>
                <ul className="space-y-2">
                  {arch.keyFiles.map((f, i) => {
                    const [path, ...desc] = f.split(" — ");
                    return (
                      <li key={i} className="flex flex-col gap-0.5">
                        <span className="text-xs font-mono text-primary">{path}</span>
                        {desc.length > 0 && <span className="text-[11px] text-muted-foreground">{desc.join(" — ")}</span>}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>

            {/* Dependencies */}
            <div className="p-5 rounded-xl border border-border/60 bg-card/60">
              <div className="flex items-center gap-2 mb-4">
                <Package className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-semibold text-foreground">Dependencies</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/60">
                      <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Package</th>
                      <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Version</th>
                      <th className="text-left py-2 text-muted-foreground font-medium">Purpose</th>
                    </tr>
                  </thead>
                  <tbody>
                    {arch.dependencies.map((dep, i) => (
                      <tr key={i} className="border-b border-border/30 last:border-0 hover:bg-accent/20 transition-colors">
                        <td className="py-2 pr-4 font-mono text-foreground">{dep.name}</td>
                        <td className="py-2 pr-4 text-muted-foreground">{dep.version}</td>
                        <td className="py-2 text-muted-foreground">{dep.purpose}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Component relationships */}
              <div className="p-5 rounded-xl border border-border/60 bg-card/60">
                <div className="flex items-center gap-2 mb-4">
                  <GitMerge className="w-4 h-4 text-violet-400" />
                  <h3 className="text-sm font-semibold text-foreground">Component Relationships</h3>
                </div>
                <ul className="space-y-2">
                  {arch.componentRelationships.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <ArrowRight className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Data flow */}
              <div className="p-5 rounded-xl border border-border/60 bg-card/60">
                <div className="flex items-center gap-2 mb-4">
                  <ArrowRight className="w-4 h-4 text-green-400" />
                  <h3 className="text-sm font-semibold text-foreground">Data Flow</h3>
                </div>
                <ol className="space-y-2">
                  {arch.dataFlow.map((step, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-xs text-muted-foreground">
                      <span className="w-4 h-4 rounded-full bg-accent text-foreground text-[10px] flex items-center justify-center flex-shrink-0 font-medium mt-0.5">{i + 1}</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="text-center py-20 text-sm text-muted-foreground">No architecture data available.</div>
        )}
      </div>
    </DashboardLayout>
  );
}
