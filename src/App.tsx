import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import AppShell from "@/components/layout/AppShell";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Learners from "@/pages/Learners";
import LearnerDetail from "@/pages/LearnerDetail";
import NotFound from "@/pages/NotFound";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/learners" element={<Learners />} />
        <Route path="/learners/:learnerId" element={<LearnerDetail />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
