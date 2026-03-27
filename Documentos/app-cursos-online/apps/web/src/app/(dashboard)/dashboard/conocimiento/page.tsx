"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import Link from "next/link";
import {
  Database,
  Search,
  FileText,
  Tag,
  Calendar,
  Layers,
  BookOpen,
  Upload,
  TrendingUp,
  X,
  Loader2,
} from "lucide-react";

/* ---------- types ---------- */

interface KBStats {
  totalDocuments: number;
  totalChunks: number;
  bySourceType: Record<string, number>;
  byCategory: Record<string, number>;
}

interface KBDocument {
  id: string;
  title: string;
  category: string;
  tags: string[];
  sourceType: string;
  chunkCount: number;
  ingestedAt: string;
}

interface SearchResult {
  id: string;
  documentId: string;
  documentTitle: string;
  content: string;
  score: number;
  metadata?: Record<string, unknown>;
}

/* ---------- constants ---------- */

const SOURCE_TYPES = [
  { value: "", label: "Todas las fuentes" },
  { value: "COURSE", label: "Curso" },
  { value: "VIRAL_CONTENT", label: "Contenido viral" },
  { value: "MANUAL_UPLOAD", label: "Subida manual" },
];

const sourceLabels: Record<string, { label: string; color: string; icon: typeof BookOpen }> = {
  COURSE: { label: "Curso", color: "bg-blue-100 text-blue-700", icon: BookOpen },
  VIRAL_CONTENT: { label: "Viral", color: "bg-purple-100 text-purple-700", icon: TrendingUp },
  MANUAL_UPLOAD: { label: "Manual", color: "bg-amber-100 text-amber-700", icon: Upload },
};

/* ---------- component ---------- */

export default function ConocimientoPage() {
  const { token } = useAuth();

  // stats
  const [stats, setStats] = useState<KBStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // documents
  const [documents, setDocuments] = useState<KBDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);

  // filters
  const [filterSource, setFilterSource] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [categories, setCategories] = useState<string[]>([]);

  // search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // fetch stats
  useEffect(() => {
    if (!token) return;
    api
      .get<KBStats>("/knowledge-base/stats", token)
      .then((data) => {
        setStats(data);
        setCategories(Object.keys(data.byCategory));
      })
      .catch(() => {})
      .finally(() => setLoadingStats(false));
  }, [token]);

  // fetch documents
  const fetchDocuments = useCallback(() => {
    if (!token) return;
    setLoadingDocs(true);
    const params = new URLSearchParams();
    if (filterSource) params.set("sourceType", filterSource);
    if (filterCategory) params.set("category", filterCategory);
    const qs = params.toString();
    api
      .get<KBDocument[]>(`/knowledge-base${qs ? `?${qs}` : ""}`, token)
      .then(setDocuments)
      .catch(() => {})
      .finally(() => setLoadingDocs(false));
  }, [token, filterSource, filterCategory]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // search
  const handleSearch = async () => {
    if (!token || !searchQuery.trim()) return;
    setSearching(true);
    setShowResults(true);
    try {
      const results = await api.post<SearchResult[]>(
        "/knowledge-base/search",
        { query: searchQuery.trim(), limit: 10 },
        token,
      );
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setShowResults(false);
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString("es-CO", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  /* ---------- render ---------- */

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Base de Conocimiento</h1>
        <p className="mt-1 text-sm text-gray-500">
          Explora y busca en los documentos procesados por el sistema RAG. Aqui se almacenan cursos,
          contenido viral y documentos subidos manualmente, fragmentados para respuestas inteligentes.
        </p>
      </div>

      {/* Stats */}
      {loadingStats ? (
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border bg-white p-5 shadow-sm">
              <div className="h-4 w-20 rounded bg-gray-200" />
              <div className="mt-2 h-8 w-16 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      ) : stats ? (
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <FileText className="h-4 w-4" />
              Documentos
            </div>
            <p className="mt-1 text-2xl font-bold text-gray-900">{stats.totalDocuments}</p>
          </div>
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Layers className="h-4 w-4" />
              Fragmentos
            </div>
            <p className="mt-1 text-2xl font-bold text-gray-900">{stats.totalChunks}</p>
          </div>
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Database className="h-4 w-4" />
              Por fuente
            </div>
            <div className="mt-1 space-y-1">
              {Object.entries(stats.bySourceType).map(([key, count]) => (
                <div key={key} className="flex items-center justify-between text-sm">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${sourceLabels[key]?.color || "bg-gray-100 text-gray-700"}`}>
                    {sourceLabels[key]?.label || key}
                  </span>
                  <span className="font-medium text-gray-700">{count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Tag className="h-4 w-4" />
              Por categoria
            </div>
            <div className="mt-1 max-h-24 space-y-1 overflow-y-auto">
              {Object.entries(stats.byCategory).map(([key, count]) => (
                <div key={key} className="flex items-center justify-between text-sm">
                  <span className="truncate text-gray-600">{key}</span>
                  <span className="ml-2 font-medium text-gray-700">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* Search */}
      <div className="mb-6">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar en la base de conocimiento..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="w-full rounded-lg border bg-white py-2.5 pl-10 pr-10 text-sm text-gray-900 focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            onClick={handleSearch}
            disabled={!searchQuery.trim() || searching}
            className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Buscar
          </button>
        </div>
      </div>

      {/* Search Results */}
      {showResults && (
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Resultados de busqueda ({searchResults.length})
            </h2>
            <button onClick={clearSearch} className="text-sm text-brand-600 hover:text-brand-700">
              Cerrar resultados
            </button>
          </div>
          {searching ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
            </div>
          ) : searchResults.length === 0 ? (
            <div className="rounded-xl border bg-white py-8 text-center shadow-sm">
              <Search className="mx-auto mb-3 h-10 w-10 text-gray-300" />
              <p className="text-sm text-gray-500">No se encontraron resultados para &quot;{searchQuery}&quot;</p>
            </div>
          ) : (
            <div className="space-y-3">
              {searchResults.map((result, idx) => (
                <Link
                  key={result.id || idx}
                  href={`/dashboard/conocimiento/detalle?id=${result.documentId}`}
                  className="block rounded-xl border bg-white p-4 shadow-sm transition hover:border-brand-300 hover:shadow"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-gray-900">{result.documentTitle}</h3>
                      <p className="mt-1 line-clamp-2 text-sm text-gray-600">{result.content}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
                      {(result.score * 100).toFixed(0)}%
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value)}
          className="rounded-lg border bg-white px-3 py-2 text-sm text-gray-700 focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
        >
          {SOURCE_TYPES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="rounded-lg border bg-white px-3 py-2 text-sm text-gray-700 focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
        >
          <option value="">Todas las categorias</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        {(filterSource || filterCategory) && (
          <button
            onClick={() => {
              setFilterSource("");
              setFilterCategory("");
            }}
            className="flex items-center gap-1 rounded-lg border px-3 py-2 text-sm text-gray-500 hover:bg-gray-50"
          >
            <X className="h-3.5 w-3.5" />
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Document List */}
      {loadingDocs ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
        </div>
      ) : documents.length === 0 ? (
        <div className="rounded-xl border bg-white py-16 text-center shadow-sm">
          <Database className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900">Sin documentos</h3>
          <p className="mt-1 text-sm text-gray-500">
            No hay documentos en la base de conocimiento{filterSource || filterCategory ? " con los filtros aplicados" : ""}.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => {
            const src = sourceLabels[doc.sourceType];
            const SrcIcon = src?.icon || FileText;
            return (
              <Link
                key={doc.id}
                href={`/dashboard/conocimiento/detalle?id=${doc.id}`}
                className="block rounded-xl border bg-white p-5 shadow-sm transition hover:border-brand-300 hover:shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <SrcIcon className="h-4 w-4 shrink-0 text-gray-400" />
                      <h3 className="truncate font-medium text-gray-900">{doc.title}</h3>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${src?.color || "bg-gray-100 text-gray-700"}`}
                      >
                        {src?.label || doc.sourceType}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                      {doc.category && (
                        <span className="flex items-center gap-1">
                          <Tag className="h-3.5 w-3.5" />
                          {doc.category}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Layers className="h-3.5 w-3.5" />
                        {doc.chunkCount} fragmentos
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(doc.ingestedAt)}
                      </span>
                    </div>
                    {doc.tags && doc.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {doc.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
