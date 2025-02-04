import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
  message?: string;
}

export function LoadingSpinner({ className, message }: LoadingSpinnerProps) {
  return (
    <div className={cn("flex items-center justify-center gap-2 py-12", className)}>
      <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
      {message && <span className="text-sm text-surface-400">{message}</span>}
    </div>
  );
}
