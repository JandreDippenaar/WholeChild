import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import UserMenu from "./UserMenu";

export default function AppShell() {
  return (
    <div className="flex h-full min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
          <div className="md:hidden text-sm font-semibold">WholeChild</div>
          <div className="ml-auto flex items-center gap-3">
            <UserMenu />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-muted/30 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
