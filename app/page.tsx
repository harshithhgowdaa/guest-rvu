import { GuestCheckIn } from "@/components/guest-check-in";
import { EventAudio } from "@/components/event-audio";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <>
      <EventAudio />
      <GuestCheckIn />
    </>
  );
}
