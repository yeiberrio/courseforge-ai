"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import Link from "next/link";
import {
  BookOpen,
  FolderTree,
  Users,
  GraduationCap,
  Plus,
  TrendingUp,
} from "lucide-react";

export default function DashboardPage() {
  const { user, token } = useAuth();
  const [stats, setStats] = useState({ courses: 0, categories: 0, enrollments: 0 });

  useEffect(() => {
    if (!token) return;

    const loadStats = async () => {
      try {
        const [categories] = await Promise.all([
          api.get<any[]>("/categories", token),
        ]);
        setStats((prev) => ({ ...prev, categories: categories.length }));

        if (user?.role === "CREATOR" || user?.role === "ADMIN") {
          const courses = await api.get<any>("/courses/my-courses", token);
          setStats((prev) => ({ ...prev, courses: courses.total || 0 }));
        }

        if (user?.role === "STUDENT") {
          const enrollments = await api.get<any[]>("/enrollments", token);
          setStats((prev) => ({ ...prev, enrollments: enrollments.length }));
        }
      } catch {
        // Stats are non-critical
      }
    };
    loadStats();
  }, [token, user]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Hola, {user?.full_name} 👋
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {user?.role === "ADMIN" && "Panel de administración"}
          {user?.role === "CREATOR" && "Panel de creador de cursos"}
          {user?.role === "STUDENT" && "Tu espacio de aprendizaje"}
        </p>
      </div>

      {/* Stats cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(user?.role === "CREATOR" || user?.role === "ADMIN") && (
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-brand-50 p-3">
                <BookOpen className="h-6 w-6 text-brand-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.courses}</p>
                <p className="text-sm text-gray-500">Mis cursos</p>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-purple-50 p-3">
              <FolderTree className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.categories}</p>
              <p className="text-sm text-gray-500">Categorías</p>
            </div>
          </div>
        </div>

        {user?.role === "STUDENT" && (
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-green-50 p-3">
                <GraduationCap className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.enrollments}</p>
                <p className="text-sm text-gray-500">Inscripciones</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Acciones rápidas</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(user?.role === "CREATOR" || user?.role === "ADMIN") && (
          <Link
            href="/dashboard/cursos/nuevo"
            className="flex items-center gap-3 rounded-xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="rounded-lg bg-brand-100 p-2">
              <Plus className="h-5 w-5 text-brand-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Crear nuevo curso</p>
              <p className="text-sm text-gray-500">Sube un documento y genera con IA</p>
            </div>
          </Link>
        )}

        {user?.role === "STUDENT" && (
          <Link
            href="/cursos"
            className="flex items-center gap-3 rounded-xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="rounded-lg bg-green-100 p-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Explorar cursos</p>
              <p className="text-sm text-gray-500">Descubre nuevos cursos</p>
            </div>
          </Link>
        )}

        {user?.role === "ADMIN" && (
          <Link
            href="/dashboard/usuarios"
            className="flex items-center gap-3 rounded-xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="rounded-lg bg-orange-100 p-2">
              <Users className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Gestionar usuarios</p>
              <p className="text-sm text-gray-500">Administrar cuentas y roles</p>
            </div>
          </Link>
        )}
      </div>
    </div>
  );
}
