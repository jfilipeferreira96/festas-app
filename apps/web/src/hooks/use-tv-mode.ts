"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "tv-mode";
const BODY_CLASS = "tv-mode";

/**
 * Manages TV display mode for ceiling screens.
 *
 * When active:
 *  - Adds `tv-mode` class to <body> (CSS hides sidebar + header)
 *  - Requests browser fullscreen on the document element
 *  - Persists preference in localStorage
 */
export function useTVMode() {
  const [isTVMode, setIsTVMode] = useState(false);

  // Sync from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) === "true";
    if (stored) {
      document.body.classList.add(BODY_CLASS);
      setIsTVMode(true);
    }
  }, []);

  // Listen for fullscreen changes (e.g. user presses Esc)
  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement && isTVMode) {
        document.body.classList.remove(BODY_CLASS);
        localStorage.setItem(STORAGE_KEY, "false");
        setIsTVMode(false);
      }
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, [isTVMode]);

  const enterTVMode = useCallback(() => {
    document.body.classList.add(BODY_CLASS);
    localStorage.setItem(STORAGE_KEY, "true");
    setIsTVMode(true);
    // Request browser fullscreen (best-effort, may be blocked)
    document.documentElement.requestFullscreen?.().catch(() => {});
  }, []);

  const exitTVMode = useCallback(() => {
    document.body.classList.remove(BODY_CLASS);
    localStorage.setItem(STORAGE_KEY, "false");
    setIsTVMode(false);
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  const toggleTVMode = useCallback(() => {
    if (isTVMode) exitTVMode();
    else enterTVMode();
  }, [isTVMode, enterTVMode, exitTVMode]);

  return { isTVMode, enterTVMode, exitTVMode, toggleTVMode };
}
