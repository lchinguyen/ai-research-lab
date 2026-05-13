import { useParams } from "wouter";
import { motion } from "framer-motion";
import { useGetHealthScore } from "@workspace/api-client-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const DIMENSION_COLORS: Record<string, string> = {
  maintainability: "hsl(250 89% 65%)",
  documentation: "hsl(180 72% 50%)",
  architecture: "hsl(45 90% 55%)",
  contributor: "hsl(130 55% 50%)",
  testing: "hsl(330 80% 60%)",
  activity: "hsl(200 80% 55%)",
};

const GRADE_COLORS: Record<string, string> = {
  "A+": "text-green-400", A: "text-green-400",
  B: "text-yellow-400", C: "text-orange-400",
  D: "text-red-400", F: "text-red-500",
};

function AnimatedBar({ score, color, delay = 0 }: { score: number; color: string; delay?: number }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(score), delay + 100);
    return () => clearTimeout(t);
  }, [score, delay]);

  return (
    <div className="h-2 rounded-full bg-border/60 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-1000 ease-out"
        style={{ width: `${width}%`, backgroundColor: color }}
      />
    </div>
  );
}

function ScoreRing({ score, grade }: { score: number; grade: string }) {
  const radius = 54;
  const circ = 2 * Math.PI * radius;
  const [offset, setOffset] = useState(circ);
  useEffect(() => {
    const t = setTimeout(() => setOffset(circ - (score / 100) * circ), 200);
    return () => clearTimeout(t);
  }, [score, circ]);

  return (
    <div className="relative w-36 h-36">
      <svg className="w-36 h-36 -rotate-90" viewBox="0 0 130 130">
        <circle cx="65" cy="65" r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth="10" />
        <circle
          cx="65" cy="65" r={radius}
          fill="none"
          stroke="hsl(250 89% 65%)"
          strokeWidth="10"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1200 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold text-foreground">{score}</span>
        <span className={cn("text-xl font-bold", GRADE_COLORS[grade] ?? "text-foreground")}>{grade}</span>
      </div>
    </div>
  );
}

export default function HealthScorePage() {
  const params = useParams<{ repoId: string }>();
  const { data, isLoading } = useGetHealthScore(params.repoId, {
    query: { enabled: !!params.repoId },
  });

  return (
    <DashboardLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-foreground">Repository Health Score</h1>
          <p className="text-sm text-muted-foreground mt-0.5">6-dimension analysis using GitHub metadata and heuristics</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-44 rounded-xl" />
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
            </div>
          </div>
        ) : data ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {/* Overall score card */}
            <div className="p-6 rounded-xl border border-border/60 bg-card/60 flex items-center gap-8 flex-wrap">
              <ScoreRing score={data.overallScore} grade={data.grade} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Heart className="w-4 h-4 text-primary" />
                  <h2 className="text-base font-semibold text-foreground">Overall Health</h2>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{data.summary}</p>
                <div className="flex gap-3 flex-wrap">
                  {(["A+","A","B","C","D","F"] as const).map((g) => (
                    <div key={g} className={cn(
                      "text-xs px-2.5 py-1 rounded-md border font-medium",
                      data.grade === g
                        ? "bg-primary/20 border-primary/40 text-primary"
                        : "border-border/40 text-muted-foreground/50"
                    )}>{g}</div>
                  ))}
                </div>
              </div>
            </div>

            {/* Dimension cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.dimensions.map((dim, i) => {
                const color = DIMENSION_COLORS[dim.id] ?? "hsl(250 89% 65%)";
                const Icon = dim.score >= 75 ? TrendingUp : dim.score >= 45 ? Minus : TrendingDown;
                return (
                  <motion.div
                    key={dim.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07, duration: 0.25 }}
                    className="p-5 rounded-xl border border-border/60 bg-card/60"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" style={{ color }} />
                        <span className="text-sm font-semibold text-foreground">{dim.label}</span>
                      </div>
                      <span className="text-xl font-bold" style={{ color }}>{dim.score}</span>
                    </div>
                    <AnimatedBar score={dim.score} color={color} delay={i * 70} />
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{dim.insight}</p>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        ) : (
          <div className="text-center py-20 text-sm text-muted-foreground">Run an analysis first to see health scores.</div>
        )}
      </div>
    </DashboardLayout>
  );
}
