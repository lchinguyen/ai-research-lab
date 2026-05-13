import { Link, useParams, useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Bot,
  GitBranch,
  AlertCircle,
  GitPullRequest,
  ChevronLeft,
  Github,
  Cpu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useGetRepository } from "@workspace/api-client-react";

const navItems = [
  { label: "Overview", icon: LayoutDashboard, path: "" },
  { label: "AI Agents", icon: Bot, path: "/agents" },
  { label: "Architecture", icon: GitBranch, path: "/architecture" },
  { label: "Issues", icon: AlertCircle, path: "/issues" },
  { label: "PR Summary", icon: GitPullRequest, path: "/pr-summary" },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const params = useParams<{ repoId: string }>();
  const repoId = params.repoId;
  const [location] = useLocation();

  const { data: repo } = useGetRepository(repoId, {
    query: { enabled: !!repoId },
  });

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 flex flex-col border-r border-sidebar-border bg-sidebar flex-shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-sidebar-border">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center flex-shrink-0">
            <Cpu className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sm text-foreground tracking-tight">AI Research Lab</span>
        </div>

        {/* Repo Info */}
        {repo && (
          <div className="px-3 py-3 border-b border-sidebar-border">
            <div className="flex items-center gap-2 px-2 py-2 rounded-md bg-accent/50">
              <Github className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{repo.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{repo.owner}</p>
              </div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const href = `/dashboard/${repoId}${item.path}`;
            const isActive = location === href;
            return (
              <Link key={item.path} href={href}>
                <div
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm cursor-pointer transition-colors",
                    isActive
                      ? "bg-primary/15 text-primary font-medium"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
                  )}
                >
                  <item.icon className={cn("w-4 h-4 flex-shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Back to Home */}
        <div className="px-2 pb-3 border-t border-sidebar-border pt-3">
          <Link href="/">
            <div className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors cursor-pointer">
              <ChevronLeft className="w-4 h-4" />
              New Analysis
            </div>
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <motion.div
          key={location}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="min-h-full"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
