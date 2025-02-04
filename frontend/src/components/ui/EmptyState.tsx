import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-800/80">
        <Icon className="h-6 w-6 text-surface-500" />
      </div>
      <h3 className="text-sm font-semibold text-surface-200">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-surface-500">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
