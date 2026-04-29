import { NavLink } from "react-router-dom";
import { LayoutDashboard, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import logoUrl from "/aitsa_logo.avif?url";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/learners", label: "Learners", icon: Users },
];

export default function Sidebar() {
  return (
    <aside className="hidden h-full w-60 shrink-0 flex-col border-r bg-card md:flex">
      <div className="flex h-16 items-center justify-between gap-2 border-b px-4">
        <div className="flex flex-col leading-tight">
          <span className="text-base font-semibold tracking-tight">
            WholeChild
          </span>
          <span className="text-xs text-muted-foreground">
            Aitsa! Aftercare
          </span>
        </div>
        <img
          src={logoUrl}
          alt="Aitsa! logo"
          className="h-9 w-9 rounded object-contain"
        />
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t p-3 text-xs text-muted-foreground">
        v0.1.0
      </div>
    </aside>
  );
}
