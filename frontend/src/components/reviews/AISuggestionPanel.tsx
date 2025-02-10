import { Check, X, Sparkles, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AISuggestion } from "@/types";

interface AISuggestionPanelProps {
  suggestions: AISuggestion[];
  onAccept: (id: string) => void;
  onDismiss: (id: string) => void;
}

export function AISuggestionPanel({
  suggestions,
  onAccept,
  onDismiss,
}: AISuggestionPanelProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <Sparkles className="h-4 w-4 text-purple-400" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-purple-400">
          AI Suggestions
        </h3>
        <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-xs font-medium text-purple-300">
          {suggestions.filter((s) => !s.accepted).length} pending
        </span>
      </div>

      {suggestions.map((suggestion) => (
        <div
          key={suggestion.id}
          className={cn(
            "card animate-slide-up overflow-hidden border-purple-500/20",
            suggestion.accepted && "opacity-60"
          )}
        >
          {/* Confidence bar */}
          <div className="relative h-1 bg-surface-800">
            <div
              className={cn(
                "absolute left-0 top-0 h-full transition-all",
                suggestion.confidence >= 0.7
                  ? "bg-emerald-500"
                  : suggestion.confidence >= 0.4
                    ? "bg-amber-500"
                    : "bg-red-500"
              )}
              style={{ width: `${suggestion.confidence * 100}%` }}
            />
          </div>

          <div className="px-4 py-3">
            {/* Location */}
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-surface-500">
                Lines {suggestion.start_line}–{suggestion.end_line}
              </span>
              <div className="flex items-center gap-1 text-xs text-surface-500">
                <TrendingUp className="h-3 w-3" />
                {Math.round(suggestion.confidence * 100)}% confidence
              </div>
            </div>

            {/* Suggestion text */}
            <p className="text-sm leading-relaxed text-surface-200">
              {suggestion.suggestion_text}
            </p>

            {/* Actions */}
            {!suggestion.accepted && (
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => onAccept(suggestion.id)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600/10 px-3 py-1.5 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-600/20"
                >
                  <Check className="h-3 w-3" />
                  Accept
                </button>
                <button
                  onClick={() => onDismiss(suggestion.id)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-surface-800 px-3 py-1.5 text-xs font-medium text-surface-400 transition-colors hover:bg-surface-700"
                >
                  <X className="h-3 w-3" />
                  Dismiss
                </button>
              </div>
            )}
            {suggestion.accepted && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-500">
                <Check className="h-3 w-3" />
                Accepted
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
