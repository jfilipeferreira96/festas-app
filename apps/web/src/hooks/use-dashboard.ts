"use client";

import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/lib/api/dashboard";

export function useDashboardKPIs() {
  return useQuery({
    queryKey: ["dashboard", "kpis"],
    queryFn: dashboardApi.getKPIs,
    refetchInterval: 30000, // Refresh every 30s
  });
}

export function useFestasEmCurso() {
  return useQuery({
    queryKey: ["dashboard", "festas-em-curso"],
    queryFn: dashboardApi.getFestasEmCurso,
    refetchInterval: 30000,
  });
}

export function useProximasFestas() {
  return useQuery({
    queryKey: ["dashboard", "proximas-festas"],
    queryFn: dashboardApi.getProximasFestas,
    refetchInterval: 30000,
  });
}

export function useAniversarioEmBreve() {
  return useQuery({
    queryKey: ["dashboard", "aniversario-em-breve"],
    queryFn: dashboardApi.getAniversarioEmBreve,
    refetchInterval: 30000,
  });
}

export function useAniversariosProximos(dias = 30) {
  return useQuery({
    queryKey: ["dashboard", "aniversarios-proximos", dias],
    queryFn: () => dashboardApi.getAniversariosProximos(dias),
    refetchInterval: 60000,
  });
}
