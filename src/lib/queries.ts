import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type {
  Assessment,
  AssessmentInsert,
  Learner,
  LearnerInsert,
  LearnerUpdate,
  Profile,
  ProgressEntry,
  ProgressEntryInsert,
} from "@/types/db";

// ---------- Learners ----------

export function useLearners(opts?: Partial<UseQueryOptions<Learner[]>>) {
  return useQuery<Learner[]>({
    queryKey: ["learners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("learners")
        .select("*")
        .order("last_name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    ...opts,
  });
}

export function useLearner(id: string | undefined) {
  return useQuery<Learner | null>({
    queryKey: ["learner", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("learners")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });
}

export function useCreateLearner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: LearnerInsert) => {
      const { data, error } = await supabase
        .from("learners")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as Learner;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["learners"] }),
  });
}

export function useUpdateLearner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: LearnerUpdate }) => {
      const { data, error } = await supabase
        .from("learners")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Learner;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["learners"] });
      qc.invalidateQueries({ queryKey: ["learner", vars.id] });
    },
  });
}

export function useDeleteLearner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("learners").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["learners"] }),
  });
}

// ---------- Teachers (profiles with role=teacher) ----------

export function useTeachers() {
  return useQuery<Profile[]>({
    queryKey: ["teachers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, role, created_at")
        .order("full_name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Profile[];
    },
  });
}

export function useLearnerTeachers(learnerId: string | undefined) {
  return useQuery<Profile[]>({
    queryKey: ["learner-teachers", learnerId],
    enabled: Boolean(learnerId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("learner_teachers")
        .select("teacher:profiles!learner_teachers_teacher_id_fkey(id,email,full_name,role,created_at)")
        .eq("learner_id", learnerId!);
      if (error) throw error;
      return ((data ?? []) as unknown as { teacher: Profile }[]).map(
        (r) => r.teacher,
      );
    },
  });
}

export function useSetLearnerTeachers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      learnerId,
      teacherIds,
    }: {
      learnerId: string;
      teacherIds: string[];
    }) => {
      const { error: delErr } = await supabase
        .from("learner_teachers")
        .delete()
        .eq("learner_id", learnerId);
      if (delErr) throw delErr;
      if (teacherIds.length === 0) return;
      const rows = teacherIds.map((tid) => ({
        learner_id: learnerId,
        teacher_id: tid,
      }));
      const { error } = await supabase.from("learner_teachers").insert(rows);
      if (error) throw error;
    },
    onSuccess: (_d, vars) =>
      qc.invalidateQueries({ queryKey: ["learner-teachers", vars.learnerId] }),
  });
}

// ---------- Assessments ----------

export function useAssessments(learnerId?: string) {
  return useQuery<Assessment[]>({
    queryKey: ["assessments", learnerId ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("assessments")
        .select("*")
        .order("assessed_on", { ascending: false });
      if (learnerId) q = q.eq("learner_id", learnerId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Assessment[];
    },
  });
}

export function useCreateAssessment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AssessmentInsert) => {
      const { data, error } = await supabase
        .from("assessments")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as Assessment;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["assessments", vars.learner_id] });
      qc.invalidateQueries({ queryKey: ["assessments", "all"] });
    },
  });
}

// ---------- Progress entries ----------

export function useProgressEntries(learnerId: string | undefined) {
  return useQuery<ProgressEntry[]>({
    queryKey: ["progress", learnerId],
    enabled: Boolean(learnerId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("progress_entries")
        .select("*")
        .eq("learner_id", learnerId!)
        .order("entry_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProgressEntry[];
    },
  });
}

export function useCreateProgressEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProgressEntryInsert) => {
      const { data, error } = await supabase
        .from("progress_entries")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as ProgressEntry;
    },
    onSuccess: (_d, vars) =>
      qc.invalidateQueries({ queryKey: ["progress", vars.learner_id] }),
  });
}
