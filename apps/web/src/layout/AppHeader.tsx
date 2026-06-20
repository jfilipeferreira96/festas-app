"use client";

import React, { useState } from "react";
import { useSidebar } from "@/contexts/SidebarContext";
import { useSignOut } from "@/hooks/useSignOut";
import { Menu, X, LogOut } from "lucide-react";
import DbBadge from "@/components/DbBadge";

interface AppHeaderProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

const AppHeader: React.FC<AppHeaderProps> = ({ user }) => {
  const { isMobileOpen, toggleMobileSidebar } = useSidebar();
  const { handleSignOut } = useSignOut();
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex w-full bg-surface border-b border-border">
      <div className="flex items-center justify-between w-full px-4 py-3">
        {/* Left: hamburger menu */}
        <div className="flex items-center gap-3">
          <button
            className="flex items-center justify-center w-10 h-10 rounded-lg border border-border text-text-secondary hover:bg-brand-500/5 lg:hidden"
            onClick={toggleMobileSidebar}
            aria-label="Abrir menu"
          >
            {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Right: DB badge + user menu */}
        <div className="flex items-center gap-3">
          <DbBadge />

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-brand-500/5 transition-colors"
            >
              {user?.image ? (
                <img
                  src={user.image}
                  alt={user.name || "Utilizador"}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-500 font-semibold text-sm">
                  {user?.name?.charAt(0)?.toUpperCase() || "U"}
                </div>
              )}
              <span className="hidden md:block text-[13px] font-medium text-text-primary">
                {user?.name || "Utilizador"}
              </span>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-surface rounded-xl shadow-modal border border-border py-1 z-50">
                <div className="px-4 py-2 border-b border-border">
                  <p className="text-[12px] font-medium text-text-primary truncate">
                    {user?.name}
                  </p>
                  <p className="text-[11px] text-text-muted truncate">
                    {user?.email}
                  </p>
                </div>
                <button
                  onClick={async () => {
                    setShowUserMenu(false);
                    await handleSignOut("/signin");
                  }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-[13px] text-accent-red-400 hover:bg-accent-red-400/5 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;