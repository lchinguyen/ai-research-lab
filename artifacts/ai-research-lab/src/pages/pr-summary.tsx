import { useParams } from "wouter";
import { motion } from "framer-motion";
import { useGetPrSummary, getGetPrSummaryQueryKey } from "@workspace/api-client-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { Copy, Download, GitPullRequest, CheckCircle2, AlertTriangle, FileText, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function PrSummary() {
  const params = useParams<{ repoId: string }>();
  const repoId = params.repoId;
  const { toast } = useToast();
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());

  const { data: pr, isLoading } = useGetPrSummary(repoId, {
    query: { enabled: !!repoId, queryKey: getGetPrSummaryQueryKey(repoId) },
  });

  function toggleCheck(i: number) {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  function copyPrSummary() {
    if (!pr) return;
    const text = [
      `## ${pr.title}`,
      ``,
      `### Summary`,
      pr.summary,
      ``,
      `### Implementation Notes`,
      ...pr.implementationNotes.map((n) => `- ${n}`),
      ``,
      `### Testing Checklist`,
      ...pr.testingChecklist.map((t) => `- [ ] ${t}`),
      ``,
      `### Risk Notes`,
      ...pr.riskNotes.map((r) => `- ${r}`),
    ].join("\n");
    navigator.clipboard.writeText(text);
    toast({ title: "PR Summary copied", description: "Copied to clipboard as Markdown" });
  }

  function downloadReport() {
    if (!pr) return;
    const text = [
      `ENGINEERING REPORT`,
      `==================`,
      ``,
      `PR Title: ${pr.title}`,
      ``,
      `SUMMARY`,
      `-------`,
      pr.summary,
      ``,
      `IMPLEMENTATION NOTES`,
      `--------------------`,
      ...pr.implementationNotes.map((n, i) => `${i + 1}. ${n}`),
      ``,
      `TESTING CHECKLIST`,
      `-----------------`,
      ...pr.testingChecklist.map((t) => `[ ] ${t}`),
      ``,
      `RISK NOTES`,
      `----------`,
      ...pr.riskNotes.map((r) => `- ${r}`),
    ].join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${repoId}-engineering-report.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Report downloaded", description: "Engineering report saved as .txt" });
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-semibold text-foreground">PR Summary Generator</h1>
            <p className="text-sm text-muted-foreground mt-0.5">AI-drafted pull request with implementation notes and testing checklist</p>
          </div>
          {pr && (
            <div className="flex items-center gap-2">
              <button
                data-testid="button-copy-pr"
                onClick={copyPrSummary}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/60 bg-accent/30 hover:bg-accent/60 transition-colors text-xs text-foreground"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy PR Summary
              </button>
              <button
                data-testid="button-download-report"
                onClick={downloadReport}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity text-xs font-medium"
              >
                <Download className="w-3.5 h-3.5" />
                Download Report
              </button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
        ) : pr ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {/* PR Title */}
            <div className="p-5 rounded-xl border border-primary/30 bg-primary/5">
              <div className="flex items-start gap-3">
                <GitPullRequest className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Pull Request Title</p>
                  <p className="text-sm font-semibold text-foreground font-mono" data-testid="text-pr-title">{pr.title}</p>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="p-5 rounded-xl border border-border/60 bg-card/60">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Summary</h3>
              <p className="text-sm text-foreground leading-relaxed" data-testid="text-pr-summary">{pr.summary}</p>
            </div>

            {/* Implementation Notes */}
            <div className="p-5 rounded-xl border border-border/60 bg-card/60">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Implementation Notes</h3>
              </div>
              <ol className="space-y-3">
                {pr.implementationNotes.map((note, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-accent text-foreground text-[11px] flex items-center justify-center font-semibold mt-0.5">{i + 1}</span>
                    <span className="text-foreground/80 leading-relaxed">{note}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Testing Checklist */}
            <div className="p-5 rounded-xl border border-border/60 bg-card/60">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Testing Checklist</h3>
                </div>
                <span className="text-xs text-muted-foreground">{checkedItems.size}/{pr.testingChecklist.length} done</span>
              </div>
              <ul className="space-y-2">
                {pr.testingChecklist.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <button
                      data-testid={`checkbox-test-${i}`}
                      onClick={() => toggleCheck(i)}
                      className={`flex-shrink-0 w-4 h-4 rounded border mt-0.5 transition-colors flex items-center justify-center ${
                        checkedItems.has(i)
                          ? "bg-primary border-primary"
                          : "border-border hover:border-primary/60"
                      }`}
                    >
                      {checkedItems.has(i) && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
                    </button>
                    <span className={`text-sm leading-relaxed transition-colors ${checkedItems.has(i) ? "line-through text-muted-foreground" : "text-foreground/80"}`}>
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Risk Notes */}
            <div className="p-5 rounded-xl border border-yellow-500/20 bg-yellow-500/5">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
                <h3 className="text-xs font-semibold text-yellow-400 uppercase tracking-wider">Risk Notes</h3>
              </div>
              <ul className="space-y-2">
                {pr.riskNotes.map((note, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                    <ChevronRight className="w-3.5 h-3.5 text-yellow-400 mt-0.5 flex-shrink-0" />
                    <span className="leading-relaxed">{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        ) : (
          <div className="text-center py-20 text-sm text-muted-foreground">No PR summary data available.</div>
        )}
      </div>
    </DashboardLayout>
  );
}
