export type Guest = {
  id: string;
  name: string;
  batch: string;
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
  checkedInAt: string | null;
  status: "present" | "pending";
};
