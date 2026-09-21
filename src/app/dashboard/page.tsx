'use client';

import React, { useState, useEffect } from 'react';
import { RoleGuard } from '../../components/RoleGuard';
import { api } from '../../lib/api';
import {
  LayoutDashboard,
  TrendingUp,
  PackageCheck,
  AlertTriangle,
  Tag,
  MapPin,
  Trophy,
  CheckCircle2,
  Calendar,
  Filter,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';

const formatDateInput = (date: Date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const getPresetDates = (preset: 'jour' | 'semaine' | 'mois') => {
  const now = new Date();
  const todayStr = formatDateInput(now);

  if (preset === 'jour') {
    return { start: todayStr, end: todayStr };
  } else if (preset === 'semaine') {
    const dayOfWeek = now.getDay() || 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek - 1));
    return { start: formatDateInput(monday), end: todayStr };
  } else {
    // mois
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start: formatDateInput(firstDay), end: todayStr };
  }
};

export default function DashboardPage() {
  const [modePeriode, setModePeriode] = useState<'jour' | 'semaine' | 'mois' | 'custom'>('jour');
  const [dateDebut, setDateDebut] = useState<string>(() => getPresetDates('jour').start);
  const [dateFin, setDateFin] = useState<string>(() => getPresetDates('jour').end);

  const [caTotal, setCaTotal] = useState<number>(0);
  const [alertes, setAlertes] = useState<any[]>([]);
  const [topProduits, setTopProduits] = useState<any[]>([]);
  const [ecarts, setEcarts] = useState<any[]>([]);
  const [stockSummary, setStockSummary] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [lieux, setLieux] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData(dateDebut, dateFin, modePeriode);
  }, []);

  const fetchDashboardData = async (
    start = dateDebut,
    end = dateFin,
    mode = modePeriode
  ) => {
    setLoading(true);
    try {
      let caUrl = `/dashboard/chiffre-affaires?`;
      let topUrl = `/dashboard/top-produits?`;
      let ecartsUrl = `/dashboard/ecarts-inventaire?`;

      if (start && end) {
        caUrl += `date_debut=${start}&date_fin=${end}`;
        topUrl += `date_debut=${start}&date_fin=${end}`;
        ecartsUrl += `date_debut=${start}&date_fin=${end}`;
      } else {
        caUrl += `periode=${mode}`;
      }

      const [caRes, alertesRes, topRes, ecartsRes, stockRes, catRes, lieuRes] = await Promise.all([
        api.get(caUrl),
        api.get('/dashboard/alertes-stock-bas'),
        api.get(topUrl),
        api.get(ecartsUrl),
        api.get('/dashboard/stock'),
        api.get('/categories'),
        api.get('/lieux-stock'),
      ]);

      setCaTotal(Number(caRes.data?.total || 0));
      setAlertes(alertesRes.data || []);
      setTopProduits(topRes.data || []);
      setEcarts(ecartsRes.data || []);
      setStockSummary(stockRes.data || []);
      setCategories(catRes.data || []);
      setLieux(lieuRes.data || []);
    } catch (err) {
      console.error('Erreur chargement dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePresetChange = (preset: 'jour' | 'semaine' | 'mois') => {
    setModePeriode(preset);
    const { start, end } = getPresetDates(preset);
    setDateDebut(start);
    setDateFin(end);
    fetchDashboardData(start, end, preset);
  };

  const handleApplyFilter = () => {
    fetchDashboardData(dateDebut, dateFin, modePeriode);
  };

  const totalValeurStock = stockSummary.reduce(
    (sum, item) => sum + Number(item.valeur_estimee || 0),
    0
  );

  // Aggregation: Stock by Category
  const stockByCat = categories.map((cat) => {
    const items = stockSummary.filter((s) => s.categorie_id === cat.id);
    const totalQte = items.reduce((sum, i) => sum + Number(i.quantite || 0), 0);
    const totalVal = items.reduce((sum, i) => sum + Number(i.valeur_estimee || 0), 0);
    return { id: cat.id, nom: cat.nom, totalQte, totalVal };
  });

  // Aggregation: Stock by Lieu
  const stockByLieu = lieux.map((l) => {
    const items = stockSummary.filter((s) => s.lieu_stock_id === l.id);
    const totalQte = items.reduce((sum, i) => sum + Number(i.quantite || 0), 0);
    const totalVal = items.reduce((sum, i) => sum + Number(i.valeur_estimee || 0), 0);
    return { id: l.id, nom: l.nom, totalQte, totalVal };
  });

  const getPeriodeLabel = () => {
    if (modePeriode === 'jour') return "Aujourd'hui";
    if (modePeriode === 'semaine') return 'Cette Semaine';
    if (modePeriode === 'mois') return 'Ce Mois';
    return `Du ${dateDebut} au ${dateFin}`;
  };

  return (
    <RoleGuard requireAdmin={true}>
      <div className="space-y-6">
        {/* Filter & Header Bar */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <LayoutDashboard className="h-6 w-6 text-slate-700" />
              Tableau de Bord Admin
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Vue d'ensemble des ventes, stocks et alertes par période
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Presets */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
              {(['jour', 'semaine', 'mois'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => handlePresetChange(p)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition ${
                    modePeriode === p
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-200/60'
                  }`}
                >
                  {p === 'jour' ? "Aujourd'hui" : p === 'semaine' ? 'Cette semaine' : 'Ce mois'}
                </button>
              ))}
              <button
                onClick={() => setModePeriode('custom')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                  modePeriode === 'custom'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                Personnalisé
              </button>
            </div>

            {/* Custom Dates & Filter Button */}
            <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200 text-xs">
              <Calendar className="h-4 w-4 text-slate-400 ml-1 hidden sm:block" />
              <div className="flex items-center gap-1">
                <span className="text-slate-500 font-medium">Du :</span>
                <input
                  type="date"
                  value={dateDebut}
                  onChange={(e) => {
                    setDateDebut(e.target.value);
                    setModePeriode('custom');
                  }}
                  className="bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 text-xs focus:ring-1 focus:ring-slate-900 outline-hidden"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-slate-500 font-medium">Au :</span>
                <input
                  type="date"
                  value={dateFin}
                  onChange={(e) => {
                    setDateFin(e.target.value);
                    setModePeriode('custom');
                  }}
                  className="bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 text-xs focus:ring-1 focus:ring-slate-900 outline-hidden"
                />
              </div>
              <Button
                onClick={handleApplyFilter}
                className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1 h-7 text-xs flex items-center gap-1"
              >
                <Filter className="h-3 w-3" />
                Filtrer
              </Button>
            </div>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-white">
            <CardContent className="p-6 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Chiffre d'Affaires ({getPeriodeLabel()})
                </span>
                <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 tracking-tight">
                {caTotal.toLocaleString()} FCFA
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-6 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Valeur Estimée du Stock
                </span>
                <div className="p-2 bg-slate-100 rounded-lg text-slate-700">
                  <PackageCheck className="h-5 w-5" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 tracking-tight">
                {totalValeurStock.toLocaleString()} FCFA
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-6 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Alertes Stock Bas (&lt; Qte Min)
                </span>
                <div
                  className={`p-2 rounded-lg ${
                    alertes.length > 0
                      ? 'bg-rose-50 text-rose-600'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <AlertTriangle className="h-5 w-5" />
                </div>
              </div>
              <p
                className={`text-2xl font-bold tracking-tight ${
                  alertes.length > 0 ? 'text-rose-600' : 'text-slate-900'
                }`}
              >
                {alertes.length} produit(s)
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Section Grid: Stock par Catégorie & Stock par Lieu */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Stock par Catégorie */}
          <Card className="bg-white">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Tag className="h-4 w-4 text-slate-500" />
                Stock par Catégorie
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 font-semibold text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="p-3">Catégorie</th>
                      <th className="p-3">Quantité Totale</th>
                      <th className="p-3">Valeur Estimée</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {stockByCat.map((cat) => (
                      <tr key={cat.id} className="hover:bg-slate-50/60">
                        <td className="p-3 font-semibold text-slate-900">{cat.nom}</td>
                        <td className="p-3 font-medium">{cat.totalQte} u</td>
                        <td className="p-3 font-semibold text-emerald-700">
                          {cat.totalVal.toLocaleString()} FCFA
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Stock par Lieu */}
          <Card className="bg-white">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-slate-500" />
                Stock par Lieu
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 font-semibold text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="p-3">Lieu de Stock</th>
                      <th className="p-3">Quantité Totale</th>
                      <th className="p-3">Valeur Estimée</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {stockByLieu.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50/60">
                        <td className="p-3 font-semibold text-slate-900">{l.nom}</td>
                        <td className="p-3 font-medium">{l.totalQte} u</td>
                        <td className="p-3 font-semibold text-emerald-700">
                          {l.totalVal.toLocaleString()} FCFA
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Section Grid: Alertes & Top Ventes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Alertes Stock Bas */}
          <Card className="bg-white">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-500" />
                Alertes Stock Bas
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {alertes.length === 0 ? (
                <div className="text-sm text-slate-500 bg-slate-50 p-4 rounded-lg flex items-center gap-2 border border-slate-200/60">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Aucun produit en sous-effectif de stock !</span>
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {alertes.map((a) => (
                    <div
                      key={a.id}
                      className="p-3 bg-rose-50/50 border border-rose-200/80 rounded-lg flex justify-between items-center text-sm"
                    >
                      <div>
                        <h4 className="font-semibold text-rose-950">{a.nom}</h4>
                        <p className="text-xs text-rose-700 mt-0.5">Seuil min : {a.qte_min} u</p>
                      </div>
                      <Badge variant="danger" className="font-semibold bg-white text-rose-700 border-rose-200">
                        Stock actuel : {a.quantite_stock} u
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Produit les plus vendus */}
          <Card className="bg-white">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                Top 10 Produits Vendus ({getPeriodeLabel()})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {topProduits.length === 0 ? (
                <div className="text-sm text-slate-500 bg-slate-50 p-4 rounded-lg border border-slate-200/60">
                  Aucune vente enregistrée pour cette période.
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {topProduits.map((tp, idx) => (
                    <div
                      key={tp.id}
                      className="p-3 bg-slate-50 border border-slate-200/70 rounded-lg flex justify-between items-center text-sm"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-400 text-xs w-5 text-center">
                          #{idx + 1}
                        </span>
                        <h4 className="font-semibold text-slate-900">{tp.nom}</h4>
                      </div>
                      <Badge variant="secondary" className="font-semibold bg-slate-200/80 text-slate-800">
                        {tp.quantite_vendue} vendus
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Écarts d'inventaires récents */}
        <Card className="bg-white">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Écarts d'Inventaire ({getPeriodeLabel()})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {ecarts.length === 0 ? (
              <div className="text-sm text-slate-500 bg-slate-50 p-4 rounded-lg border border-slate-200/60">
                Aucun écart d'inventaire détecté pour cette période.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 font-semibold text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Produit ID</th>
                      <th className="p-3">Qté Comptée</th>
                      <th className="p-3">Qté Système</th>
                      <th className="p-3">Écart</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ecarts.map((e) => (
                      <tr key={e.id} className="hover:bg-slate-50/60">
                        <td className="p-3 text-slate-500">{new Date(e.date).toLocaleString()}</td>
                        <td className="p-3 font-mono text-slate-700">{e.produit_id.slice(0, 8)}...</td>
                        <td className="p-3 font-semibold">{e.quantite_comptee}</td>
                        <td className="p-3 text-slate-500">{e.quantite_systeme}</td>
                        <td className="p-3 font-bold text-rose-600">{e.ecart}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}
