// Hand-written Supabase schema types. Mirrors supabase/migrations/0001_init.sql.
// If you change the SQL, update this file too (or generate it with `supabase gen types typescript`).

export type Role = "admin" | "teacher";
export type Gender = "female" | "male" | "other";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: Role;
  created_at: string;
}

export interface Learner {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  gender: Gender | null;
  grade: string | null;
  guardian_name: string | null;
  guardian_contact: string | null;
  notes: string | null;
  enrolled_on: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export type LearnerInsert = Omit<Learner, "id" | "created_at" | "updated_at"> & {
  id?: string;
};
export type LearnerUpdate = Partial<LearnerInsert>;

export interface LearnerTeacher {
  learner_id: string;
  teacher_id: string;
}

export interface AssessmentScores {
  literacy?: number;
  numeracy?: number;
  social?: number;
  emotional?: number;
  physical?: number;
  [key: string]: number | undefined;
}

export interface Assessment {
  id: string;
  learner_id: string;
  assessment_type: string;
  assessed_on: string;
  assessor_id: string | null;
  scores: AssessmentScores;
  notes: string | null;
  created_at: string;
}

export type AssessmentInsert = Omit<Assessment, "id" | "created_at">;
export type AssessmentUpdate = Partial<AssessmentInsert>;

export interface ProgressEntry {
  id: string;
  learner_id: string;
  entry_date: string;
  author_id: string | null;
  category: "academic" | "behavior" | "social" | "emotional" | "physical";
  rating: number;
  notes: string | null;
  created_at: string;
}

export type ProgressEntryInsert = Omit<ProgressEntry, "id" | "created_at">;

// Minimal Database typing surface for supabase-js generic.
type Relationships = readonly never[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string };
        Update: Partial<Profile>;
        Relationships: Relationships;
      };
      learners: {
        Row: Learner;
        Insert: LearnerInsert;
        Update: LearnerUpdate;
        Relationships: Relationships;
      };
      learner_teachers: {
        Row: LearnerTeacher;
        Insert: LearnerTeacher;
        Update: Partial<LearnerTeacher>;
        Relationships: Relationships;
      };
      assessments: {
        Row: Assessment;
        Insert: AssessmentInsert;
        Update: AssessmentUpdate;
        Relationships: Relationships;
      };
      progress_entries: {
        Row: ProgressEntry;
        Insert: ProgressEntryInsert;
        Update: Partial<ProgressEntryInsert>;
        Relationships: Relationships;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: Role;
      gender: Gender;
    };
    CompositeTypes: Record<string, never>;
  };
}
