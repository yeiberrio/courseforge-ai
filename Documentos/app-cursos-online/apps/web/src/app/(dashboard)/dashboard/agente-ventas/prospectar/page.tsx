"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import {
  Search,
  MapPin,
  Loader2,
  Star,
  Phone,
  Globe,
  ExternalLink,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Building2,
  Navigation,
  Clock,
  Filter,
  ChevronDown,
  ChevronUp,
  Users,
  Map,
} from "lucide-react";

interface Prospect {
  placeId: string;
  name: string;
  address: string;
  phone: string | null;
  website: string | null;
  googleMapsUrl: string | null;
  rating: number | null;
  totalReviews: number;
  status: string | null;
  types: string[];
  primaryType: string | null;
  openNow: boolean | null;
  weekdayHours: string[];
  latitude: number | null;
  longitude: number | null;
}

interface SearchResult {
  query: string;
  totalResults: number;
  prospects: Prospect[];
}

interface ImportResult {
  imported: number;
  skipped: number;
  skippedNames: string[];
}

const NICHE_SUGGESTIONS = [
  "Restaurantes",
  "Dentistas",
  "Abogados",
  "Ferreterias",
  "Gimnasios",
  "Veterinarias",
  "Peluquerias",
  "Contadores",
  "Inmobiliarias",
  "Talleres mecanicos",
  "Farmacias",
  "Tiendas de ropa",
  "Panaderias",
  "Hoteles",
  "Consultorios medicos",
  "Academias",
];

export default function ProspectarPage() {
  const { token } = useAuth();

  // Search form
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [minRating, setMinRating] = useState(0);
  const [maxResults, setMaxResults] = useState(20);
  const [showFilters, setShowFilters] = useState(false);

  // Results
  const [results, setResults] = useState<Prospect[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Import
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set());

  // Hours expand
  const [expandedHours, setExpandedHours] = useState<Set<string>>(new Set());

  const handleSearch = async () => {
    if (!token || !query.trim()) return;
    setLoading(true);
    setError(null);
    setHasSearched(true);
    setSelectedIds(new Set());
    setImportResult(null);
    setImportedIds(new Set());

    try {
      const data = await api.post<SearchResult>(
        "/agents/leads/prospect",
        {
          query: query.trim(),
          location: location.trim() || undefined,
          minRating: minRating || undefined,
          maxResults,
        },
        token,
      );
      setResults(data.prospects);
      setSearchQuery(data.query);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al buscar prospectos";
      setError(message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (placeId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(placeId)) next.delete(placeId);
      else next.add(placeId);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === results.filter((p) => !importedIds.has(p.placeId)).length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(results.filter((p) => !importedIds.has(p.placeId)).map((p) => p.placeId)));
    }
  };

  const handleImport = async () => {
    if (!token || selectedIds.size === 0) return;
    setImporting(true);
    setImportResult(null);

    const selected = results.filter((p) => selectedIds.has(p.placeId));
    const prospects = selected.map((p) => ({
      name: p.name,
      phone: p.phone || undefined,
      website: p.website || undefined,
      address: p.address,
      interest: query,
      googleMapsUrl: p.googleMapsUrl || undefined,
      rating: p.rating || undefined,
      totalReviews: p.totalReviews || undefined,
    }));

    try {
      const result = await api.post<ImportResult>(
        "/agents/leads/prospect/import",
        { prospects },
        token,
      );
      setImportResult(result);
      setImportedIds((prev) => {
        const next = new Set(prev);
        selectedIds.forEach((id) => next.add(id));
        return next;
      });
      setSelectedIds(new Set());
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al importar prospectos";
      setError(message);
    } finally {
      setImporting(false);
    }
  };

  const toggleHours = (placeId: string) => {
    setExpandedHours((prev) => {
      const next = new Set(prev);
      if (next.has(placeId)) next.delete(placeId);
      else next.add(placeId);
      return next;
    });
  };

  const formatType = (type: string) =>
    type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-3">
          <Navigation className="h-7 w-7 text-brand-600" />
          <h1 className="text-2xl font-bold text-gray-900">Prospectar Clientes</h1>
        </div>
        <p className="text-sm text-gray-500">
          Busca negocios y clientes potenciales en Google para cualquier nicho y ubicacion.
          Importa los mejores prospectos directamente a tu CRM.
        </p>
      </div>

      {/* Search form */}
      <div className="mb-6 rounded-xl border bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Niche */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Nicho / Tipo de negocio
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="ej: restaurantes, dentistas, ferreterias..."
                className="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Ubicacion
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="ej: Medellin, Bogota zona norte, Miami..."
                className="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>
        </div>

        {/* Niche suggestions */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {NICHE_SUGGESTIONS.slice(0, 8).map((niche) => (
            <button
              key={niche}
              type="button"
              onClick={() => setQuery(niche)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all ${
                query === niche
                  ? "border-brand-600 bg-brand-50 text-brand-700"
                  : "border-gray-200 text-gray-500 hover:border-brand-300 hover:text-brand-600"
              }`}
            >
              {niche}
            </button>
          ))}
        </div>

        {/* Advanced filters toggle */}
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className="mt-3 flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-brand-600"
        >
          <Filter className="h-3.5 w-3.5" />
          Filtros avanzados
          {showFilters ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>

        {showFilters && (
          <div className="mt-3 grid grid-cols-1 gap-4 rounded-lg border border-gray-100 bg-gray-50 p-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Rating minimo
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={5}
                  step={0.5}
                  value={minRating}
                  onChange={(e) => setMinRating(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="flex items-center gap-1 text-sm font-medium text-gray-700">
                  <Star className="h-3.5 w-3.5 text-yellow-400" />
                  {minRating > 0 ? `${minRating}+` : "Todos"}
                </span>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Resultados maximos
              </label>
              <select
                value={maxResults}
                onChange={(e) => setMaxResults(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value={5}>5 resultados</option>
                <option value={10}>10 resultados</option>
                <option value={15}>15 resultados</option>
                <option value={20}>20 resultados</option>
              </select>
            </div>
          </div>
        )}

        {/* Search button */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className="flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            {loading ? "Buscando..." : "Buscar prospectos"}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-xs underline">
            Cerrar
          </button>
        </div>
      )}

      {/* Import result banner */}
      {importResult && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>
            <strong>{importResult.imported}</strong> prospectos importados al CRM.
            {importResult.skipped > 0 && (
              <> {importResult.skipped} omitidos (ya existian).</>
            )}
          </span>
          <button onClick={() => setImportResult(null)} className="ml-auto text-xs underline">
            Cerrar
          </button>
        </div>
      )}

      {/* Results */}
      {hasSearched && (
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Map className="h-5 w-5 text-brand-600" />
              Resultados
              {results.length > 0 && (
                <span className="ml-1 rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                  {results.length} negocios
                </span>
              )}
            </h2>

            {results.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={selectAll}
                  className="text-xs font-medium text-brand-600 hover:text-brand-800"
                >
                  {selectedIds.size === results.filter((p) => !importedIds.has(p.placeId)).length
                    ? "Deseleccionar todos"
                    : "Seleccionar todos"}
                </button>
                {selectedIds.size > 0 && (
                  <button
                    onClick={handleImport}
                    disabled={importing}
                    className="flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    {importing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <UserPlus className="h-3.5 w-3.5" />
                    )}
                    Importar {selectedIds.size} al CRM
                  </button>
                )}
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
            </div>
          ) : results.length === 0 ? (
            <div className="rounded-xl border bg-white p-12 text-center shadow-sm">
              <Building2 className="mx-auto mb-3 h-10 w-10 text-gray-300" />
              <p className="text-sm font-medium text-gray-900">No se encontraron negocios</p>
              <p className="mt-1 text-xs text-gray-500">
                Intenta con otro nicho o una ubicacion diferente.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {results.map((prospect) => {
                const isSelected = selectedIds.has(prospect.placeId);
                const isImported = importedIds.has(prospect.placeId);

                return (
                  <div
                    key={prospect.placeId}
                    className={`rounded-xl border bg-white p-5 shadow-sm transition-all ${
                      isImported
                        ? "border-green-200 bg-green-50/50"
                        : isSelected
                          ? "border-brand-300 bg-brand-50/50 ring-1 ring-brand-200"
                          : "hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Checkbox */}
                      <button
                        onClick={() => !isImported && toggleSelect(prospect.placeId)}
                        disabled={isImported}
                        className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs transition-all ${
                          isImported
                            ? "border-green-400 bg-green-500 text-white"
                            : isSelected
                              ? "border-brand-600 bg-brand-600 text-white"
                              : "border-gray-300 hover:border-brand-400"
                        }`}
                      >
                        {(isSelected || isImported) && "✓"}
                      </button>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold text-gray-900">{prospect.name}</h3>
                          {isImported && (
                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
                              Importado
                            </span>
                          )}
                          {prospect.openNow !== null && (
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              prospect.openNow
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}>
                              {prospect.openNow ? "Abierto" : "Cerrado"}
                            </span>
                          )}
                          {prospect.primaryType && (
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">
                              {formatType(prospect.primaryType)}
                            </span>
                          )}
                        </div>

                        {/* Address */}
                        <p className="mb-2 flex items-center gap-1 text-xs text-gray-500">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {prospect.address}
                        </p>

                        {/* Details row */}
                        <div className="flex flex-wrap items-center gap-3">
                          {/* Rating */}
                          {prospect.rating && (
                            <span className="flex items-center gap-1 text-xs font-medium text-gray-700">
                              <Star className="h-3.5 w-3.5 text-yellow-400" />
                              {prospect.rating}
                              <span className="text-gray-400">({prospect.totalReviews})</span>
                            </span>
                          )}

                          {/* Phone */}
                          {prospect.phone && (
                            <a
                              href={`tel:${prospect.phone}`}
                              className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-800"
                            >
                              <Phone className="h-3 w-3" />
                              {prospect.phone}
                            </a>
                          )}

                          {/* Website */}
                          {prospect.website && (
                            <a
                              href={prospect.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-800"
                            >
                              <Globe className="h-3 w-3" />
                              Sitio web
                            </a>
                          )}

                          {/* Google Maps */}
                          {prospect.googleMapsUrl && (
                            <a
                              href={prospect.googleMapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Google Maps
                            </a>
                          )}

                          {/* Hours toggle */}
                          {prospect.weekdayHours.length > 0 && (
                            <button
                              onClick={() => toggleHours(prospect.placeId)}
                              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                            >
                              <Clock className="h-3 w-3" />
                              Horarios
                              {expandedHours.has(prospect.placeId) ? (
                                <ChevronUp className="h-3 w-3" />
                              ) : (
                                <ChevronDown className="h-3 w-3" />
                              )}
                            </button>
                          )}
                        </div>

                        {/* Expanded hours */}
                        {expandedHours.has(prospect.placeId) && prospect.weekdayHours.length > 0 && (
                          <div className="mt-2 rounded-lg bg-gray-50 p-3">
                            <p className="mb-1 text-[10px] font-medium text-gray-500">Horarios de atencion:</p>
                            {prospect.weekdayHours.map((day, i) => (
                              <p key={i} className="text-[11px] text-gray-600">{day}</p>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Single import button */}
                      {!isImported && !isSelected && (
                        <button
                          onClick={() => toggleSelect(prospect.placeId)}
                          className="shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!hasSearched && (
        <div className="rounded-xl border bg-white p-12 text-center shadow-sm">
          <Users className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <h2 className="text-lg font-semibold text-gray-900">Encuentra clientes potenciales</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
            Escribe el tipo de negocio que buscas y la ubicacion. Google Places te mostrara
            negocios reales con telefono, sitio web, rating y mas.
            Luego importa los mejores al CRM para contactarlos.
          </p>
        </div>
      )}
    </div>
  );
}
