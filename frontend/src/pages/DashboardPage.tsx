import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Plus,
  FolderGit2,
  GitPullRequestArrow,
  MessageSquare,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { reviewsApi } from "@/api/reviews";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { cn, formatDate, timeAgo } from "@/lib/utils";

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const [showNewRepo, setShowNewRepo] = useState(false);
  const [newRepoName, setNewRepoName] = useState("");
  const [newRepoLang, setNewRepoLang] = useState("");

  const { data: reposData, isLoading: reposLoading } = useQuery({
    queryKey: ["repositories"],
    queryFn: () => reviewsApi.listRepositories(),
    select: (res) => res.data,
  });

  const { data: sessionsData, isLoading: sessionsLoading } = useQuery({
    queryKey: ["sessions"],
    queryFn: () => reviewsApi.listSessions(),
    select: (res) => res.data,
  });

  const createRepo = useMutation({
    mutationFn: reviewsApi.createRepository,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repositories"] });
      setShowNewRepo(false);
      setNewRepoName("");
      setNewRepoLang("");
    },
  });

  const handleCreateRepo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRepoName.trim()) return;
    createRepo.mutate({ name: newRepoName, language: newRepoLang });
  };

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-surface-400">
          Manage your repositories and review sessions
        </p>
      </div>

      {/* Stats overview */}
      <div className="mb-8 grid grid-cols-3 gap-4">
        {[
          {
            label: "Repositories",
            value: reposData?.count ?? 0,
            icon: FolderGit2,
            color: "text-brand-400",
          },
          {
            label: "Active Reviews",
            value:
              sessionsData?.results.filter(
                (s) => s.status === "open" || s.status === "in_progress"
              ).length ?? 0,
            icon: GitPullRequestArrow,
            color: "text-emerald-400",
          },
          {
            label: "Total Sessions",
            value: sessionsData?.count ?? 0,
            icon: MessageSquare,
            color: "text-amber-400",
          },
        ].map((stat) => (
          <div key={stat.label} className="card px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-800">
                <stat.icon className={cn("h-4 w-4", stat.color)} />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-surface-500">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-8">
        {/* Repositories */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-surface-400">
              Repositories
            </h2>
            <button
              onClick={() => setShowNewRepo(!showNewRepo)}
              className="btn-secondary text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              New
            </button>
          </div>

          {/* Create repository form */}
          {showNewRepo && (
            <form
              onSubmit={handleCreateRepo}
              className="card mb-4 p-4 space-y-3 animate-slide-up"
            >
              <input
                type="text"
                value={newRepoName}
                onChange={(e) => setNewRepoName(e.target.value)}
                placeholder="Repository name"
                className="input-field"
                autoFocus
              />
              <input
                type="text"
                value={newRepoLang}
                onChange={(e) => setNewRepoLang(e.target.value)}
                placeholder="Language (e.g. python)"
                className="input-field"
              />
              <div className="flex gap-2">
                <button type="submit" className="btn-primary text-xs">
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewRepo(false)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {reposLoading ? (
            <LoadingSpinner message="Loading repositories…" />
          ) : !reposData?.results.length ? (
            <EmptyState
              icon={FolderGit2}
              title="No repositories yet"
              description="Create your first repository to start reviewing code."
            />
          ) : (
            <div className="space-y-2">
              {reposData.results.map((repo) => (
                <Link
                  key={repo.id}
                  to={`/repositories/${repo.id}`}
                  className="card flex items-center justify-between px-4 py-3 transition-colors hover:bg-surface-800/40"
                >
                  <div className="flex items-center gap-3">
                    <FolderGit2 className="h-4 w-4 text-brand-400" />
                    <div>
                      <p className="text-sm font-medium text-surface-200">
                        {repo.name}
                      </p>
                      <p className="text-xs text-surface-500">
                        {repo.language || "—"} · {repo.file_count} files
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-surface-600" />
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Recent Sessions */}
        <section>
          <div className="mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-surface-400">
              Recent Sessions
            </h2>
          </div>

          {sessionsLoading ? (
            <LoadingSpinner message="Loading sessions…" />
          ) : !sessionsData?.results.length ? (
            <EmptyState
              icon={Sparkles}
              title="No review sessions"
              description="Create a review session from a repository to begin."
            />
          ) : (
            <div className="space-y-2">
              {sessionsData.results.map((session) => (
                <Link
                  key={session.id}
                  to={`/sessions/${session.id}`}
                  className="card block px-4 py-3 transition-colors hover:bg-surface-800/40"
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-surface-200">
                      {session.title}
                    </p>
                    <StatusBadge status={session.status} />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-surface-500">
                    <span>{session.author.username}</span>
                    <span>·</span>
                    <span>{session.annotation_count} annotations</span>
                    <span>·</span>
                    <span>{timeAgo(session.created_at)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
