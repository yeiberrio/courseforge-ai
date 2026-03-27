"use client";

import Link from "next/link";
import {
  Youtube,
  Link2,
  Upload,
  List,
  MonitorPlay,
} from "lucide-react";

const sections = [
  {
    title: "Conectar canal",
    description: "Vincula tu cuenta de YouTube para publicar videos directamente desde la plataforma.",
    href: "/dashboard/youtube/conectar",
    icon: Link2,
    color: "bg-red-50 text-red-600",
  },
  {
    title: "Mis canales",
    description: "Administra los canales de YouTube conectados a tu cuenta.",
    href: "/dashboard/youtube/canales",
    icon: MonitorPlay,
    color: "bg-blue-50 text-blue-600",
  },
  {
    title: "Publicar video",
    description: "Sube y publica un video generado con IA a tu canal de YouTube.",
    href: "/dashboard/youtube/publicar",
    icon: Upload,
    color: "bg-green-50 text-green-600",
  },
  {
    title: "Publicaciones",
    description: "Revisa el historial y estado de tus publicaciones en YouTube.",
    href: "/dashboard/youtube/publicaciones",
    icon: List,
    color: "bg-purple-50 text-purple-600",
  },
];

export default function YouTubePage() {
  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Youtube className="h-7 w-7 text-red-600" />
          <h1 className="text-2xl font-bold text-gray-900">YouTube</h1>
        </div>
        <p className="text-sm text-gray-500">
          Conecta tu canal, publica videos generados con IA y gestiona tus publicaciones.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Link
              key={section.href}
              href={section.href}
              className="group rounded-xl border bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-brand-300"
            >
              <div className={`mb-4 inline-flex rounded-lg p-3 ${section.color}`}>
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mb-1 text-lg font-semibold text-gray-900 group-hover:text-brand-600">
                {section.title}
              </h3>
              <p className="text-sm text-gray-500">{section.description}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
