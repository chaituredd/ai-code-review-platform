import { FileCode, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CodeFileListItem } from "@/types";

interface FileSidebarProps {
  files: CodeFileListItem[];
  selectedFileId: string | null;
  onSelectFile: (fileId: string) => void;
}

const languageColors: Record<string, string> = {
  python: "text-yellow-400",
  typescript: "text-blue-400",
  javascript: "text-amber-400",
  java: "text-orange-400",
  go: "text-cyan-400",
  rust: "text-orange-500",
  cpp: "text-pink-400",
  default: "text-surface-400",
};

export function FileSidebar({ files, selectedFileId, onSelectFile }: FileSidebarProps) {
  return (
    <div className="flex h-full flex-col border-r border-surface-800 bg-surface-900/30">
      <div className="border-b border-surface-800 px-4 py-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-surface-500">
          Files ({files.length})
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {files.map((file) => {
          const isSelected = file.id === selectedFileId;
          const langColor =
            languageColors[file.language] || languageColors.default;

          return (
            <button
              key={file.id}
              onClick={() => onSelectFile(file.id)}
              className={cn(
                "flex w-full items-center gap-2 px-4 py-2 text-left transition-colors",
                isSelected
                  ? "bg-brand-600/10 border-r-2 border-brand-500"
                  : "hover:bg-surface-800/50"
              )}
            >
              <FileCode className={cn("h-4 w-4 shrink-0", langColor)} />
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "truncate text-sm",
                    isSelected ? "text-brand-300 font-medium" : "text-surface-300"
                  )}
                >
                  {file.path.split("/").pop()}
                </p>
                <p className="truncate text-[0.65rem] text-surface-600">
                  {file.path}
                </p>
              </div>
              <span className="text-[0.65rem] text-surface-600">
                {file.line_count}L
              </span>
              {isSelected && (
                <ChevronRight className="h-3 w-3 shrink-0 text-brand-500" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
