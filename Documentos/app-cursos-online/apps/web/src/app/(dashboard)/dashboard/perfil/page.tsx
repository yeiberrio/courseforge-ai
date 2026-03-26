"use client";

import { useAuth } from "@/hooks/use-auth";
import { User, Mail, Shield } from "lucide-react";

export default function PerfilPage() {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Mi Perfil</h1>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-brand-600">
            <User className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{user?.full_name}</h2>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Mail className="h-4 w-4" />
                {user?.email}
              </span>
              <span className="flex items-center gap-1">
                <Shield className="h-4 w-4" />
                {user?.role}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
