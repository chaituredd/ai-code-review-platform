import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import {
  LayoutDashboard,
  GitPullRequest,
  LogOut,
  Sparkles,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { cn, getInitials } from "@/lib/utils";

export default function AppLayout() {
  const { user, isLoading, fetchProfile, logout } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface-950">
        <div className="flex items-center gap-3 text-surface-400">
          <Sparkles className="h-5 w-5 animate-pulse-dot" />
          <span className="text-sm font-medium">Loading…</span>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const navItems = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  ];

  return (
    <div className="flex h-screen bg-surface-950">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r border-surface-800 bg-surface-900/50">
        {/* Brand */}
        <div className="flex items-center gap-3 border-b border-surface-800 px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
            <GitPullRequest className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white">
              CodeLens
            </h1>
            <p className="text-[0.65rem] font-medium uppercase tracking-widest text-brand-400">
              AI Review
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-brand-600/10 text-brand-400"
                    : "text-surface-400 hover:bg-surface-800 hover:text-surface-200"
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="border-t border-surface-800 p-3">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-700 text-xs font-bold text-white">
              {getInitials(user?.username || "U")}
            </div>
            <div className="flex-1 truncate">
              <p className="text-sm font-medium text-surface-200 truncate">
                {user?.username}
              </p>
              <p className="text-xs text-surface-500 truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-md p-1.5 text-surface-500 hover:bg-surface-800 hover:text-surface-300 transition-colors"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
