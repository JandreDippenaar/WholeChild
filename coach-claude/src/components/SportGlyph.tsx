import {
  Activity,
  Bike,
  Dumbbell,
  Footprints,
  HeartPulse,
  Mountain,
  PersonStanding,
  Waves,
} from "lucide-react";
import type { SportCategory } from "../types";

const MAP: Record<SportCategory, typeof Activity> = {
  running: Footprints,
  cycling: Bike,
  walking: PersonStanding,
  hiking: Mountain,
  swimming: Waves,
  strength: Dumbbell,
  cardio: HeartPulse,
  other: Activity,
};

export function SportGlyph({ sport, size = 18 }: { sport: SportCategory; size?: number }) {
  const Icon = MAP[sport] ?? Activity;
  return <Icon size={size} />;
}
