import { Users } from "lucide-react";
import { getInitials, cn } from "@/lib/utils";

interface ActiveUsersProps {
  users: { id: number; username: string }[];
  isConnected: boolean;
}

export function ActiveUsers({ users, isConnected }: ActiveUsersProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5">
        <div
          className={cn(
            "h-2 w-2 rounded-full",
            isConnected ? "bg-emerald-500 animate-pulse-dot" : "bg-red-500"
          )}
        />
        <span className="text-xs text-surface-500">
          {isConnected ? "Live" : "Disconnected"}
        </span>
      </div>

      {users.length > 0 && (
        <>
          <div className="h-4 w-px bg-surface-700" />
          <div className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5 text-surface-500" />
            <div className="flex -space-x-2">
              {users.slice(0, 5).map((user, i) => (
                <div
                  key={user.id}
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface-900 text-[0.55rem] font-bold text-white",
                    [
                      "bg-pink-600",
                      "bg-cyan-600",
                      "bg-amber-600",
                      "bg-emerald-600",
                      "bg-purple-600",
                    ][i % 5]
                  )}
                  title={user.username}
                >
                  {getInitials(user.username)}
                </div>
              ))}
            </div>
            {users.length > 5 && (
              <span className="ml-1 text-xs text-surface-500">
                +{users.length - 5}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
