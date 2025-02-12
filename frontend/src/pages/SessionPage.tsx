import { useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Sparkles } from "lucide-react";
import { reviewsApi } from "@/api/reviews";
import { useReviewStore } from "@/store/reviewStore";
import { useReviewWebSocket } from "@/hooks/useReviewWebSocket";
import { CodeViewer } from "@/components/reviews/CodeViewer";
import { AnnotationThread } from "@/components/reviews/AnnotationThread";
import { AISuggestionPanel } from "@/components/reviews/AISuggestionPanel";
import { FileSidebar } from "@/components/reviews/FileSidebar";
import { ActiveUsers } from "@/components/reviews/ActiveUsers";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";

export default function SessionPage() {
  const { id: sessionId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    selectedFileId,
    setSelectedFile,
    annotations,
    setAnnotations,
    suggestions,
    setSuggestions,
    activeUsers,
    cursors,
    reset,
  } = useReviewStore();

  const { isConnected, sendMessage } = useReviewWebSocket(sessionId);

  // Cleanup on unmount
  useEffect(() => () => reset(), [reset]);

  // ── Data fetching ────────────────────────────
  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ["session", sessionId],
    queryFn: () => reviewsApi.getSession(sessionId!),
    select: (res) => res.data,
    enabled: !!sessionId,
  });

  const { data: filesData } = useQuery({
    queryKey: ["session-files", session?.repository],
    queryFn: () =>
      reviewsApi.listFiles({ repository: session!.repository }),
    select: (res) => res.data,
    enabled: !!session?.repository,
  });

  const { data: fileContent, isLoading: fileLoading } = useQuery({
    queryKey: ["file-content", selectedFileId],
    queryFn: () => reviewsApi.getFile(selectedFileId!),
    select: (res) => res.data,
    enabled: !!selectedFileId,
  });

  // Load annotations
  const { data: annotationsData } = useQuery({
    queryKey: ["annotations", sessionId],
    queryFn: () => reviewsApi.listAnnotations({ session: sessionId! }),
    select: (res) => res.data,
    enabled: !!sessionId,
  });

  useEffect(() => {
    if (annotationsData?.results) {
      setAnnotations(annotationsData.results);
    }
  }, [annotationsData, setAnnotations]);

  // Load suggestions
  const { data: suggestionsData } = useQuery({
    queryKey: ["suggestions", sessionId],
    queryFn: () => reviewsApi.listSuggestions({ session: sessionId! }),
    select: (res) => res.data,
    enabled: !!sessionId,
  });

  useEffect(() => {
    if (suggestionsData?.results) {
      setSuggestions(suggestionsData.results);
    }
  }, [suggestionsData, setSuggestions]);

  // Auto-select first file
  useEffect(() => {
    if (filesData?.results.length && !selectedFileId) {
      setSelectedFile(filesData.results[0].id);
    }
  }, [filesData, selectedFileId, setSelectedFile]);

  // ── Mutations ────────────────────────────────
  const acceptSuggestion = useMutation({
    mutationFn: (id: string) => reviewsApi.acceptSuggestion(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["suggestions", sessionId] }),
  });

  // ── Handlers ─────────────────────────────────
  const handleLineSelect = useCallback(
    (startLine: number, endLine: number) => {
      if (!selectedFileId) return;
      sendMessage("annotation.create", {
        file_id: selectedFileId,
        start_line: startLine,
        end_line: endLine,
      });
    },
    [selectedFileId, sendMessage]
  );

  const handleRequestSuggestion = useCallback(
    (startLine: number, endLine: number) => {
      if (!selectedFileId || !sessionId) return;
      sendMessage("suggestion.request", {
        file_id: selectedFileId,
        start_line: startLine,
        end_line: endLine,
      });
    },
    [selectedFileId, sessionId, sendMessage]
  );

  const handleAddComment = useCallback(
    (annotationId: string, body: string) => {
      sendMessage("comment.create", {
        annotation_id: annotationId,
        body,
      });
    },
    [sendMessage]
  );

  const handleResolve = useCallback(
    (annotationId: string) => {
      sendMessage("annotation.resolve", { annotation_id: annotationId });
    },
    [sendMessage]
  );

  const handleDismissSuggestion = useCallback(
    (_id: string) => {
      // Remove from local state (no backend call needed for dismiss)
      setSuggestions(suggestions.filter((s) => s.id !== _id));
    },
    [suggestions, setSuggestions]
  );

  // ── Filter annotations/suggestions for selected file ──
  const fileAnnotations = annotations.filter(
    (a) => a.file === selectedFileId
  );
  const fileSuggestions = suggestions.filter(
    (s) => s.file === selectedFileId
  );

  if (sessionLoading) return <LoadingSpinner message="Loading session…" />;

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-surface-800 bg-surface-900/40 px-6 py-3">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="text-surface-500 hover:text-surface-300 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-white">
                {session?.title}
              </h1>
              {session && <StatusBadge status={session.status} />}
            </div>
            <p className="text-xs text-surface-500">
              {session?.branch} · {annotations.length} annotations
            </p>
          </div>
        </div>
        <ActiveUsers users={activeUsers} isConnected={isConnected} />
      </header>

      {/* Main workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* File sidebar */}
        <div className="w-56 shrink-0">
          <FileSidebar
            files={filesData?.results || []}
            selectedFileId={selectedFileId}
            onSelectFile={setSelectedFile}
          />
        </div>

        {/* Code viewer */}
        <div className="flex-1 overflow-auto p-4">
          {!selectedFileId ? (
            <EmptyState
              icon={Sparkles}
              title="Select a file"
              description="Choose a file from the sidebar to start reviewing."
            />
          ) : fileLoading ? (
            <LoadingSpinner message="Loading file…" />
          ) : fileContent ? (
            <CodeViewer
              content={fileContent.content}
              filePath={fileContent.path}
              language={fileContent.language}
              annotations={fileAnnotations}
              suggestions={fileSuggestions}
              cursors={cursors}
              fileId={selectedFileId}
              onLineSelect={handleLineSelect}
              onRequestSuggestion={handleRequestSuggestion}
            />
          ) : null}
        </div>

        {/* Right panel: annotations + AI suggestions */}
        <div className="w-80 shrink-0 overflow-y-auto border-l border-surface-800 bg-surface-900/20 p-4 space-y-4">
          {/* AI Suggestions */}
          <AISuggestionPanel
            suggestions={fileSuggestions}
            onAccept={(id) => acceptSuggestion.mutate(id)}
            onDismiss={handleDismissSuggestion}
          />

          {/* Annotation threads */}
          {fileAnnotations.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-surface-500">
                Annotations ({fileAnnotations.length})
              </h3>
              {fileAnnotations.map((annotation) => (
                <AnnotationThread
                  key={annotation.id}
                  annotation={annotation}
                  onAddComment={handleAddComment}
                  onResolve={handleResolve}
                />
              ))}
            </div>
          ) : (
            selectedFileId && (
              <div className="pt-8">
                <EmptyState
                  icon={Sparkles}
                  title="No annotations yet"
                  description="Click a line number or use Shift+click to select a range and start annotating."
                />
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
