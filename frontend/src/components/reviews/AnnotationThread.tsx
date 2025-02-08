import { useState } from "react";
import {
  CheckCircle2,
  MessageSquare,
  Sparkles,
  Send,
} from "lucide-react";
import { cn, timeAgo, getInitials } from "@/lib/utils";
import type { Annotation } from "@/types";

interface AnnotationThreadProps {
  annotation: Annotation;
  onAddComment: (annotationId: string, body: string) => void;
  onResolve: (annotationId: string) => void;
}

export function AnnotationThread({
  annotation,
  onAddComment,
  onResolve,
}: AnnotationThreadProps) {
  const [newComment, setNewComment] = useState("");
  const [isExpanded, setIsExpanded] = useState(true);

  const handleSubmit = () => {
    if (!newComment.trim()) return;
    onAddComment(annotation.id, newComment.trim());
    setNewComment("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  };

  return (
    <div
      className={cn(
        "card animate-fade-in overflow-hidden",
        annotation.resolved && "opacity-60"
      )}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between border-b border-surface-800 px-4 py-2.5 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-700/40 text-[0.6rem] font-bold text-brand-300">
            {getInitials(annotation.author.username)}
          </div>
          <span className="text-xs font-medium text-surface-300">
            {annotation.author.username}
          </span>
          <span className="text-xs text-surface-600">
            L{annotation.start_line}
            {annotation.end_line !== annotation.start_line &&
              `–${annotation.end_line}`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-xs text-surface-500">
            <MessageSquare className="h-3 w-3" />
            {annotation.comment_count}
          </span>
          {!annotation.resolved && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onResolve(annotation.id);
              }}
              className="rounded-md px-2 py-0.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/10 transition-colors"
            >
              Resolve
            </button>
          )}
          {annotation.resolved && (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          )}
        </div>
      </div>

      {/* Comments */}
      {isExpanded && (
        <div className="divide-y divide-surface-800/60">
          {annotation.comments.map((comment) => (
            <div key={comment.id} className="px-4 py-3 animate-slide-up">
              <div className="flex items-center gap-2 mb-1.5">
                <div
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full text-[0.55rem] font-bold",
                    comment.is_ai_generated
                      ? "bg-purple-600/30 text-purple-300"
                      : "bg-surface-700 text-surface-300"
                  )}
                >
                  {comment.is_ai_generated ? (
                    <Sparkles className="h-2.5 w-2.5" />
                  ) : (
                    getInitials(comment.author.username)
                  )}
                </div>
                <span className="text-xs font-medium text-surface-300">
                  {comment.is_ai_generated ? "AI Assistant" : comment.author.username}
                </span>
                <span className="text-[0.65rem] text-surface-600">
                  {timeAgo(comment.created_at)}
                </span>
              </div>
              <p className="pl-7 text-sm leading-relaxed text-surface-300">
                {comment.body}
              </p>
            </div>
          ))}

          {/* New comment input */}
          {!annotation.resolved && (
            <div className="flex items-start gap-2 px-4 py-3">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Write a comment… (⌘+Enter to send)"
                rows={2}
                className="input-field flex-1 resize-none text-sm"
              />
              <button
                onClick={handleSubmit}
                disabled={!newComment.trim()}
                className="mt-1 rounded-lg bg-brand-600 p-2 text-white transition-colors hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
