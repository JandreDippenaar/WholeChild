import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GENDERS, GRADES } from "@/lib/utils";
import type { Learner, LearnerInsert } from "@/types/db";

const schema = z.object({
  first_name: z.string().min(1, "Required").max(80),
  last_name: z.string().min(1, "Required").max(80),
  date_of_birth: z.string().optional().nullable(),
  gender: z.enum(GENDERS).optional().nullable(),
  grade: z.string().optional().nullable(),
  guardian_name: z.string().optional().nullable(),
  guardian_contact: z.string().optional().nullable(),
  enrolled_on: z.string().optional().nullable(),
  active: z.boolean(),
  notes: z.string().optional().nullable(),
});

export type LearnerFormValues = z.infer<typeof schema>;

interface Props {
  initial?: Learner | null;
  submitting?: boolean;
  submitLabel?: string;
  onSubmit: (values: LearnerInsert) => void | Promise<void>;
  onCancel?: () => void;
}

const NONE = "__none__";

export default function LearnerForm({
  initial,
  submitting,
  submitLabel = "Save",
  onSubmit,
  onCancel,
}: Props) {
  const form = useForm<LearnerFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      first_name: initial?.first_name ?? "",
      last_name: initial?.last_name ?? "",
      date_of_birth: initial?.date_of_birth ?? "",
      gender: initial?.gender ?? null,
      grade: initial?.grade ?? null,
      guardian_name: initial?.guardian_name ?? "",
      guardian_contact: initial?.guardian_contact ?? "",
      enrolled_on: initial?.enrolled_on ?? "",
      active: initial?.active ?? true,
      notes: initial?.notes ?? "",
    },
  });

  useEffect(() => {
    if (initial) {
      form.reset({
        first_name: initial.first_name,
        last_name: initial.last_name,
        date_of_birth: initial.date_of_birth ?? "",
        gender: initial.gender,
        grade: initial.grade,
        guardian_name: initial.guardian_name ?? "",
        guardian_contact: initial.guardian_contact ?? "",
        enrolled_on: initial.enrolled_on ?? "",
        active: initial.active,
        notes: initial.notes ?? "",
      });
    }
  }, [initial, form]);

  async function handle(values: LearnerFormValues) {
    const payload: LearnerInsert = {
      first_name: values.first_name.trim(),
      last_name: values.last_name.trim(),
      date_of_birth: values.date_of_birth || null,
      gender: (values.gender ?? null) as LearnerInsert["gender"],
      grade: values.grade || null,
      guardian_name: values.guardian_name?.trim() || null,
      guardian_contact: values.guardian_contact?.trim() || null,
      enrolled_on: values.enrolled_on || null,
      active: values.active,
      notes: values.notes?.trim() || null,
    };
    await onSubmit(payload);
  }

  const errors = form.formState.errors;

  return (
    <form
      onSubmit={form.handleSubmit(handle)}
      className="grid gap-4 sm:grid-cols-2"
    >
      <div className="space-y-2">
        <Label htmlFor="first_name">First name</Label>
        <Input id="first_name" {...form.register("first_name")} />
        {errors.first_name && (
          <p className="text-xs text-destructive">{errors.first_name.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="last_name">Last name</Label>
        <Input id="last_name" {...form.register("last_name")} />
        {errors.last_name && (
          <p className="text-xs text-destructive">{errors.last_name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="date_of_birth">Date of birth</Label>
        <Input
          id="date_of_birth"
          type="date"
          {...form.register("date_of_birth")}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="gender">Gender</Label>
        <Select
          value={form.watch("gender") ?? NONE}
          onValueChange={(v) =>
            form.setValue(
              "gender",
              v === NONE ? null : (v as LearnerFormValues["gender"]),
            )
          }
        >
          <SelectTrigger id="gender">
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>—</SelectItem>
            {GENDERS.map((g) => (
              <SelectItem key={g} value={g} className="capitalize">
                {g}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="grade">Grade</Label>
        <Select
          value={form.watch("grade") ?? NONE}
          onValueChange={(v) =>
            form.setValue("grade", v === NONE ? null : v)
          }
        >
          <SelectTrigger id="grade">
            <SelectValue placeholder="Select grade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>—</SelectItem>
            {GRADES.map((g) => (
              <SelectItem key={g} value={g}>
                {g}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="enrolled_on">Enrolled on</Label>
        <Input id="enrolled_on" type="date" {...form.register("enrolled_on")} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="guardian_name">Guardian name</Label>
        <Input id="guardian_name" {...form.register("guardian_name")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="guardian_contact">Guardian contact</Label>
        <Input
          id="guardian_contact"
          placeholder="Phone or email"
          {...form.register("guardian_contact")}
        />
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          rows={3}
          placeholder="Anything teachers should know…"
          {...form.register("notes")}
        />
      </div>

      <label className="flex items-center gap-2 sm:col-span-2 text-sm">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-input"
          {...form.register("active")}
        />
        Active (currently enrolled)
      </label>

      <div className="flex justify-end gap-2 sm:col-span-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
