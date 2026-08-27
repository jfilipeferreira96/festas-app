"use client";

import { useEffect, useState } from "react";

/**
 * Devolve a data/hora actual, actualizada periodicamente.
 * Usado por tabelas/cards sem relógio próprio para avaliar
 * alertas temporais (festa a acabar, lanche atrasado).
 */
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
