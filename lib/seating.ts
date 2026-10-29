import seating from "@/data/seating.json";

export function getTableNumber(guestId: string): string | null {
  return (seating as Record<string, string>)[guestId] ?? null;
}
