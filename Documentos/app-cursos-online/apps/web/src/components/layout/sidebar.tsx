"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";
import {
  LayoutDashboard,
  BookOpen,
  FolderTree,
  Users,
  GraduationCap,
  User,
  LogOut,
  Menu,
  X,
  Sparkles,
  Youtube,
  TrendingUp,
  Brain,
  Bot,
  Navigation,
} from "lucide-react";
import { useState } from "react";

interface SidebarProps {
  role: UserRole;
  userName: string;
  onLogout: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles: UserRole[];
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: <LayoutDashboard className="h-5 w-5" />,
    roles: ["ADMIN", "CREATOR", "STUDENT", "MODERATOR"],
  },
  {
    label: "Mis Cursos",
    href: "/dashboard/cursos",
    icon: <BookOpen className="h-5 w-5" />,
    roles: ["CREATOR", "ADMIN"],
  },
  {
    label: "Generar con IA",
    href: "/dashboard/cursos/generar",
    icon: <Sparkles className="h-5 w-5" />,
    roles: ["CREATOR", "ADMIN"],
  },
  {
    label: "YouTube",
    href: "/dashboard/youtube",
    icon: <Youtube className="h-5 w-5" />,
    roles: ["CREATOR", "ADMIN"],
  },
  {
    label: "Contenido Viral",
    href: "/dashboard/viral",
    icon: <TrendingUp className="h-5 w-5" />,
    roles: ["CREATOR", "ADMIN"],
  },
  {
    label: "Base de Conocimiento",
    href: "/dashboard/conocimiento",
    icon: <Brain className="h-5 w-5" />,
    roles: ["CREATOR", "ADMIN"],
  },
  {
    label: "Agente de Ventas",
    href: "/dashboard/agente-ventas",
    icon: <Bot className="h-5 w-5" />,
    roles: ["CREATOR", "ADMIN"],
  },
  {
    label: "Prospectar Clientes",
    href: "/dashboard/agente-ventas/prospectar",
    icon: <Navigation className="h-5 w-5" />,
    roles: ["CREATOR", "ADMIN"],
  },
  {
    label: "Categorías",
    href: "/dashboard/categorias",
    icon: <FolderTree className="h-5 w-5" />,
    roles: ["ADMIN"],
  },
  {
    label: "Usuarios",
    href: "/dashboard/usuarios",
    icon: <Users className="h-5 w-5" />,
    roles: ["ADMIN"],
  },
  {
    label: "Aprendizaje",
    href: "/dashboard/aprendizaje",
    icon: <GraduationCap className="h-5 w-5" />,
    roles: ["STUDENT"],
  },
  {
    label: "Perfil",
    href: "/dashboard/perfil",
    icon: <User className="h-5 w-5" />,
    roles: ["ADMIN", "CREATOR", "STUDENT", "MODERATOR"],
  },
];

export function Sidebar({ role, userName, onLogout }: SidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const filteredItems = navItems.filter((item) => item.roles.includes(role));

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b px-4 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
          CF
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900">CourseForge</p>
          <p className="truncate text-xs text-gray-500">{userName}</p>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {filteredItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-brand-50 text-brand-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t px-3 py-4">
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
        >
          <LogOut className="h-5 w-5" />
          Cerrar sesión
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-40 rounded-lg bg-white p-2 shadow-md lg:hidden"
      >
        <Menu className="h-5 w-5 text-gray-600" />
      </button>

      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform bg-white shadow-xl transition-transform lg:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:block lg:w-64 lg:border-r lg:bg-white">
        {sidebarContent}
      </aside>
    </>
  );
}
