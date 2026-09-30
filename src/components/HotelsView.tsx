import React, { useState } from 'react';
import { Hotel, REGIONS, CHAINS, Region, Chain } from '../types';
import { Building2, Plus, Search, MapPin, Layers, FileText, Check } from 'lucide-react';

interface HotelsViewProps {
  hotels: Hotel[];
  onAddHotel: (hotel: { name: string; region: Region; chain: Chain }) => Promise<void>;
  onFilterByHotel: (hotelName: string) => void;
}

export const HotelsView: React.FC<HotelsViewProps> = ({
  hotels,
  onAddHotel,
  onFilterByHotel,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [chainFilter, setChainFilter] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // New hotel form state
  const [name, setName] = useState('');
  const [region, setRegion] = useState<Region>('HAMMAMET');
  const [chain, setChain] = useState<Chain>('IBEROSTAR');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const filteredHotels = hotels.filter((h) => {
    const matchesSearch =
      !searchTerm.trim() ||
      h.name.toLowerCase().includes(searchTerm.toLowerCase().trim());
    const matchesRegion = !regionFilter || h.region === regionFilter;
    const matchesChain = !chainFilter || h.chain === chainFilter;
    return matchesSearch && matchesRegion && matchesChain;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError("Le nom de l'hôtel est requis.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await onAddHotel({ name: name.trim(), region, chain });
      setName('');
      setIsAdding(false);
    } catch (err: any) {
      setFormError(err.message || "Erreur lors de l'enregistrement de l'hôtel");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold text-slate-900">Répertoire des Hôtels</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Gestion du référentiel hôtelier par région et chaîne de rattachement ({hotels.length} établissements)
          </p>
        </div>

        <button
          id="btn-toggle-add-hotel"
          onClick={() => setIsAdding(!isAdding)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>+ Ajouter un hôtel</span>
        </button>
      </div>

      {/* Inline Add Hotel Form */}
      {isAdding && (
        <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-5 shadow-xs transition-all">
          <h2 className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600" />
            <span>Enregistrer un nouvel établissement</span>
          </h2>

          {formError && (
            <div className="p-2.5 mb-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg">
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nom de l'hôtel *
              </label>
              <input
                type="text"
                placeholder="Ex: Iberostar Selection Kantaoui Bay"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Région *
              </label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value as Region)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {REGIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Chaîne *
              </label>
              <select
                value={chain}
                onChange={(e) => setChain(e.target.value as Chain)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CHAINS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-4 flex justify-end gap-2 pt-2 border-t border-blue-200/60 mt-1">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 bg-white border border-slate-300 rounded-md"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-2xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{submitting ? 'Enregistrement...' : 'Valider'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Rechercher un hôtel..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Toutes les régions</option>
            {REGIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={chainFilter}
            onChange={(e) => setChainFilter(e.target.value)}
            className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Toutes les chaînes</option>
            {CHAINS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Hotels Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredHotels.map((hotel) => (
          <div
            key={hotel.id}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:shadow-sm hover:border-blue-300 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-sm text-slate-900 leading-snug">
                  {hotel.name}
                </h3>
                <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 whitespace-nowrap">
                  {hotel.chainDisplayName || hotel.chain}
                </span>
              </div>

              <div className="mt-2 space-y-1 text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>Région : </span>
                  <strong className="text-slate-700">
                    {hotel.regionDisplayName || hotel.region}
                  </strong>
                </div>
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  <span>Chaîne : </span>
                  <strong className="text-slate-700">
                    {hotel.chainDisplayName || hotel.chain}
                  </strong>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {hotel.contractCount || 0} contrat{(hotel.contractCount || 0) > 1 ? 's' : ''}
                </span>
              </span>

              <button
                onClick={() => onFilterByHotel(hotel.name)}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
              >
                Voir les contrats →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
