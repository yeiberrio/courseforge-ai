"use client";

import { useEffect, useState, useRef } from "react";
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
  MessageCircle,
  Radio,
  X,
  ChevronDown,
  AlertTriangle,
  Globe,
  FileSpreadsheet,
} from "lucide-react";

type Category =
  | "RELIGIOUS" | "EDUCATIONAL" | "NEWS" | "TECHNOLOGY" | "HEALTH"
  | "BUSINESS" | "ENTERTAINMENT" | "SCIENCE" | "SPORTS" | "COOKING"
  | "MUSIC" | "TRAVEL" | "FINANCE" | "MOTIVATION" | "COMEDY"
  | "GAMING" | "FASHION" | "DIY" | "POLITICS" | "ENVIRONMENT"
  | "WORLD_CUP_2026";

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
  commentCount?: number;
  engagementRate?: number;
  isLive?: boolean;
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
  { key: "TECHNOLOGY", label: "Tecnologia", icon: Cpu },
  { key: "HEALTH", label: "Salud", icon: Heart },
  { key: "BUSINESS", label: "Negocios", icon: Briefcase },
  { key: "ENTERTAINMENT", label: "Entretenimiento", icon: Tv },
  { key: "SCIENCE", label: "Ciencia", icon: FlaskConical },
  { key: "SPORTS", label: "Deportes", icon: Trophy },
  { key: "COOKING", label: "Cocina", icon: UtensilsCrossed },
  { key: "MUSIC", label: "Musica", icon: Music },
  { key: "TRAVEL", label: "Viajes", icon: Plane },
  { key: "FINANCE", label: "Finanzas", icon: DollarSign },
  { key: "MOTIVATION", label: "Motivacion", icon: Zap },
  { key: "COMEDY", label: "Comedia", icon: Laugh },
  { key: "GAMING", label: "Gaming", icon: Gamepad2 },
  { key: "FASHION", label: "Moda", icon: Shirt },
  { key: "DIY", label: "Hazlo tu mismo", icon: Hammer },
  { key: "POLITICS", label: "Politica", icon: Landmark },
  { key: "ENVIRONMENT", label: "Medio Ambiente", icon: Leaf },
  { key: "WORLD_CUP_2026", label: "Mundial 2026", icon: Globe },
];

const countryOptions = [
  { code: "CO", label: "Colombia" },
  { code: "MX", label: "Mexico" },
  { code: "AR", label: "Argentina" },
  { code: "ES", label: "Espana" },
  { code: "CL", label: "Chile" },
  { code: "PE", label: "Peru" },
  { code: "EC", label: "Ecuador" },
  { code: "VE", label: "Venezuela" },
  { code: "US", label: "Estados Unidos" },
  { code: "BR", label: "Brasil" },
  { code: "DO", label: "Rep. Dominicana" },
  { code: "GT", label: "Guatemala" },
  { code: "BO", label: "Bolivia" },
  { code: "PY", label: "Paraguay" },
  { code: "UY", label: "Uruguay" },
];

const languageOptions = [
  { code: "es", label: "Espanol" },
  { code: "en", label: "English" },
  { code: "pt", label: "Portugues" },
  { code: "fr", label: "Francais" },
  { code: "de", label: "Deutsch" },
  { code: "it", label: "Italiano" },
  { code: "ja", label: "Japones" },
  { code: "ko", label: "Coreano" },
  { code: "zh", label: "Chino" },
  { code: "ar", label: "Arabe" },
  { code: "ru", label: "Ruso" },
  { code: "hi", label: "Hindi" },
];

const sortOptions = [
  { value: "viewCount", label: "Mas vistas" },
  { value: "likeCount", label: "Mas likes" },
  { value: "commentCount", label: "Mas comentarios" },
  { value: "engagementRate", label: "Mayor engagement" },
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

// Multi-select dropdown component
function MultiSelect({
  options,
  selected,
  onChange,
  placeholder,
  allLabel,
}: {
  options: { code: string; label: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  allLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const toggle = (code: string) => {
    onChange(
      selected.includes(code)
        ? selected.filter((c) => c !== code)
        : [...selected, code],
    );
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
      >
        <span className="truncate text-left">
          {selected.length === 0
            ? allLabel
            : selected.length <= 2
              ? selected.map((c) => options.find((o) => o.code === c)?.label || c).join(", ")
              : `${selected.length} seleccionados`}
        </span>
        <ChevronDown className={`ml-1 h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-lg border bg-white shadow-lg">
          <button
            type="button"
            onClick={() => { onChange([]); }}
            className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 ${
              selected.length === 0 ? "bg-brand-50 font-medium text-brand-700" : "text-gray-700"
            }`}
          >
            <Globe className="h-3.5 w-3.5" />
            {allLabel}
          </button>
          {options.map((opt) => (
            <button
              key={opt.code}
              type="button"
              onClick={() => toggle(opt.code)}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                selected.includes(opt.code) ? "bg-brand-50 font-medium text-brand-700" : "text-gray-700"
              }`}
            >
              <span className={`flex h-4 w-4 items-center justify-center rounded border text-xs ${
                selected.includes(opt.code) ? "border-brand-600 bg-brand-600 text-white" : "border-gray-300"
              }`}>
                {selected.includes(opt.code) && "✓"}
              </span>
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Chips */}
      {selected.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {selected.map((code) => (
            <span
              key={code}
              className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700"
            >
              {options.find((o) => o.code === code)?.label || code}
              <button type="button" onClick={() => toggle(code)} className="hover:text-brand-900">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ViralPage() {
  const { token } = useAuth();

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<Category>("EDUCATIONAL");
  const [minViews, setMinViews] = useState(100000);
  const [minLikes, setMinLikes] = useState(5000);
  const [minComments, setMinComments] = useState(0);
  const [dateRange, setDateRange] = useState<DateRange>("1m");
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(["es"]);
  const [sortBy, setSortBy] = useState("viewCount");
  const [eventType, setEventType] = useState<string | null>(null);
  const [customKeywords, setCustomKeywords] = useState("");
  const [showAllCategories, setShowAllCategories] = useState(false);

  // State
  const [results, setResults] = useState<ViralVideo[]>([]);
  const [trending, setTrending] = useState<Record<string, ViralVideo[]> | null>(null);
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [exporting, setExporting] = useState(false);

  // API call count warning
  const apiCalls = Math.max(1, (selectedLanguages.length || 1) * (selectedCountries.length || 1));

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
      const body: Record<string, unknown> = {
        category: selectedCategory,
        minViews,
        minLikes,
        minComments,
        dateRange,
        sortBy,
      };

      if (selectedLanguages.length > 0) body.languages = selectedLanguages;
      if (selectedCountries.length > 0) body.countries = selectedCountries;
      if (eventType) body.eventType = eventType;
      if (customKeywords.trim()) {
        body.keywords = customKeywords.split(",").map((k) => k.trim()).filter(Boolean);
      }

      const data = await api.post<SearchResult>("/viral/search", body, token);
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

  const handleExport = async () => {
    if (!token || results.length === 0) return;
    setExporting(true);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";
      const response = await fetch(`${API_URL}/viral/export`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          videos: results.map((v) => ({
            ...v,
            category: selectedCategory,
          })),
          category: selectedCategory,
        }),
      });

      if (!response.ok) throw new Error("Error al exportar");

      const blob = await response.blob();
      const date = new Date().toISOString().split("T")[0];
      const filename = `contenido-viral-${selectedCategory.toLowerCase()}-${date}.xlsx`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al exportar";
      setError(message);
    } finally {
      setExporting(false);
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
          Busca por categoria, filtra por popularidad, pais, idioma y mas.
        </p>
      </div>

      {/* Category Selector */}
      <div className="mb-6">
        <label className="mb-2 block text-sm font-medium text-gray-700">Categoria</label>
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
            {showAllCategories ? "Ver menos" : `+${categories.length - 8} mas`}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 rounded-xl border bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium text-gray-700">
          <Filter className="h-4 w-4" />
          Filtros de busqueda
        </div>

        {/* Row 1: Numeric filters + date range */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Vistas minimas
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
              Likes minimos
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
              Comentarios minimos
            </label>
            <input
              type="number"
              value={minComments}
              onChange={(e) => setMinComments(Number(e.target.value))}
              min={0}
              step={100}
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
                <option value="12h">Ultimas 12 horas</option>
                <option value="24h">Ultimas 24 horas</option>
              </optgroup>
              <optgroup label="Dias">
                <option value="2d">Ultimos 2 dias</option>
                <option value="3d">Ultimos 3 dias</option>
                <option value="4d">Ultimos 4 dias</option>
              </optgroup>
              <optgroup label="Semanas">
                <option value="7d">Ultima semana</option>
                <option value="15d">Ultimos 15 dias</option>
              </optgroup>
              <optgroup label="Meses">
                <option value="1m">Ultimo mes</option>
                <option value="2m">Ultimos 2 meses</option>
                <option value="3m">Ultimos 3 meses</option>
                <option value="4m">Ultimos 4 meses</option>
                <option value="5m">Ultimos 5 meses</option>
                <option value="6m">Ultimos 6 meses</option>
                <option value="7m">Ultimos 7 meses</option>
                <option value="8m">Ultimos 8 meses</option>
                <option value="9m">Ultimos 9 meses</option>
                <option value="10m">Ultimos 10 meses</option>
                <option value="11m">Ultimos 11 meses</option>
                <option value="12m">Ultimo ano</option>
              </optgroup>
            </select>
          </div>
        </div>

        {/* Row 2: Keywords */}
        <div className="mt-4">
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Palabras clave (separadas por coma)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={customKeywords}
              onChange={(e) => setCustomKeywords(e.target.value)}
              placeholder="ej: mundial 2026, messi, final, goles..."
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            {customKeywords && (
              <button
                type="button"
                onClick={() => setCustomKeywords("")}
                className="shrink-0 rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-500 hover:bg-gray-50"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {!customKeywords && (
            <p className="mt-1 text-[10px] text-gray-400">
              Si no escribes palabras clave, se usaran las predefinidas de la categoria seleccionada.
            </p>
          )}
          {customKeywords && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {customKeywords.split(",").map((k) => k.trim()).filter(Boolean).map((keyword, i) => (
                <span
                  key={i}
                  className="inline-flex items-center rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700"
                >
                  {keyword}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Row 3: Countries, Languages, Sort, Live toggle */}
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Paises
            </label>
            <MultiSelect
              options={countryOptions}
              selected={selectedCountries}
              onChange={setSelectedCountries}
              placeholder="Seleccionar paises"
              allLabel="Mundial (todos)"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Idiomas
            </label>
            <MultiSelect
              options={languageOptions}
              selected={selectedLanguages}
              onChange={setSelectedLanguages}
              placeholder="Seleccionar idiomas"
              allLabel="Todos los idiomas"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Ordenar por
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Transmisiones en vivo
            </label>
            <button
              type="button"
              onClick={() => setEventType(eventType === "live" ? null : "live")}
              className={`flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                eventType === "live"
                  ? "border-red-500 bg-red-50 text-red-600"
                  : "border-gray-200 bg-white text-gray-600 hover:border-red-300 hover:bg-red-50"
              }`}
            >
              <Radio className={`h-4 w-4 ${eventType === "live" ? "animate-pulse" : ""}`} />
              {eventType === "live" ? "EN VIVO activado" : "Buscar en vivo"}
            </button>
          </div>
        </div>

        {/* Quota warning */}
        {apiCalls > 3 && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Esta busqueda usara {apiCalls} llamadas a la API (max. 6). Reduce paises o idiomas si supera el limite.
          </div>
        )}

        {/* Search button */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSearch}
            disabled={loading || apiCalls > 6}
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
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Search className="h-5 w-5 text-brand-600" />
              Resultados de busqueda
              {results.length > 0 && (
                <span className="ml-2 rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                  {results.length} videos
                </span>
              )}
            </h2>
            {results.length > 0 && (
              <button
                onClick={handleExport}
                disabled={exporting}
                className="flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 transition-colors hover:bg-green-100 disabled:opacity-50"
              >
                {exporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4" />
                )}
                {exporting ? "Exportando..." : "Exportar Excel"}
              </button>
            )}
          </div>

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
                Intenta reducir las vistas o likes minimos, o ampliar el rango de fechas.
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
              <p className="mt-1 text-xs text-gray-400">Realiza una busqueda para empezar a descubrir contenido viral.</p>
            </div>
          )}
        </div>
      )}

      {/* Search History */}
      {history.length > 0 && (
        <div>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
            <History className="h-5 w-5 text-gray-400" />
            Historial de busquedas
          </h2>
          <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-xs font-medium uppercase text-gray-500">
                  <th className="px-4 py-3">Categoria</th>
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
        {video.isLive && (
          <span className="absolute left-2 top-2 flex items-center gap-1 rounded bg-red-600 px-2 py-0.5 text-xs font-bold text-white animate-pulse">
            <Radio className="h-3 w-3" />
            EN VIVO
          </span>
        )}
        {video.duration && !video.isLive && (
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

        <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" />
            {formatNumber(video.viewCount)}
          </span>
          <span className="flex items-center gap-1">
            <ThumbsUp className="h-3.5 w-3.5" />
            {formatNumber(video.likeCount)}
          </span>
          {video.commentCount !== undefined && (
            <span className="flex items-center gap-1">
              <MessageCircle className="h-3.5 w-3.5" />
              {formatNumber(video.commentCount)}
            </span>
          )}
          {video.engagementRate !== undefined && video.engagementRate > 0 && (
            <span className="flex items-center gap-1 text-amber-600">
              <Zap className="h-3.5 w-3.5" />
              {video.engagementRate.toFixed(1)}%
            </span>
          )}
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
