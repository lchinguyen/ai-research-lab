import { useParams } from "wouter";
import { motion } from "framer-motion";
import { useGetIssues, getGetIssuesQueryKey } from "@workspace/api-client-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Copy, Download, File, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const PRIORITY_STYLES: Record<string, string> = {
  critical: "bg-red-500/15 text-red-400 border-red-500/30",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  low: "bg-blue-500/15 text-blue-400 border-blue-500/30",
};

const TYPE_STYLES: Record<string, string> = {
  bug: "bg-red-500/10 text-red-300 border-red-500/20",
  performance: "bg-yellow-500/10 text-yellow-300 border-yellow-500/20",
  security: "bg-orange-500/10 text-orange-300 border-orange-500/20",
  refactor: "bg-purple-500/10 text-purple-300 border-purple-500/20",
  documentation: "bg-blue-500/10 text-blue-300 border-blue-500/20",
  enhancement: "bg-green-500/10 text-green-300 border-green-500/20",
};

export default function Issues() {
  const params = useParams<{ repoId: string }>();
  const repoId = params.repoId;
  const { toast } = useToast();

  const { data: issues, isLoading } = useGetIssues(repoId, {
    query: { enabled: !!repoId, queryKey: getGetIssuesQueryKey(repoId) },
  });

  function copyIssue(issue: NonNullable<typeof issues>[number]) {
    const text = [
      `## ${issue.title}`,
      ``,
      `**Priority:** ${issue.priority}  **Type:** ${issue.type}`,
      ``,
      `### Description`,
      issue.description,
      ``,
      `### Suggested Fix`,
      issue.suggestedFix,
      ``,
      `### Affected Files`,
      ...issue.affectedFiles.map((f) => `- \`${f}\``),
    ].join("\n");
    navigator.clipboard.writeText(text);
    toast({ title: "Issue copied", description: "Copied to clipboard as Markdown" });
  }

  function exportIssues() {
    if (!issues) return;
    const blob = new Blob([JSON.stringify(issues, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${repoId}-issues.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Issues exported", description: "Downloaded as JSON" });
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Issue Generator</h1>
            <p className="text-sm text-muted-foreground mt-0.5">AI-generated GitHub-style issues with fix suggestions</p>
          </div>
          {issues && (
            <div className="flex items-center gap-2">
              <button
                data-testid="button-export-issues"
                onClick={exportIssues}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/60 bg-accent/30 hover:bg-accent/60 transition-colors text-xs text-foreground"
              >
                <Download className="w-3.5 h-3.5" />
                Export Issues
              </button>
              <span className="text-xs text-muted-foreground px-2.5 py-1 rounded-lg border border-border/40 bg-card/40">
                {issues.length} issues
              </span>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-xl" />
            ))}
          </div>
        ) : issues ? (
          <div className="space-y-3">
            {issues.map((issue, i) => (
              <motion.div
                key={issue.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.2 }}
                data-testid={`card-issue-${issue.id}`}
                className="p-5 rounded-xl border border-border/60 bg-card/60 hover:border-border transition-colors group"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <AlertCircle className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <h3 className="text-sm font-semibold text-foreground" data-testid={`text-issue-title-${issue.id}`}>{issue.title}</h3>
                      </div>
                      <div className="flex items-center gap-2 mb-3">
                        <Badge className={cn("text-[10px] border capitalize", PRIORITY_STYLES[issue.priority])}>
                          {issue.priority}
                        </Badge>
                        <Badge className={cn("text-[10px] border capitalize", TYPE_STYLES[issue.type])}>
                          {issue.type}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{issue.description}</p>

                      <div className="rounded-lg bg-accent/30 border border-border/40 p-3 mb-3">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <CheckCircle2 className="w-3 h-3 text-green-400" />
                          <span className="text-[11px] font-semibold text-green-400">Suggested Fix</span>
                        </div>
                        <p className="text-xs text-foreground/80 leading-relaxed">{issue.suggestedFix}</p>
                      </div>

                      {issue.affectedFiles.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] text-muted-foreground">Files:</span>
                          {issue.affectedFiles.map((f) => (
                            <span key={f} className="flex items-center gap-1 text-[11px] font-mono text-primary bg-primary/10 border border-primary/20 rounded px-1.5 py-0.5">
                              <File className="w-2.5 h-2.5" />
                              {f}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    data-testid={`button-copy-issue-${issue.id}`}
                    onClick={() => copyIssue(issue)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/60 bg-accent/20 hover:bg-accent/50 transition-colors text-xs text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-sm text-muted-foreground">No issues data available.</div>
        )}
      </div>
    </DashboardLayout>
  );
}
