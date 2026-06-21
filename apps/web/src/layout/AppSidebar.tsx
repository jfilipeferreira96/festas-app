"use client";

import React, { useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/contexts/SidebarContext";
import { useSignOut } from "@/hooks/useSignOut";
import { useMinhasPermissoes } from "@/hooks/use-permissoes";
import type { Modulo } from "@/lib/permissoes";

import {
  LayoutDashboard,
  Calendar,
  PartyPopper,
  Package,
  UtensilsCrossed,
  BarChart2,
  Users,
  UserCog,
  MapPin,
  LogOut,
  Settings,
  ChevronDown,
  Sparkles,
  ListChecks,
  BookUser,
  LockKeyhole,
  DoorOpen,
  BadgeEuro,
} from "lucide-react";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  modulo?: Modulo;
  subItems?: {
    name: string;
    path: string;
    icon: React.ReactNode;
    modulo?: Modulo;
  }[];
};

interface AppSidebarProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

const mainNavItems: NavItem[] = [
  {
    name: "Dashboard",
    icon: <LayoutDashboard className="w-5 h-5" />,
    path: "/dashboard",
  },
  {
    name: "Festas",
    icon: <PartyPopper className="w-5 h-5" />,
    path: "/festas",
    modulo: "reservas",
    subItems: [
      { name: "Todas", path: "/festas", icon: <PartyPopper className="w-4 h-4" /> },
      { name: "A decorrer", path: "/festas/a-decorrer", icon: <Sparkles className="w-4 h-4" /> },
    ],
  },
  {
    name: "Entradas Livres",
    icon: <DoorOpen className="w-5 h-5" />,
    path: "/entradas-livres",
    modulo: "reservas",
    subItems: [
      { name: "Todas", path: "/entradas-livres", icon: <DoorOpen className="w-4 h-4" /> },
      { name: "A decorrer", path: "/entradas-livres/a-decorrer", icon: <Sparkles className="w-4 h-4" /> },
    ],
  },
  {
    name: "Calendário",
    icon: <Calendar className="w-5 h-5" />,
    path: "/calendario",
    modulo: "reservas",
  },
  {
    name: "Cacifos",
    icon: <Package className="w-5 h-5" />,
    path: "/cacifos",
    modulo: "cacifos",
  },
  {
    name: "Monitores",
    icon: <UserCog className="w-5 h-5" />,
    path: "/monitores",
    modulo: "reservas",
  },
  {
    name: "Clientes",
    icon: <BookUser className="w-5 h-5" />,
    path: "/clientes",
    modulo: "reservas",
  },
  {
    name: "Relatórios",
    icon: <BarChart2 className="w-5 h-5" />,
    path: "/relatorios",
    modulo: "relatorios",
  },
];

const configItems: NavItem = {
  name: "Configurações",
  icon: <Settings className="w-5 h-5" />,
  subItems: [
    {
      name: "Utilizadores",
      path: "/configuracoes/utilizadores",
      icon: <Users className="w-4 h-4" />,
      modulo: "configuracoes",
    },
    {
      name: "Monitores",
      path: "/configuracoes/monitores",
      icon: <UserCog className="w-4 h-4" />,
      modulo: "configuracoes",
    },
    {
      name: "Locais",
      path: "/configuracoes/locais",
      icon: <MapPin className="w-4 h-4" />,
      modulo: "configuracoes",
    },
    {
      name: "Menus & Extras",
      path: "/configuracoes/menus",
      icon: <UtensilsCrossed className="w-4 h-4" />,
      modulo: "configuracoes",
    },
    {
      name: "Etapas Festa",
      path: "/configuracoes/etapas-festa",
      icon: <ListChecks className="w-4 h-4" />,
      modulo: "configuracoes",
    },
    {
      name: "Cacifos",
      path: "/configuracoes/cacifos",
      icon: <LockKeyhole className="w-4 h-4" />,
      modulo: "cacifos",
    },
    {
      name: "Preços",
      path: "/configuracoes/precos",
      icon: <BadgeEuro className="w-4 h-4" />,
      modulo: "configuracoes",
    },
  ],
};

const systemItems: NavItem[] = [];

const AppSidebar: React.FC<AppSidebarProps> = ({ user }) => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered, openSubmenu, toggleSubmenu } = useSidebar();
  const pathname = usePathname();
  const { handleSignOut } = useSignOut();
  const { canRead, isLoading: permissoesLoading } = useMinhasPermissoes();

  const isActive = useCallback(
    (path: string) => {
      if (path === "/dashboard") return pathname === "/dashboard" || pathname === "/";
      return pathname === path;
    },
    [pathname]
  );

  const isConfigOpen = openSubmenu === "config";

  // On mobile, when the sidebar is open, treat it as fully expanded
  const showExpanded = isExpanded || isHovered || isMobileOpen;

  const handleSignOutClick = async () => {
    await handleSignOut("/entrar");
  };

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => {}} />}

      <aside
        className={`fixed left-0 top-0 z-50 flex flex-col h-screen bg-sidebar-bg border-r border-border transition-all duration-300 ease-in-out ${showExpanded ? "w-[220px]" : "w-[64px]"} ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-border">
          <div className="flex items-center justify-center w-8 h-8">
            <Image src="/images/logo/1384644.png" alt="Festas" width={32} height={32} className="object-contain" />
          </div>
          {showExpanded && (
            <div className="overflow-hidden">
              <h1 className="font-poppins font-bold text-[15px] text-text-primary leading-tight">Festas</h1>
              <p className="text-[11px] text-text-muted leading-tight">Gestão de Festas Infantis</p>
            </div>
          )}
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          <ul className="space-y-1">
            {mainNavItems
              .filter((item) => !item.modulo || permissoesLoading || canRead(item.modulo))
              .map((item) => (
              <li key={item.name}>
                {item.subItems ? (() => {
                  const subKey = item.path?.replace(/^\//, "") || item.name.toLowerCase();
                  const isOpen = openSubmenu === subKey;
                  const isActive_ = pathname.startsWith(item.path || "");
                  return (
                  <>
                    <button onClick={() => toggleSubmenu(subKey)} className={`menu-item group w-full ${isOpen || isActive_ ? "menu-item-soft-active" : "menu-item-inactive"}`}>
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                          <span className={`${isOpen || isActive_ ? "menu-item-icon-soft-active" : "menu-item-icon-inactive"}`}>{item.icon}</span>
                          {showExpanded && <span className="menu-item-text">{item.name}</span>}
                        </div>
                        <ChevronDown
                          className={`menu-item-arrow w-4 h-4 transition-all duration-200 ${
                            isOpen || isActive_ ? "menu-item-arrow-soft-active" : "menu-item-arrow-inactive"
                          } ${!showExpanded ? "opacity-0 w-0 h-0" : ""}`}
                        />
                      </div>
                    </button>
                    {showExpanded && (
                      <div className={`grid transition-all duration-200 ease-in-out ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                        <div className="overflow-hidden">
                          <ul className="mt-1 space-y-0.5 pl-3">
                            {item.subItems.map((subItem) => (
                              <li key={subItem.path}>
                                <Link href={subItem.path as Route} className={`menu-dropdown-item ${isActive(subItem.path) ? "menu-dropdown-item-active" : "menu-dropdown-item-inactive"}`}>
                                  <span className={`${isActive(subItem.path) ? "menu-item-icon-active" : "menu-item-icon-inactive"}`}>{subItem.icon}</span>
                                  <span className="flex-1">{subItem.name}</span>
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </>
                  );
                })() : (
                  <Link href={(item.path || "/") as Route} className={`menu-item group ${isActive(item.path || "") ? "menu-item-active" : "menu-item-inactive"}`}>
                    <span className={`${isActive(item.path || "") ? "menu-item-icon-active" : "menu-item-icon-inactive"}`}>{item.icon}</span>
                    {showExpanded && <span className="menu-item-text">{item.name}</span>}
                  </Link>
                )}
              </li>
            ))}
          </ul>

          {/* Configurações Section — only show if at least one sub-item is visible */}
          {(() => {
            const visibleConfigItems = configItems.subItems?.filter(
              (subItem) => !subItem.modulo || permissoesLoading || canRead(subItem.modulo)
            ) ?? [];
            return visibleConfigItems.length > 0 ? (
          <div className="mt-4 pt-3 border-t border-border">
            <button onClick={() => toggleSubmenu("config")} className={`menu-item group w-full ${isConfigOpen || pathname.startsWith("/configuracoes") ? "menu-item-soft-active" : "menu-item-inactive"}`}>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <span className={`${isConfigOpen || pathname.startsWith("/configuracoes") ? "menu-item-icon-soft-active" : "menu-item-icon-inactive"}`}>
                    <Settings className="w-5 h-5" />
                  </span>
                  {showExpanded && <span className="menu-item-text">Configurações</span>}
                </div>
                <ChevronDown
                  className={`menu-item-arrow w-4 h-4 transition-all duration-200 ${
                    isConfigOpen || pathname.startsWith("/configuracoes") ? "menu-item-arrow-soft-active" : "menu-item-arrow-inactive"
                  } ${!showExpanded ? "opacity-0 w-0 h-0" : ""}`}
                />
              </div>
            </button>

            {showExpanded && (
              <div className={`grid transition-all duration-200 ease-in-out ${isConfigOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                <div className="overflow-hidden">
                  <ul className="mt-1 space-y-0.5 pl-3">
                    {configItems.subItems
                      ?.filter((subItem) => !subItem.modulo || permissoesLoading || canRead(subItem.modulo))
                      .map((subItem) => (
                      <li key={subItem.path}>
                        <Link href={subItem.path as Route} className={`menu-dropdown-item ${isActive(subItem.path) ? "menu-dropdown-item-active" : "menu-dropdown-item-inactive"}`}>
                          <span className={`${isActive(subItem.path) ? "menu-item-icon-active" : "menu-item-icon-inactive"}`}>{subItem.icon}</span>
                          <span className="flex-1">{subItem.name}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
            ) : null;
          })()}
        </nav>

        {/* System Links */}
        <div className="border-t border-border py-2 px-2">
          <ul className="space-y-0.5">
            {systemItems.map((item) => (
              <li key={item.name}>
                <Link href={(item.path || "/") as Route} className="menu-item menu-item-inactive">
                  <span className="menu-item-icon-inactive">{item.icon}</span>
                  {showExpanded && <span className="menu-item-text">{item.name}</span>}
                </Link>
              </li>
            ))}
          </ul>

          {/* Sign Out */}
          <button onClick={handleSignOutClick} className="menu-item menu-item-inactive">
            <span className="menu-item-icon-inactive">
              <LogOut className="w-5 h-5" />
            </span>
            {showExpanded && <span >Sair</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

export default AppSidebar;
