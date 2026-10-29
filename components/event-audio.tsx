"use client";

import { useEffect, useRef } from "react";

export function EventAudio() {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const removeRetryListeners = () => {
      window.removeEventListener("pointerdown", retryPlayback);
      window.removeEventListener("keydown", retryPlayback);
    };

    const retryPlayback = () => {
      void audio.play().then(removeRetryListeners).catch(() => {
        // Keep retrying on later natural interactions if playback remains blocked.
      });
    };

    const stopPlayback = () => audio.pause();
    const stopWhenHidden = () => {
      if (document.visibilityState === "hidden") stopPlayback();
    };

    document.addEventListener("visibilitychange", stopWhenHidden);
    window.addEventListener("pagehide", stopPlayback);

    // Request audible autoplay at the intro. If the browser blocks it, retry on
    // the guest's normal interaction with the page, without an extra start screen.
    void audio.play().then(removeRetryListeners).catch(() => {
      window.addEventListener("pointerdown", retryPlayback);
      window.addEventListener("keydown", retryPlayback);
    });

    return () => {
      removeRetryListeners();
      document.removeEventListener("visibilitychange", stopWhenHidden);
      window.removeEventListener("pagehide", stopPlayback);
    };
  }, []);

  return <audio ref={audioRef} src="/audio/xl-alumni-gathering.mp3" preload="auto" autoPlay loop />;
}
