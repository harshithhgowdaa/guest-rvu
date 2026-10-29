export type Guest = {
  id: string;
  name: string;
  batch?: string | null;
  tableNumber?: string | null;
};

export type AttendanceRecord = {
  guestId: string;
  checkedInAt: string;
};

export type CheckInResult =
  | { status: "checked_in"; guest: Guest; checkedInAt: string }
  | { status: "already_checked_in"; guest: Guest; checkedInAt: string }
  | { status: "not_found" };

export type DashboardEntry = Guest & {
  batch: string | null;
  checkedInAt: string | null;
  status: "present" | "pending";
};

export type BatchProgress = {
  batch: string;
  registered: number;
  present: number;
  pending: number;
  percentage: number;
};
