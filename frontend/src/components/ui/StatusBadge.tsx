import { cn } from "@/lib/utils";
import type { SessionStatus } from "@/types";

const statusConfig: Record<
  SessionStatus,
  { label: string; className: string }
> = {
  open: {
    label: "Open",
    className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  in_progress: {
    label: "In Progress",
    className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  completed: {
    label: "Completed",
    className: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
  archived: {
    label: "Archived",
    className: "bg-surface-500/10 text-surface-400 border-surface-500/20",
  },
};

interface StatusBadgeProps {
  status: SessionStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
