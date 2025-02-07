import { useCallback, useMemo, useState } from "react";
import { MessageSquarePlus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Annotation, AISuggestion, CursorPosition } from "@/types";

interface CodeViewerProps {
  content: string;
  filePath: string;
  language: string;
  annotations: Annotation[];
  suggestions: AISuggestion[];
  cursors: Map<number, CursorPosition>;
  fileId: string;
  onLineSelect: (startLine: number, endLine: number) => void;
  onRequestSuggestion: (startLine: number, endLine: number) => void;
}

// Simple color palette for cursor indicators
const cursorColors = [
  "bg-pink-500",
  "bg-cyan-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-purple-500",
];

export function CodeViewer({
  content,
  filePath: _filePath,
  language: _language,
  annotations,
  suggestions,
  cursors,
  fileId,
  onLineSelect,
  onRequestSuggestion,
}: CodeViewerProps) {
  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null);
  const [hoveredLine, setHoveredLine] = useState<number | null>(null);

  const lines = useMemo(() => content.split("\n"), [content]);

  // Map line numbers to annotations
  const lineAnnotations = useMemo(() => {
    const map = new Map<number, Annotation[]>();
    for (const ann of annotations) {
      for (let l = ann.start_line; l <= ann.end_line; l++) {
        const arr = map.get(l) || [];
        arr.push(ann);
        map.set(l, arr);
      }
    }
    return map;
  }, [annotations]);

  // Map line numbers to AI suggestions
  const lineSuggestions = useMemo(() => {
    const map = new Map<number, AISuggestion[]>();
    for (const sug of suggestions) {
      for (let l = sug.start_line; l <= sug.end_line; l++) {
        const arr = map.get(l) || [];
        arr.push(sug);
        map.set(l, arr);
      }
    }
    return map;
  }, [suggestions]);

  // Get cursors on the current file
  const fileCursors = useMemo(() => {
    const result = new Map<number, { username: string; color: string }[]>();
    let i = 0;
    cursors.forEach((cursor) => {
      if (cursor.file_id === fileId) {
        const arr = result.get(cursor.line) || [];
        arr.push({
          username: cursor.user.username,
          color: cursorColors[i % cursorColors.length],
        });
        result.set(cursor.line, arr);
        i++;
      }
    });
    return result;
  }, [cursors, fileId]);

  const handleLineClick = useCallback(
    (lineNum: number, e: React.MouseEvent) => {
      if (e.shiftKey && selectionStart !== null) {
        const start = Math.min(selectionStart, lineNum);
        const end = Math.max(selectionStart, lineNum);
        setSelectionEnd(end);
        onLineSelect(start, end);
      } else {
        setSelectionStart(lineNum);
        setSelectionEnd(lineNum);
        onLineSelect(lineNum, lineNum);
      }
    },
    [selectionStart, onLineSelect]
  );

  const isLineSelected = useCallback(
    (lineNum: number) => {
      if (selectionStart === null || selectionEnd === null) return false;
      const start = Math.min(selectionStart, selectionEnd);
      const end = Math.max(selectionStart, selectionEnd);
      return lineNum >= start && lineNum <= end;
    },
    [selectionStart, selectionEnd]
  );

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse font-mono text-code">
          <tbody>
            {lines.map((line, idx) => {
              const lineNum = idx + 1;
              const hasAnnotation = lineAnnotations.has(lineNum);
              const hasSuggestion = lineSuggestions.has(lineNum);
              const selected = isLineSelected(lineNum);
              const cursorUsers = fileCursors.get(lineNum);

              return (
                <tr
                  key={lineNum}
                  className={cn(
                    "group transition-colors",
                    selected && "bg-brand-600/10",
                    !selected && hoveredLine === lineNum && "bg-surface-800/50",
                    hasAnnotation && !selected && "bg-amber-500/5",
                    hasSuggestion && !selected && "bg-purple-500/5"
                  )}
                  onMouseEnter={() => setHoveredLine(lineNum)}
                  onMouseLeave={() => setHoveredLine(null)}
                >
                  {/* Gutter: annotation / suggestion indicators */}
                  <td className="w-4 select-none px-0">
                    <div className="flex items-center justify-center gap-0.5">
                      {hasAnnotation && (
                        <div className="h-full w-0.5 bg-amber-500" />
                      )}
                      {hasSuggestion && (
                        <div className="h-full w-0.5 bg-purple-500" />
                      )}
                    </div>
                  </td>

                  {/* Line number */}
                  <td
                    className={cn(
                      "w-12 cursor-pointer select-none px-3 text-right text-xs",
                      selected
                        ? "text-brand-400"
                        : "text-surface-600 group-hover:text-surface-400"
                    )}
                    onClick={(e) => handleLineClick(lineNum, e)}
                  >
                    {lineNum}
                  </td>

                  {/* Actions gutter */}
                  <td className="w-8 select-none px-0">
                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onLineSelect(lineNum, lineNum)}
                        className="rounded p-0.5 text-surface-500 hover:text-brand-400"
                        title="Add annotation"
                      >
                        <MessageSquarePlus className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => onRequestSuggestion(lineNum, Math.min(lineNum + 5, lines.length))}
                        className="rounded p-0.5 text-surface-500 hover:text-purple-400"
                        title="Get AI suggestion"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>

                  {/* Code content */}
                  <td className="whitespace-pre px-4 py-0 text-surface-200">
                    {line || " "}
                    {/* Cursor indicators */}
                    {cursorUsers?.map((cu) => (
                      <span
                        key={cu.username}
                        className={cn(
                          "ml-1 inline-flex items-center rounded px-1.5 py-0 text-[0.6rem] font-medium text-white",
                          cu.color
                        )}
                      >
                        {cu.username}
                      </span>
                    ))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
