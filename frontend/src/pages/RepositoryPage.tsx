import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  FileCode,
  Upload,
  Plus,
  Play,
} from "lucide-react";
import { reviewsApi } from "@/api/reviews";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/utils";

export default function RepositoryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showUpload, setShowUpload] = useState(false);
  const [filePath, setFilePath] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [fileLang, setFileLang] = useState("");
  const [showNewSession, setShowNewSession] = useState(false);
  const [sessionTitle, setSessionTitle] = useState("");

  const { data: repo, isLoading: repoLoading } = useQuery({
    queryKey: ["repository", id],
    queryFn: () => reviewsApi.getRepository(id!),
    select: (res) => res.data,
    enabled: !!id,
  });

  const { data: filesData, isLoading: filesLoading } = useQuery({
    queryKey: ["files", id],
    queryFn: () => reviewsApi.listFiles({ repository: id! }),
    select: (res) => res.data,
    enabled: !!id,
  });

  const uploadFile = useMutation({
    mutationFn: reviewsApi.uploadFile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files", id] });
      queryClient.invalidateQueries({ queryKey: ["repository", id] });
      setShowUpload(false);
      setFilePath("");
      setFileContent("");
      setFileLang("");
    },
  });

  const createSession = useMutation({
    mutationFn: reviewsApi.createSession,
    onSuccess: (res) => {
      navigate(`/sessions/${res.data.id}`);
    },
  });

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!filePath.trim() || !fileContent.trim()) return;
    uploadFile.mutate({
      repository: id!,
      path: filePath,
      content: fileContent,
      language: fileLang || undefined,
    });
  };

  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionTitle.trim()) return;
    createSession.mutate({
      title: sessionTitle,
      repository: id!,
      file_ids: filesData?.results.map((f) => f.id) || [],
    });
  };

  if (repoLoading) return <LoadingSpinner message="Loading repository…" />;

  return (
    <div className="mx-auto max-w-4xl px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate("/")}
          className="mb-4 flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-300 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">{repo?.name}</h1>
            <p className="mt-0.5 text-sm text-surface-400">
              {repo?.language || "No language"} · Created{" "}
              {repo ? formatDate(repo.created_at) : ""}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowUpload(!showUpload)}
              className="btn-secondary text-xs"
            >
              <Upload className="h-3.5 w-3.5" />
              Upload File
            </button>
            <button
              onClick={() => setShowNewSession(!showNewSession)}
              className="btn-primary text-xs"
            >
              <Play className="h-3.5 w-3.5" />
              New Review Session
            </button>
          </div>
        </div>
      </div>

      {/* New session form */}
      {showNewSession && (
        <form
          onSubmit={handleCreateSession}
          className="card mb-6 p-4 space-y-3 animate-slide-up"
        >
          <h3 className="text-sm font-semibold text-surface-200">
            Create Review Session
          </h3>
          <input
            type="text"
            value={sessionTitle}
            onChange={(e) => setSessionTitle(e.target.value)}
            placeholder="Session title (e.g. Sprint 12 Code Review)"
            className="input-field"
            autoFocus
          />
          <p className="text-xs text-surface-500">
            All {filesData?.count ?? 0} files will be included in this session.
          </p>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary text-xs">
              Create & Start
            </button>
            <button
              type="button"
              onClick={() => setShowNewSession(false)}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Upload file form */}
      {showUpload && (
        <form
          onSubmit={handleUpload}
          className="card mb-6 p-4 space-y-3 animate-slide-up"
        >
          <h3 className="text-sm font-semibold text-surface-200">
            Upload Code File
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
              placeholder="File path (e.g. src/app.py)"
              className="input-field"
              required
            />
            <input
              type="text"
              value={fileLang}
              onChange={(e) => setFileLang(e.target.value)}
              placeholder="Language (e.g. python)"
              className="input-field"
            />
          </div>
          <textarea
            value={fileContent}
            onChange={(e) => setFileContent(e.target.value)}
            placeholder="Paste code content here…"
            rows={10}
            className="input-field font-mono text-code resize-y"
            required
          />
          <div className="flex gap-2">
            <button type="submit" className="btn-primary text-xs">
              <Plus className="h-3.5 w-3.5" />
              Upload
            </button>
            <button
              type="button"
              onClick={() => setShowUpload(false)}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Files list */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-surface-400">
          Files
        </h2>
        {filesLoading ? (
          <LoadingSpinner message="Loading files…" />
        ) : !filesData?.results.length ? (
          <EmptyState
            icon={FileCode}
            title="No files yet"
            description="Upload code files to this repository to begin reviewing."
          />
        ) : (
          <div className="space-y-1">
            {filesData.results.map((file) => (
              <div
                key={file.id}
                className="card flex items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <FileCode className="h-4 w-4 text-surface-400" />
                  <div>
                    <p className="text-sm font-medium text-surface-200">
                      {file.path}
                    </p>
                    <p className="text-xs text-surface-500">
                      {file.language || "—"} · {file.line_count} lines
                    </p>
                  </div>
                </div>
                <span className="text-xs text-surface-600">
                  {formatDate(file.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
