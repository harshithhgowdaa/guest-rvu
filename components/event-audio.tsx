"use client";

import { useEffect, useRef } from "react";

export function EventAudio() {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Request audible autoplay immediately alongside the intro. The browser may
    // reject this until the visitor allows autoplay for this site.
    void audio.play().catch(() => {});
  }, []);

  return <audio ref={audioRef} src="/audio/xl-alumni-gathering.mp3" preload="auto" autoPlay loop />;
}
