import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { Users, Activity, GraduationCap, ClipboardCheck } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ageFromDob, ASSESSMENT_DOMAINS, GRADES, GENDERS } from "@/lib/utils";
import { useAssessments, useLearners } from "@/lib/queries";
import { useAuth } from "@/lib/auth";

const ALL = "__all__";
const COLORS = [
  "hsl(173 80% 32%)",
  "hsl(173 70% 50%)",
  "hsl(40 90% 55%)",
  "hsl(220 70% 55%)",
  "hsl(330 70% 55%)",
];

export default function Dashboard() {
  const { profile } = useAuth();
  const { data: learners, isLoading } = useLearners();
  const { data: assessments } = useAssessments();

  const [gradeFilter, setGradeFilter] = useState<string>(ALL);
  const [genderFilter, setGenderFilter] = useState<string>(ALL);
  const [statusFilter, setStatusFilter] = useState<string>("active");

  const filtered = useMemo(() => {
    const list = learners ?? [];
    return list.filter((l) => {
      if (gradeFilter !== ALL && l.grade !== gradeFilter) return false;
      if (genderFilter !== ALL && l.gender !== genderFilter) return false;
      if (statusFilter === "active" && !l.active) return false;
      if (statusFilter === "inactive" && l.active) return false;
      return true;
    });
  }, [learners, gradeFilter, genderFilter, statusFilter]);

  const filteredIds = useMemo(() => new Set(filtered.map((l) => l.id)), [filtered]);
  const filteredAssessments = useMemo(
    () => (assessments ?? []).filter((a) => filteredIds.has(a.learner_id)),
    [assessments, filteredIds],
  );

  const baselineCount = useMemo(
    () =>
      new Set(
        filteredAssessments
          .filter((a) => a.assessment_type === "baseline")
          .map((a) => a.learner_id),
      ).size,
    [filteredAssessments],
  );

  const ages = filtered
    .map((l) => ageFromDob(l.date_of_birth))
    .filter((a): a is number => a !== null);
  const avgAge = ages.length
    ? (ages.reduce((s, a) => s + a, 0) / ages.length).toFixed(1)
    : "—";

  const byGrade = useMemo(() => {
    const counts = new Map<string, number>();
    for (const l of filtered) {
      const k = l.grade ?? "Unspecified";
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return [...counts.entries()].map(([grade, count]) => ({ grade, count }));
  }, [filtered]);

  const byGender = useMemo(() => {
    const counts = new Map<string, number>();
    for (const l of filtered) {
      const k = l.gender ?? "unspecified";
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return [...counts.entries()].map(([gender, count]) => ({ gender, count }));
  }, [filtered]);

  const baselineDomainAverages = useMemo(() => {
    const baselines = filteredAssessments.filter(
      (a) => a.assessment_type === "baseline",
    );
    return ASSESSMENT_DOMAINS.map((d) => {
      const values = baselines
        .map((b) => b.scores?.[d])
        .filter((v): v is number => typeof v === "number");
      return {
        domain: d,
        average: values.length
          ? Math.round(values.reduce((s, v) => s + v, 0) / values.length)
          : 0,
      };
    });
  }, [filteredAssessments]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Welcome back{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 md:w-auto md:grid-cols-3">
          <Select value={gradeFilter} onValueChange={setGradeFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Grade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All grades</SelectItem>
              {GRADES.map((g) => (
                <SelectItem key={g} value={g}>
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={genderFilter} onValueChange={setGenderFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All</SelectItem>
              {GENDERS.map((g) => (
                <SelectItem key={g} value={g} className="capitalize">
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value={ALL}>All</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Kpi
          icon={<Users className="h-4 w-4" />}
          label="Learners"
          value={isLoading ? "" : String(filtered.length)}
        />
        <Kpi
          icon={<GraduationCap className="h-4 w-4" />}
          label="Grades represented"
          value={String(byGrade.length)}
        />
        <Kpi
          icon={<ClipboardCheck className="h-4 w-4" />}
          label="Baselines captured"
          value={`${baselineCount} / ${filtered.length}`}
        />
        <Kpi
          icon={<Activity className="h-4 w-4" />}
          label="Average age"
          value={String(avgAge)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Learners by grade</CardTitle>
            <CardDescription>Distribution across the cohort.</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byGrade}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                <XAxis dataKey="grade" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={6} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Baseline domain averages</CardTitle>
            <CardDescription>
              Mean score per domain across captured baselines.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={baselineDomainAverages}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                <XAxis
                  dataKey="domain"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v: string) => v.charAt(0).toUpperCase() + v.slice(1)}
                />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="average" fill="hsl(40 90% 55%)" radius={6} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Gender breakdown</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={byGender}
                  dataKey="count"
                  nameKey="gender"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label
                >
                  {byGender.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        {value === "" ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <div className="text-2xl font-semibold">{value}</div>
        )}
      </CardContent>
    </Card>
  );
}
