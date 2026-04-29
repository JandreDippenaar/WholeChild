import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Plus } from "lucide-react";
import { format } from "date-fns";
import {
  ResponsiveContainer,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import { useAuth } from "@/lib/auth";
import {
  useAssessments,
  useCreateAssessment,
  useCreateProgressEntry,
  useLearner,
  useProgressEntries,
} from "@/lib/queries";
import type { AssessmentInsert, ProgressEntryInsert } from "@/types/db";
import { ageFromDob, ASSESSMENT_DOMAINS } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { initials } from "@/lib/utils";

const PROGRESS_CATEGORIES = [
  "academic",
  "behavior",
  "social",
  "emotional",
  "physical",
] as const;

export default function LearnerDetail() {
  const { learnerId } = useParams<{ learnerId: string }>();
  const { profile } = useAuth();
  const { toast } = useToast();

  const { data: learner, isLoading } = useLearner(learnerId);
  const { data: assessments } = useAssessments(learnerId);
  const { data: progress } = useProgressEntries(learnerId);
  const createAssessment = useCreateAssessment();
  const createProgress = useCreateProgressEntry();

  const [assessOpen, setAssessOpen] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);

  if (isLoading) {
    return <div className="text-muted-foreground">Loading learner…</div>;
  }
  if (!learner) {
    return (
      <div className="space-y-3">
        <p>Learner not found.</p>
        <Button asChild variant="outline">
          <Link to="/learners">
            <ArrowLeft className="h-4 w-4" />
            Back to learners
          </Link>
        </Button>
      </div>
    );
  }

  const fullName = `${learner.first_name} ${learner.last_name}`;
  const baseline = assessments?.find((a) => a.assessment_type === "baseline");
  const radarData = ASSESSMENT_DOMAINS.map((domain) => ({
    domain,
    value: baseline?.scores?.[domain] ?? 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/learners">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="text-base">
              {initials(fullName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{fullName}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {learner.grade && <span>{learner.grade}</span>}
              {learner.date_of_birth && (
                <span>· {ageFromDob(learner.date_of_birth)} yrs</span>
              )}
              {learner.gender && (
                <span className="capitalize">· {learner.gender}</span>
              )}
              {learner.active ? (
                <Badge variant="success">Active</Badge>
              ) : (
                <Badge variant="secondary">Inactive</Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="assessments">Assessments</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Personal details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Detail label="Full name" value={fullName} />
                <Detail
                  label="Date of birth"
                  value={
                    learner.date_of_birth
                      ? format(new Date(learner.date_of_birth), "d MMM yyyy")
                      : "—"
                  }
                />
                <Detail
                  label="Gender"
                  value={learner.gender ?? "—"}
                  capitalize
                />
                <Detail label="Grade" value={learner.grade ?? "—"} />
                <Detail
                  label="Enrolled"
                  value={
                    learner.enrolled_on
                      ? format(new Date(learner.enrolled_on), "d MMM yyyy")
                      : "—"
                  }
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Guardian & notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Detail label="Guardian" value={learner.guardian_name ?? "—"} />
                <Detail
                  label="Contact"
                  value={learner.guardian_contact ?? "—"}
                />
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    Notes
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm">
                    {learner.notes ?? "—"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="assessments">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>Baseline snapshot</CardTitle>
                  <CardDescription>
                    {baseline
                      ? `Captured ${format(new Date(baseline.assessed_on), "d MMM yyyy")}`
                      : "No baseline captured yet."}
                  </CardDescription>
                </div>
                <Button size="sm" onClick={() => setAssessOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Add assessment
                </Button>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="domain" tickFormatter={cap} />
                    <PolarRadiusAxis domain={[0, 100]} />
                    <Radar
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.4}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>History</CardTitle>
              </CardHeader>
              <CardContent>
                {assessments && assessments.length > 0 ? (
                  <ul className="space-y-3">
                    {assessments.map((a) => (
                      <li
                        key={a.id}
                        className="rounded-md border p-3 text-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium capitalize">
                            {a.assessment_type}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(a.assessed_on), "d MMM yyyy")}
                          </span>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-muted-foreground sm:grid-cols-3">
                          {ASSESSMENT_DOMAINS.map((d) => (
                            <span key={d}>
                              <span className="capitalize">{d}:</span>{" "}
                              <span className="text-foreground">
                                {a.scores?.[d] ?? "—"}
                              </span>
                            </span>
                          ))}
                        </div>
                        {a.notes && (
                          <p className="mt-2 whitespace-pre-wrap text-xs">
                            {a.notes}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No assessments yet.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="progress">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Progress entries</CardTitle>
                <CardDescription>
                  Ongoing observations from teachers.
                </CardDescription>
              </div>
              <Button size="sm" onClick={() => setProgressOpen(true)}>
                <Plus className="h-4 w-4" />
                Add entry
              </Button>
            </CardHeader>
            <CardContent>
              {progress && progress.length > 0 ? (
                <ul className="space-y-3">
                  {progress.map((p) => (
                    <li key={p.id} className="rounded-md border p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium capitalize">
                          {p.category}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(p.entry_date), "d MMM yyyy")} ·
                          rating {p.rating}/5
                        </span>
                      </div>
                      {p.notes && (
                        <p className="mt-1 whitespace-pre-wrap text-xs">
                          {p.notes}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No progress entries yet.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AssessmentDialog
        open={assessOpen}
        onOpenChange={setAssessOpen}
        submitting={createAssessment.isPending}
        onSubmit={async (input) => {
          try {
            await createAssessment.mutateAsync({
              ...input,
              learner_id: learner.id,
              assessor_id: profile?.id ?? null,
            });
            toast({ title: "Assessment recorded" });
            setAssessOpen(false);
          } catch (err) {
            toast({
              title: "Could not save assessment",
              description: err instanceof Error ? err.message : String(err),
              variant: "destructive",
            });
          }
        }}
      />

      <ProgressDialog
        open={progressOpen}
        onOpenChange={setProgressOpen}
        submitting={createProgress.isPending}
        onSubmit={async (input) => {
          try {
            await createProgress.mutateAsync({
              ...input,
              learner_id: learner.id,
              author_id: profile?.id ?? null,
            });
            toast({ title: "Progress entry added" });
            setProgressOpen(false);
          } catch (err) {
            toast({
              title: "Could not save",
              description: err instanceof Error ? err.message : String(err),
              variant: "destructive",
            });
          }
        }}
      />
    </div>
  );
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function Detail({
  label,
  value,
  capitalize,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-dashed py-1.5 last:border-b-0">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className={capitalize ? "capitalize" : undefined}>{value}</span>
    </div>
  );
}

interface AssessmentDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  submitting: boolean;
  onSubmit: (
    input: Omit<AssessmentInsert, "learner_id" | "assessor_id">,
  ) => Promise<void>;
}

function AssessmentDialog({
  open,
  onOpenChange,
  submitting,
  onSubmit,
}: AssessmentDialogProps) {
  const [type, setType] = useState("baseline");
  const [date, setDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [scores, setScores] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");

  function reset() {
    setType("baseline");
    setDate(new Date().toISOString().slice(0, 10));
    setScores({});
    setNotes("");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Add assessment</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="baseline">Baseline</SelectItem>
                <SelectItem value="midyear">Mid-year</SelectItem>
                <SelectItem value="endyear">End of year</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {ASSESSMENT_DOMAINS.map((d) => (
            <div key={d} className="space-y-2">
              <Label className="capitalize">{d} (0–100)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={scores[d] ?? ""}
                onChange={(e) =>
                  setScores((s) => ({ ...s, [d]: e.target.value }))
                }
              />
            </div>
          ))}

          <div className="sm:col-span-2 space-y-2">
            <Label>Notes</Label>
            <Textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={submitting}
            onClick={async () => {
              const numericScores: Record<string, number> = {};
              for (const d of ASSESSMENT_DOMAINS) {
                const n = scores[d];
                if (n !== undefined && n !== "") {
                  const v = Number(n);
                  if (!Number.isNaN(v)) numericScores[d] = v;
                }
              }
              await onSubmit({
                assessment_type: type,
                assessed_on: date,
                scores: numericScores,
                notes: notes.trim() || null,
              });
              reset();
            }}
          >
            {submitting ? "Saving…" : "Save assessment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ProgressDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  submitting: boolean;
  onSubmit: (
    input: Omit<ProgressEntryInsert, "learner_id" | "author_id">,
  ) => Promise<void>;
}

function ProgressDialog({
  open,
  onOpenChange,
  submitting,
  onSubmit,
}: ProgressDialogProps) {
  const [category, setCategory] =
    useState<(typeof PROGRESS_CATEGORIES)[number]>("academic");
  const [date, setDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [rating, setRating] = useState(3);
  const [notes, setNotes] = useState("");

  function reset() {
    setCategory("academic");
    setDate(new Date().toISOString().slice(0, 10));
    setRating(3);
    setNotes("");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add progress entry</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2 sm:col-span-1">
              <Label>Category</Label>
              <Select
                value={category}
                onValueChange={(v) =>
                  setCategory(v as (typeof PROGRESS_CATEGORIES)[number])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROGRESS_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-1">
              <Label>Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-1">
              <Label>Rating (1–5)</Label>
              <Input
                type="number"
                min={1}
                max={5}
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={submitting}
            onClick={async () => {
              await onSubmit({
                category,
                entry_date: date,
                rating,
                notes: notes.trim() || null,
              });
              reset();
            }}
          >
            {submitting ? "Saving…" : "Save entry"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
