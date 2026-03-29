"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import Link from "next/link";
import {
  Search,
  TrendingUp,
  Eye,
  ThumbsUp,
  Clock,
  Church,
  GraduationCap,
  Newspaper,
  Play,
  History,
  Flame,
  Filter,
  Loader2,
  Cpu,
  Heart,
  Briefcase,
  Tv,
  FlaskConical,
  Trophy,
  UtensilsCrossed,
  Music,
  Plane,
  DollarSign,
  Zap,
  Laugh,
  Gamepad2,
  Shirt,
  Hammer,
  Landmark,
  Leaf,
} from "lucide-react";

type Category =
  | "RELIGIOUS" | "EDUCATIONAL" | "NEWS" | "TECHNOLOGY" | "HEALTH"
  | "BUSINESS" | "ENTERTAINMENT" | "SCIENCE" | "SPORTS" | "COOKING"
  | "MUSIC" | "TRAVEL" | "FINANCE" | "MOTIVATION" | "COMEDY"
  | "GAMING" | "FASHION" | "DIY" | "POLITICS" | "ENVIRONMENT";

type DateRange =
  | "12h" | "24h" | "2d" | "3d" | "4d" | "7d" | "15d"
  | "1m" | "2m" | "3m" | "4m" | "5m" | "6m"
  | "7m" | "8m" | "9m" | "10m" | "11m" | "12m";

interface ViralVideo {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  viewCount: number;
  likeCount: number;
  duration: string;
  publishedAt: string;
}

interface SearchResult {
  videos: ViralVideo[];
  totalResults: number;
  category: Category;
}

interface SearchHistoryItem {
  id: string;
  category: Category;
  minViews: number;
  minLikes: number;
  dateRange: string;
  resultsCount: number;
  createdAt: string;
}

const categories: { key: Category; label: string; icon: typeof Church }[] = [
  { key: "RELIGIOUS", label: "Religiosos", icon: Church },
  { key: "EDUCATIONAL", label: "Educativos", icon: GraduationCap },
  { key: "NEWS", label: "Noticias", icon: Newspaper },
  { key: "TECHNOLOGY", label: "Tecnología", icon: Cpu },
  { key: "HEALTH", label: "Salud", icon: Heart },
  { key: "BUSINESS", label: "Negocios", icon: Briefcase },
  { key: "ENTERTAINMENT", label: "Entretenimiento", icon: Tv },
  { key: "SCIENCE", label: "Ciencia", icon: FlaskConical },
  { key: "SPORTS", label: "Deportes", icon: Trophy },
  { key: "COOKING", label: "Cocina", icon: UtensilsCrossed },
  { key: "MUSIC", label: "Música", icon: Music },
  { key: "TRAVEL", label: "Viajes", icon: Plane },
  { key: "FINANCE", label: "Finanzas", icon: DollarSign },
  { key: "MOTIVATION", label: "Motivación", icon: Zap },
  { key: "COMEDY", label: "Comedia", icon: Laugh },
  { key: "GAMING", label: "Gaming", icon: Gamepad2 },
  { key: "FASHION", label: "Moda", icon: Shirt },
  { key: "DIY", label: "Hazlo tú mismo", icon: Hammer },
  { key: "POLITICS", label: "Política", icon: Landmark },
  { key: "ENVIRONMENT", label: "Medio Ambiente", icon: Leaf },
];

const dateRangeOptions: { value: DateRange; label: string; group: string }[] = [
  { value: "12h", label: "12 horas", group: "Horas" },
  { value: "24h", label: "24 horas", group: "Horas" },
  { value: "2d", label: "2 días", group: "Días" },
  { value: "3d", label: "3 días", group: "Días" },
  { value: "4d", label: "4 días", group: "Días" },
  { value: "7d", label: "1 semana", group: "Semanas" },
  { value: "15d", label: "15 días", group: "Semanas" },
  { value: "1m", label: "1 mes", group: "Meses" },
  { value: "2m", label: "2 meses", group: "Meses" },
  { value: "3m", label: "3 meses", group: "Meses" },
  { value: "4m", label: "4 meses", group: "Meses" },
  { value: "5m", label: "5 meses", group: "Meses" },
  { value: "6m", label: "6 meses", group: "Meses" },
  { value: "7m", label: "7 meses", group: "Meses" },
  { value: "8m", label: "8 meses", group: "Meses" },
  { value: "9m", label: "9 meses", group: "Meses" },
  { value: "10m", label: "10 meses", group: "Meses" },
  { value: "11m", label: "11 meses", group: "Meses" },
  { value: "12m", label: "12 meses", group: "Meses" },
];

const categoryLabels: Record<Category, string> = Object.fromEntries(
  categories.map((c) => [c.key, c.label]),
) as Record<Category, string>;

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ViralPage() {
  const { token } = useAuth();

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<Category>("EDUCATIONAL");
  const [minViews, setMinViews] = useState(100000);
  const [minLikes, setMinLikes] = useState(5000);
  const [dateRange, setDateRange] = useState<DateRange>("1m");
  const [language, setLanguage] = useState("es");
  const [showAllCategories, setShowAllCategories] = useState(false);

  // State
  const [results, setResults] = useState<ViralVideo[]>([]);
  const [trending, setTrending] = useState<Record<string, ViralVideo[]> | null>(null);
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Load trending and history on mount
  useEffect(() => {
    if (!token) return;

    api.get<Record<string, ViralVideo[]>>("/viral/trending", token)
      .then(setTrending)
      .catch(() => {})
      .finally(() => setLoadingTrending(false));

    api.get<SearchHistoryItem[]>("/viral/history", token)
      .then(setHistory)
      .catch(() => {});
  }, [token]);

  const handleSearch = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const data = await api.post<SearchResult>("/viral/search", {
        category: selectedCategory,
        minViews,
        minLikes,
        dateRange,
        language,
      }, token);
      setResults(data.videos);

      api.get<SearchHistoryItem[]>("/viral/history", token)
        .then(setHistory)
        .catch(() => {});
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al buscar contenido viral";
      setError(message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const visibleCategories = showAllCategories ? categories : categories.slice(0, 8);

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Flame className="h-7 w-7 text-brand-600" />
          <h1 className="text-2xl font-bold text-gray-900">Contenido Viral</h1>
        </div>
        <p className="text-sm text-gray-500">
          Descubre videos virales en YouTube para crear cursos o contenido viral.
          Busca por categoria, filtra por popularidad y procesa los mejores contenidos.
        </p>
      </div>

      {/* Category Selector */}
      <div className="mb-6">
        <label className="mb-2 block text-sm font-medium text-gray-700">Categoría</label>
        <div className="flex flex-wrap gap-2">
          {visibleCategories.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setSelectedCategory(key)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                selectedCategory === key
                  ? "border-brand-600 bg-brand-600 text-white shadow-sm"
                  : "border-gray-200 bg-white text-gray-700 hover:border-brand-300 hover:bg-brand-50"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
          <button
            onClick={() => setShowAllCategories(!showAllCategories)}
            className="rounded-lg border border-dashed border-gray-300 px-3 py-2 text-xs font-medium text-gray-500 hover:border-brand-300 hover:text-brand-600"
          >
            {showAllCategories ? "Ver menos" : `+${categories.length - 8} más`}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 rounded-xl border bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium text-gray-700">
          <Filter className="h-4 w-4" />
          Filtros de búsqueda
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Vistas mínimas
            </label>
            <input
              type="number"
              value={minViews}
              onChange={(e) => setMinViews(Number(e.target.value))}
              min={0}
              step={10000}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Likes mínimos
            </label>
            <input
              type="number"
              value={minLikes}
              onChange={(e) => setMinLikes(Number(e.target.value))}
              min={0}
              step={1000}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Rango de fechas
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRange)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <optgroup label="Horas">
                <option value="12h">Últimas 12 horas</option>
                <option value="24h">Últimas 24 horas</option>
              </optgroup>
              <optgroup label="Días">
                <option value="2d">Últimos 2 días</option>
                <option value="3d">Últimos 3 días</option>
                <option value="4d">Últimos 4 días</option>
              </optgroup>
              <optgroup label="Semanas">
                <option value="7d">Última semana</option>
                <option value="15d">Últimos 15 días</option>
              </optgroup>
              <optgroup label="Meses">
                <option value="1m">Último mes</option>
                <option value="2m">Últimos 2 meses</option>
                <option value="3m">Últimos 3 meses</option>
                <option value="4m">Últimos 4 meses</option>
                <option value="5m">Últimos 5 meses</option>
                <option value="6m">Últimos 6 meses</option>
                <option value="7m">Últimos 7 meses</option>
                <option value="8m">Últimos 8 meses</option>
                <option value="9m">Últimos 9 meses</option>
                <option value="10m">Últimos 10 meses</option>
                <option value="11m">Últimos 11 meses</option>
                <option value="12m">Último año</option>
              </optgroup>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Idioma
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="es">Español</option>
              <option value="en">English</option>
              <option value="pt">Português</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSearch}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            {loading ? "Buscando..." : "Buscar contenido viral"}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Search Results */}
      {hasSearched && (
        <div className="mb-8">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Search className="h-5 w-5 text-brand-600" />
            Resultados de búsqueda
            {results.length > 0 && (
              <span className="ml-2 rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                {results.length} videos
              </span>
            )}
          </h2>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
            </div>
          ) : results.length === 0 ? (
            <div className="rounded-xl border bg-white py-12 text-center shadow-sm">
              <Search className="mx-auto mb-3 h-10 w-10 text-gray-300" />
              <p className="text-sm text-gray-500">
                No se encontraron videos con los filtros seleccionados.
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Intenta reducir las vistas o likes mínimos, o ampliar el rango de fechas.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {results.map((video) => (
                <VideoCard key={video.videoId} video={video} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Trending Section */}
      {!hasSearched && (
        <div className="mb-8">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
            <TrendingUp className="h-5 w-5 text-brand-600" />
            Tendencias actuales
          </h2>

          {loadingTrending ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
            </div>
          ) : trending && Object.keys(trending).length > 0 ? (
            <div className="space-y-6">
              {Object.entries(trending).map(([cat, videos]) => {
                if (!videos || videos.length === 0) return null;
                const catKey = cat.toUpperCase() as Category;
                const catInfo = categories.find((c) => c.key === catKey);
                const Icon = catInfo?.icon || Flame;

                return (
                  <div key={cat}>
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-700">
                      <Icon className="h-4 w-4" />
                      {catInfo?.label || cat}
                    </h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {videos.slice(0, 3).map((video) => (
                        <VideoCard key={video.videoId} video={video} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border bg-white py-12 text-center shadow-sm">
              <TrendingUp className="mx-auto mb-3 h-10 w-10 text-gray-300" />
              <p className="text-sm text-gray-500">No hay tendencias disponibles.</p>
              <p className="mt-1 text-xs text-gray-400">Realiza una búsqueda para empezar a descubrir contenido viral.</p>
            </div>
          )}
        </div>
      )}

      {/* Search History */}
      {history.length > 0 && (
        <div>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
            <History className="h-5 w-5 text-gray-400" />
            Historial de búsquedas
          </h2>
          <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-xs font-medium uppercase text-gray-500">
                  <th className="px-4 py-3">Categoría</th>
                  <th className="px-4 py-3">Filtros</th>
                  <th className="px-4 py-3">Resultados</th>
                  <th className="px-4 py-3">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {history.slice(0, 10).map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                        {categoryLabels[item.category] || item.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <span className="mr-3">
                        <Eye className="mr-1 inline h-3 w-3" />
                        {formatNumber(item.minViews)}
                      </span>
                      <span>
                        <ThumbsUp className="mr-1 inline h-3 w-3" />
                        {formatNumber(item.minLikes)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {item.resultsCount} videos
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {formatDate(item.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function VideoCard({ video }: { video: ViralVideo }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="relative">
        <img
          src={video.thumbnail}
          alt={video.title}
          className="h-44 w-full object-cover"
        />
        {video.duration && (
          <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-xs font-medium text-white">
            {video.duration}
          </span>
        )}
        <a
          href={`https://www.youtube.com/watch?v=${video.videoId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all hover:bg-black/20 hover:opacity-100"
        >
          <Play className="h-12 w-12 text-white drop-shadow-lg" />
        </a>
      </div>

      <div className="p-4">
        <h3 className="mb-1 line-clamp-2 text-sm font-medium text-gray-900" title={video.title}>
          {video.title}
        </h3>
        <p className="mb-3 text-xs text-gray-500">{video.channelTitle}</p>

        <div className="mb-4 flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" />
            {formatNumber(video.viewCount)}
          </span>
          <span className="flex items-center gap-1">
            <ThumbsUp className="h-3.5 w-3.5" />
            {formatNumber(video.likeCount)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {formatDate(video.publishedAt)}
          </span>
        </div>

        <Link
          href={`/dashboard/viral/procesar?videoId=${video.videoId}`}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
        >
          <TrendingUp className="h-4 w-4" />
          Procesar
        </Link>
      </div>
    </div>
  );
}
