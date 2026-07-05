"use client";

import React from "react";
import { useSidebar } from "@/contexts/SidebarContext";
import { Menu } from "lucide-react";

/**
 * Botão flutuante para abrir a sidebar em mobile.
 * Substitui o antigo AppHeader (barra de topo) que ocupava espaço vertical.
 * Visível apenas em ecrãs pequenos (lg:hidden).
 */
const MobileSidebarToggle: React.FC = () => {
  const { isMobileOpen, toggleMobileSidebar } = useSidebar();

  if (isMobileOpen) return null;

  return (
    <button
      onClick={toggleMobileSidebar}
      aria-label="Abrir menu"
      className="fixed top-3 left-3 z-40 flex items-center justify-center w-10 h-10 rounded-lg border border-border bg-surface text-text-secondary shadow-card hover:bg-brand-500/5 transition-colors lg:hidden"
    >
      <Menu className="w-5 h-5" />
    </button>
  );
};

export default MobileSidebarToggle;
