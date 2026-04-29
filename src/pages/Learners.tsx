import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  useCreateLearner,
  useDeleteLearner,
  useLearners,
  useUpdateLearner,
} from "@/lib/queries";
import type { Learner, LearnerInsert } from "@/types/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ageFromDob, GRADES } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import LearnerForm from "@/components/learners/LearnerForm";

const ALL = "__all__";

export default function Learners() {
  const { isAdmin } = useAuth();
  const { data: learners, isLoading } = useLearners();
  const createMut = useCreateLearner();
  const updateMut = useUpdateLearner();
  const deleteMut = useDeleteLearner();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [grade, setGrade] = useState<string>(ALL);
  const [openCreate, setOpenCreate] = useState(false);
  const [editing, setEditing] = useState<Learner | null>(null);
  const [deleting, setDeleting] = useState<Learner | null>(null);

  const filtered = useMemo(() => {
    const list = learners ?? [];
    const q = search.trim().toLowerCase();
    return list.filter((l) => {
      if (grade !== ALL && l.grade !== grade) return false;
      if (!q) return true;
      const hay = `${l.first_name} ${l.last_name} ${l.guardian_name ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [learners, search, grade]);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Learners</h1>
          <p className="text-sm text-muted-foreground">
            {learners?.length ?? 0} total · {filtered.length} shown
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setOpenCreate(true)}>
            <Plus className="h-4 w-4" />
            Add learner
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or guardian…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="w-44">
            <Select value={grade} onValueChange={setGrade}>
              <SelectTrigger>
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
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Guardian</TableHead>
                <TableHead>Status</TableHead>
                {isAdmin && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 6 : 5}>
                    <div className="space-y-2 py-2">
                      <Skeleton className="h-5 w-1/3" />
                      <Skeleton className="h-5 w-1/2" />
                      <Skeleton className="h-5 w-1/4" />
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={isAdmin ? 6 : 5}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    No learners match your filters.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((l) => (
                <TableRow key={l.id} className="cursor-pointer">
                  <TableCell>
                    <Link
                      to={`/learners/${l.id}`}
                      className="font-medium hover:underline"
                    >
                      {l.first_name} {l.last_name}
                    </Link>
                  </TableCell>
                  <TableCell>{l.grade ?? "—"}</TableCell>
                  <TableCell>{ageFromDob(l.date_of_birth) ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {l.guardian_name ?? "—"}
                    {l.guardian_contact && (
                      <span className="ml-1 text-xs">· {l.guardian_contact}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {l.active ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setEditing(l)}
                        aria-label="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleting(l)}
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add learner</DialogTitle>
            <DialogDescription>
              Capture the basics — you can add baseline assessment results from
              the learner's profile next.
            </DialogDescription>
          </DialogHeader>
          <LearnerForm
            submitting={createMut.isPending}
            submitLabel="Create learner"
            onCancel={() => setOpenCreate(false)}
            onSubmit={async (values: LearnerInsert) => {
              try {
                await createMut.mutateAsync(values);
                toast({
                  title: "Learner added",
                  description: `${values.first_name} ${values.last_name} created.`,
                });
                setOpenCreate(false);
              } catch (err) {
                toast({
                  title: "Could not add learner",
                  description: err instanceof Error ? err.message : String(err),
                  variant: "destructive",
                });
              }
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit learner</DialogTitle>
          </DialogHeader>
          {editing && (
            <LearnerForm
              initial={editing}
              submitting={updateMut.isPending}
              submitLabel="Save changes"
              onCancel={() => setEditing(null)}
              onSubmit={async (patch) => {
                try {
                  await updateMut.mutateAsync({ id: editing.id, patch });
                  toast({ title: "Learner updated" });
                  setEditing(null);
                } catch (err) {
                  toast({
                    title: "Could not save",
                    description:
                      err instanceof Error ? err.message : String(err),
                    variant: "destructive",
                  });
                }
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleting)} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete learner?</DialogTitle>
            <DialogDescription>
              This will permanently remove {deleting?.first_name}{" "}
              {deleting?.last_name} and all their assessments and progress
              entries. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMut.isPending}
              onClick={async () => {
                if (!deleting) return;
                try {
                  await deleteMut.mutateAsync(deleting.id);
                  toast({ title: "Learner deleted" });
                  setDeleting(null);
                } catch (err) {
                  toast({
                    title: "Could not delete",
                    description:
                      err instanceof Error ? err.message : String(err),
                    variant: "destructive",
                  });
                }
              }}
            >
              {deleteMut.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
