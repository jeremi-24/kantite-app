'use client';

import React, { useState, useEffect } from 'react';
import { RoleGuard } from '../../components/RoleGuard';
import { api } from '../../lib/api';
import { QuantityStepper } from '../../components/ui/QuantityStepper';
import { EmptyState } from '../../components/ui/EmptyState';
import { SearchInput } from '../../components/ui/SearchInput';
import {
  ClipboardList,
  CheckCircle2,
  AlertTriangle,
  Filter,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  X,
  FileCheck2,
  RefreshCw,
  Eye,
  FileText,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';

interface LotInfo {
  id: string;
  prixReference: string | number;
  quantiteStock: number;
  dateReception?: string;
}

interface ConditionnementInfo {
  id: string;
  type: string;
  facteurConversion: number;
}

interface ProduitInventaire {
  id: string;
  nom: string;
  categorieId: string;
  quantiteTotale?: number;
  categorie?: { id: string; nom: string };
  lots?: LotInfo[];
  conditionnements?: ConditionnementInfo[];
}

interface InventaireRecord {
  id: string;
  produitId: string;
  date: string;
  quantiteComptee: number;
  quantiteSysteme: number;
  ecart: number;
}

interface InventaireSession {
  sessionId: string;
  dateFormatted: string;
  timestamp: number;
  totalProduits: number;
  conformesCount: number;
  ecartsCount: number;
  lines: InventaireRecord[];
}

export default function InventairePage() {
  const [produits, setProduits] = useState<ProduitInventaire[]>([]);
  const [records, setRecords] = useState<InventaireRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters for main list
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEcartsOnly, setFilterEcartsOnly] = useState(false);
  const [filterDate, setFilterDate] = useState('');

  // Dynamic input values per lot { [lotId]: count } or per product { [produitId]: count }
  const [comptages, setComptages] = useState<Record<string, number>>({});
  
  // Confirmation Modal state for new entry
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showConformes, setShowConformes] = useState(false);
  const [isSubmittingAll, setIsSubmittingAll] = useState(false);
  const [activeAction, setActiveAction] = useState<'save' | 'apply' | null>(null);
  const [globalMessage, setGlobalMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // State for History Details Modal
  const [selectedSession, setSelectedSession] = useState<InventaireSession | null>(null);
  const [detailFilterEcartsOnly, setDetailFilterEcartsOnly] = useState(false);

  useEffect(() => {
    fetchData();
  }, [filterEcartsOnly, filterDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodRes, invRes] = await Promise.all([
        api.get('/produits'),
        api.get(
          `/inventaire?${filterEcartsOnly ? 'ecarts_non_nuls=true&' : ''}${
            filterDate ? `date=${filterDate}` : ''
          }`
        ),
      ]);
      setProduits(prodRes.data || []);
      setRecords(invRes.data || []);
    } catch (err) {
      console.error('Erreur chargement inventaire:', err);
    } finally {
      setLoading(false);
    }
  };

  // Group individual inventory records by session (minute timestamp)
  const getGroupedSessions = (recordsList: InventaireRecord[]): InventaireSession[] => {
    const map = new Map<string, InventaireRecord[]>();

    recordsList.forEach((r) => {
      const d = new Date(r.date);
      const minuteKey = isNaN(d.getTime())
        ? r.date
        : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
            d.getDate()
          ).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(
            d.getMinutes()
          ).padStart(2, '0')}`;

      if (!map.has(minuteKey)) {
        map.set(minuteKey, []);
      }
      map.get(minuteKey)!.push(r);
    });

    const sessions: InventaireSession[] = [];
    map.forEach((lines, key) => {
      let conformes = 0;
      let ecarts = 0;
      lines.forEach((l) => {
        if (l.ecart === 0) conformes++;
        else ecarts++;
      });

      const firstDate = lines[0]?.date ? new Date(lines[0].date) : new Date();

      sessions.push({
        sessionId: key,
        dateFormatted: firstDate.toLocaleString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        timestamp: firstDate.getTime(),
        totalProduits: lines.length,
        conformesCount: conformes,
        ecartsCount: ecarts,
        lines,
      });
    });

    return sessions.sort((a, b) => b.timestamp - a.timestamp);
  };

  // Helper to compute overall summary and discrepancies for active form
  const calculateSummary = () => {
    let conformesCount = 0;
    let ecartsCount = 0;

    const items = produits.map((p) => {
      const qteSysteme = p.quantiteTotale || 0;
      const qteComptee =
        p.lots && p.lots.length > 0
          ? p.lots.reduce((acc, l) => acc + (comptages[l.id] ?? l.quantiteStock), 0)
          : (comptages[p.id] ?? qteSysteme);
      const ecart = qteComptee - qteSysteme;

      const lotsDetails = p.lots?.map((l, index) => {
        const c = comptages[l.id] ?? l.quantiteStock;
        const e = c - l.quantiteStock;
        return {
          id: l.id,
          index: index + 1,
          prix: l.prixReference,
          quantiteStock: l.quantiteStock,
          quantiteComptee: c,
          ecart: e,
        };
      });

      const hasLotEcart = lotsDetails?.some((l) => l.ecart !== 0);

      if (ecart === 0 && !hasLotEcart) {
        conformesCount++;
      } else {
        ecartsCount++;
      }

      return {
        produit: p,
        qteSysteme,
        qteComptee,
        ecart,
        lotsDetails,
        hasEcart: ecart !== 0 || hasLotEcart,
      };
    });

    return {
      items,
      totalProduits: produits.length,
      conformesCount,
      ecartsCount,
    };
  };

  // Action 1 (Bouton 2): Save inventory records history only
  const handleSaveOnlyHistory = async () => {
    setIsSubmittingAll(true);
    setActiveAction('save');
    setGlobalMessage(null);
    const summary = calculateSummary();

    try {
      await Promise.all(
        summary.items.map((item) =>
          api.post('/inventaire', {
            produit_id: item.produit.id,
            quantite_comptee: Number(item.qteComptee),
          })
        )
      );

      setGlobalMessage({
        type: 'success',
        text: `Historique d'inventaire enregistré avec succès (${summary.totalProduits} produit(s) enregistrés).`,
      });
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      console.error('Erreur enregistrement inventaire:', err);
      setGlobalMessage({
        type: 'error',
        text: err.response?.data?.message || "Erreur lors de l'enregistrement de l'inventaire",
      });
    } finally {
      setIsSubmittingAll(false);
      setActiveAction(null);
    }
  };

  // Action 2 (Bouton 3): Apply new values to system lots & save inventory history
  const handleApplyNewValues = async () => {
    setIsSubmittingAll(true);
    setActiveAction('apply');
    setGlobalMessage(null);
    const summary = calculateSummary();

    try {
      // 1. Enregistrer les fiches d'historique d'inventaire
      await Promise.all(
        summary.items.map((item) =>
          api.post('/inventaire', {
            produit_id: item.produit.id,
            quantite_comptee: Number(item.qteComptee),
          })
        )
      );

      // 2. Mettre à jour la quantité en stock réelle de chaque lot modifié
      const lotUpdatePromises: Promise<any>[] = [];
      summary.items.forEach((item) => {
        if (item.lotsDetails && item.lotsDetails.length > 0) {
          item.lotsDetails.forEach((l) => {
            if (l.quantiteComptee !== l.quantiteStock) {
              lotUpdatePromises.push(
                api.patch(`/produits/${item.produit.id}/lots/${l.id}`, {
                  quantiteStock: Number(l.quantiteComptee),
                })
              );
            }
          });
        }
      });

      if (lotUpdatePromises.length > 0) {
        await Promise.all(lotUpdatePromises);
      }

      setGlobalMessage({
        type: 'success',
        text: `Nouvelles valeurs de stock appliquées et inventaire enregistré avec succès !`,
      });
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      console.error('Erreur application nouvelles valeurs:', err);
      setGlobalMessage({
        type: 'error',
        text: err.response?.data?.message || "Erreur lors de l'application des nouvelles valeurs de stock",
      });
    } finally {
      setIsSubmittingAll(false);
      setActiveAction(null);
    }
  };

  const summaryData = calculateSummary();
  const groupedSessions = getGroupedSessions(records);

  const filteredProduits = produits.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const matchNom = p.nom.toLowerCase().includes(q);
    const matchCat = p.categorie?.nom.toLowerCase().includes(q);
    return matchNom || matchCat;
  });

  return (
    <RoleGuard requireAdmin={true}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <ClipboardList className="h-6 w-6 text-indigo-600" />
              Module Inventaire & Comptage Physique
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Saisissez les quantités comptées pour chaque lot, puis validez l'inventaire global.
            </p>
          </div>

          <Button
            size="lg"
            variant="primary"
            onClick={() => setIsModalOpen(true)}
            className="gap-2 font-semibold shadow-md px-5 h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition"
          >
            <CheckCircle2 className="h-5 w-5" />
            Valider et Enregistrer l'Inventaire
            {summaryData.ecartsCount > 0 && (
              <Badge variant="danger" className="ml-1 px-2 py-0.5 text-xs font-bold rounded-full bg-rose-500 text-white border-0">
                {summaryData.ecartsCount} écart(s)
              </Badge>
            )}
          </Button>
        </div>

        {globalMessage && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between text-sm font-medium ${
              globalMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {globalMessage.type === 'success' ? (
                <FileCheck2 className="h-5 w-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
              )}
              <span>{globalMessage.text}</span>
            </div>
            <button
              onClick={() => setGlobalMessage(null)}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Section 1: Tableau de Saisie du Comptage par Produit & Lot */}
        <Card className="bg-white overflow-hidden shadow-xs border border-slate-200/80 rounded-xl">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Layers className="h-5 w-5 text-indigo-600" />
              Grille de Saisie de Stock ({filteredProduits.length} produits)
            </CardTitle>

            {/* Mini Searchbar */}
            <div className="w-full sm:w-72">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Rechercher un produit, catégorie..."
              />
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="py-12 text-center text-slate-500 text-sm font-medium flex items-center justify-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-indigo-600" />
                Chargement du catalogue...
              </div>
            ) : filteredProduits.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  title="Aucun produit trouvé"
                  message="Aucun produit ne correspond à votre recherche."
                  icon={ClipboardList}
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3.5 w-2/5">Produit & Catégorie</th>
                      <th className="px-6 py-3.5">Détail des Lots & Quantités Comptées</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProduits.map((p) => {
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/70 transition align-top">
                          {/* Col 1: Produit & Catégorie */}
                          <td className="px-6 py-4">
                            <span className="font-bold text-slate-900 block text-sm">{p.nom}</span>
                            <span className="text-xs text-slate-500 font-medium">
                              {p.categorie?.nom || 'Sans catégorie'}
                            </span>
                          </td>

                          {/* Col 2: Sub-section / Saisie par Lot */}
                          <td className="px-6 py-4">
                            {p.lots && p.lots.length > 0 ? (
                              <div className="space-y-2.5">
                                {p.lots.map((l, index) => {
                                  const lotComptage = comptages[l.id] ?? l.quantiteStock;
                                  return (
                                    <div
                                      key={l.id}
                                      className="p-2.5 rounded-lg bg-slate-50/80 border border-slate-200 flex flex-wrap items-center justify-between gap-3 hover:bg-slate-100/50 transition"
                                    >
                                      <div className="flex items-center gap-2.5">
                                        <span className="font-bold text-slate-800 text-xs bg-slate-200/70 px-2 py-0.5 rounded">
                                          Lot {index + 1}
                                        </span>
                                        <span className="text-xs text-slate-600 font-semibold bg-white px-2 py-0.5 rounded border border-slate-200">
                                          {Number(l.prixReference).toLocaleString()} FCFA
                                        </span>
                                        <span className="text-[11px] text-slate-400 font-medium">
                                          (Système: {l.quantiteStock} u)
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-semibold text-slate-600">Compté :</span>
                                        <QuantityStepper
                                          value={lotComptage}
                                          onChange={(val) =>
                                            setComptages((prev) => ({ ...prev, [l.id]: val }))
                                          }
                                          min={0}
                                        />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                                <span className="text-xs text-slate-500 italic">Aucun lot actif</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold text-slate-600">Compté :</span>
                                  <QuantityStepper
                                    value={comptages[p.id] ?? (p.quantiteTotale || 0)}
                                    onChange={(val) =>
                                      setComptages((prev) => ({ ...prev, [p.id]: val }))
                                    }
                                    min={0}
                                  />
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Bottom Action Bar */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3">
              <span className="text-xs text-slate-500 font-medium">
                Vérifiez vos comptages ci-dessus avant de procéder à l'enregistrement global.
              </span>
              <Button
                size="default"
                variant="primary"
                onClick={() => setIsModalOpen(true)}
                className="gap-2 font-semibold shadow-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-6"
              >
                <CheckCircle2 className="h-4 w-4" />
                Valider et Enregistrer l'Inventaire
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Historique Synthétique des Inventaires (Grouping par Session) */}
        <div className="space-y-4 pt-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-indigo-600" />
              Historique des Sessions d'Inventaires
            </h2>

            <div className="flex items-center gap-4 bg-white p-2 rounded-lg border border-slate-200 shadow-xs">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={filterEcartsOnly}
                  onChange={(e) => setFilterEcartsOnly(e.target.checked)}
                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
                <Filter className="h-3.5 w-3.5 text-slate-500" />
                Masquer les sessions à 0 écart
              </label>

              <div className="flex items-center gap-1 text-slate-400 pl-2 border-l border-slate-200">
                <Calendar className="h-3.5 w-3.5" />
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="rounded border-none bg-transparent px-1 py-0.5 text-xs font-medium text-slate-700 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {groupedSessions.length === 0 ? (
            <EmptyState
              title="Aucun inventaire enregistré"
              message="Aucune session d'inventaire physique n'a été enregistrée pour le moment."
              icon={ClipboardList}
            />
          ) : (
            <Card className="overflow-hidden bg-white border border-slate-200/80 rounded-xl shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3.5">Session / Date</th>
                      <th className="px-6 py-3.5 text-center">Produits Comptés</th>
                      <th className="px-6 py-3.5 text-center">Bilan Conformité</th>
                      <th className="px-6 py-3.5 text-center">Statut Écarts</th>
                      <th className="px-6 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {groupedSessions.map((session) => {
                      const hasEcarts = session.ecartsCount > 0;

                      return (
                        <tr key={session.sessionId} className="hover:bg-slate-50/80 transition">
                          <td className="px-6 py-4 font-semibold text-slate-900 flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                              <FileText className="h-4 w-4" />
                            </div>
                            <div>
                              <span className="block text-sm font-bold text-slate-900">
                                Inventaire du {session.dateFormatted}
                              </span>
                              <span className="text-xs text-slate-400 font-normal">
                                Enregistré par l'administrateur
                              </span>
                            </div>
                          </td>

                          <td className="px-6 py-4 text-center font-semibold text-slate-700">
                            {session.totalProduits} produits
                          </td>

                          <td className="px-6 py-4 text-center">
                            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                              {session.conformesCount} conformes
                            </span>
                            {hasEcarts && (
                              <span className="ml-2 text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                                {session.ecartsCount} écarts
                              </span>
                            )}
                          </td>

                          <td className="px-6 py-4 text-center">
                            {!hasEcarts ? (
                              <Badge variant="secondary" className="font-medium bg-slate-100 text-slate-700">
                                0 Écart (Conforme)
                              </Badge>
                            ) : (
                              <Badge variant="danger" className="font-semibold gap-1 bg-rose-100 text-rose-800">
                                <AlertTriangle className="h-3 w-3 text-rose-600" />
                                {session.ecartsCount} Écart(s) détecté(s)
                              </Badge>
                            )}
                          </td>

                          <td className="px-6 py-4 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedSession(session);
                                setDetailFilterEcartsOnly(false);
                              }}
                              className="gap-1.5 text-xs font-semibold text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Voir les détails
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Modal 1: Confirmation de l'Inventaire en cours de saisie */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs animate-in fade-in-0 duration-200">
          <div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200/80 overflow-hidden">
            {/* Modal Header */}
            <div className="px-8 pt-7 pb-4 bg-white flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                  Confirmation de l'inventaire
                </h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  Vérifie les écarts avant enregistrement.
                </p>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1.5 hover:bg-slate-100 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Stats Summary Line & Checkbox */}
            <div className="px-8 pb-4 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 text-sm font-medium">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900">{summaryData.totalProduits} produits</span>
                <span className="text-slate-300">·</span>
                <span className="font-bold text-rose-600">{summaryData.ecartsCount} écarts</span>
                <span className="text-slate-300">·</span>
                <span className="text-emerald-700 font-medium">{summaryData.conformesCount} conformes</span>
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showConformes}
                  onChange={(e) => setShowConformes(e.target.checked)}
                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 h-4 w-4"
                />
                Afficher les conformes
              </label>
            </div>

            {/* Modal Content Table */}
            <div className="px-8 py-4 overflow-y-auto flex-1">
              <div className="border-t border-slate-100 overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-700 border-collapse">
                  <thead className="text-xs font-semibold text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4 w-1/3">Produit</th>
                      <th className="py-3 px-4">Lot</th>
                      <th className="py-3 px-4 text-center">Système</th>
                      <th className="py-3 px-4 text-center">Compté</th>
                      <th className="py-3 px-4 text-right">Écart</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryData.items
                      .filter((item) => (showConformes ? true : item.hasEcart))
                      .map((item) => {
                        const lots =
                          item.lotsDetails && item.lotsDetails.length > 0
                            ? item.lotsDetails
                            : [
                                {
                                  id: item.produit.id,
                                  index: 1,
                                  prix: '',
                                  quantiteStock: item.qteSysteme,
                                  quantiteComptee: item.qteComptee,
                                  ecart: item.ecart,
                                  isNoLot: true,
                                },
                              ];

                        return lots.map((l, lIdx) => {
                          const isFirstLot = lIdx === 0;
                          const lotEcart = l.ecart;

                          const isNegative = item.ecart < 0 || lotEcart < 0;
                          const isPositive = !isNegative && (item.ecart > 0 || lotEcart > 0);

                          const rowBgClass = isNegative
                            ? 'bg-[#fff5f2]'
                            : isPositive
                            ? 'bg-[#f0fdf4]'
                            : 'hover:bg-slate-50';

                          const borderLeftClass = isNegative
                            ? 'border-l-4 border-rose-600'
                            : isPositive
                            ? 'border-l-4 border-emerald-600'
                            : '';

                          return (
                            <tr
                              key={`${item.produit.id}-${l.id || lIdx}`}
                              className={`text-sm transition ${rowBgClass}`}
                            >
                              {/* Produit Name & Category */}
                              {isFirstLot && (
                                <td
                                  rowSpan={lots.length}
                                  className={`py-3.5 px-4 align-top ${borderLeftClass}`}
                                >
                                  <span className="font-bold text-slate-900 text-sm block">
                                    {item.produit.nom}
                                  </span>
                                  <span className="text-xs text-slate-500 font-normal block mt-0.5">
                                    {item.produit.categorie?.nom || 'Sans catégorie'}
                                  </span>
                                </td>
                              )}

                              {/* Lot Column */}
                              <td className="py-3.5 px-4 text-slate-700 font-normal">
                                {l.isNoLot ? (
                                  <span className="text-slate-400 italic">Lot unique</span>
                                ) : (
                                  `Lot ${l.index} — ${
                                    l.prix ? `${Number(l.prix).toLocaleString('fr-FR')} F` : ''
                                  }`
                                )}
                              </td>

                              {/* Système */}
                              <td className="py-3.5 px-4 text-center text-slate-700 font-normal">
                                {l.quantiteStock}
                              </td>

                              {/* Compté */}
                              <td className="py-3.5 px-4 text-center text-slate-900 font-medium">
                                {l.quantiteComptee}
                              </td>

                              {/* Écart */}
                              <td className="py-3.5 px-4 text-right font-bold">
                                {lotEcart === 0 ? (
                                  <span className="text-slate-400 font-normal">—</span>
                                ) : lotEcart > 0 ? (
                                  <span className="text-emerald-600">+{lotEcart}</span>
                                ) : (
                                  <span className="text-rose-600">−{Math.abs(lotEcart)}</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      )}
                  </tbody>
                </table>
              </div>

              {/* Bottom line */}
              {!showConformes && summaryData.conformesCount > 0 && (
                <div className="pt-4 text-sm text-slate-600 font-medium">
                  {summaryData.conformesCount} produits conformes masqués.{' '}
                  <button
                    onClick={() => setShowConformes(true)}
                    className="font-bold text-slate-900 underline hover:text-indigo-600 transition cursor-pointer"
                  >
                    Tout afficher
                  </button>
                </div>
              )}
            </div>

            {/* Modal Footer - 3 Action Buttons */}
            <div className="px-8 py-4 bg-slate-50/80 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-3">
              <Button
                variant="outline"
                size="default"
                disabled={isSubmittingAll}
                onClick={() => setIsModalOpen(false)}
                className="text-slate-700 border-slate-300 font-medium w-full sm:w-auto"
              >
                Annuler
              </Button>

              <Button
                variant="outline"
                size="default"
                disabled={isSubmittingAll}
                onClick={handleSaveOnlyHistory}
                className="text-slate-800 border-slate-300 font-semibold hover:bg-slate-100 w-full sm:w-auto"
              >
                {isSubmittingAll && activeAction === 'save' ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    Enregistrement...
                  </>
                ) : (
                  'Confirmer et enregistrer tout'
                )}
              </Button>

              <Button
                variant="primary"
                size="default"
                disabled={isSubmittingAll}
                onClick={handleApplyNewValues}
                className="bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-xs px-5 w-full sm:w-auto"
              >
                {isSubmittingAll && activeAction === 'apply' ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    Application...
                  </>
                ) : (
                  'Appliquer les nouvelles valeurs'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Détails d'une session d'inventaire déjà enregistrée */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs animate-in fade-in-0 duration-200">
          <div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200/80 overflow-hidden">
            {/* Modal Header */}
            <div className="px-8 pt-7 pb-4 bg-white flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                  Détails de l'inventaire du {selectedSession.dateFormatted}
                </h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  Rapport détaillé des lignes d'inventaire enregistrées pour cette session.
                </p>
              </div>

              <button
                onClick={() => setSelectedSession(null)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1.5 hover:bg-slate-100 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Stats Summary Line & Filter Checkbox */}
            <div className="px-8 pb-4 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 text-sm font-medium">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900">{selectedSession.totalProduits} produits</span>
                <span className="text-slate-300">·</span>
                <span className="font-bold text-rose-600">{selectedSession.ecartsCount} écarts</span>
                <span className="text-slate-300">·</span>
                <span className="text-emerald-700 font-medium">{selectedSession.conformesCount} conformes</span>
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={detailFilterEcartsOnly}
                  onChange={(e) => setDetailFilterEcartsOnly(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                Afficher uniquement les écarts (≠ 0)
              </label>
            </div>

            {/* Modal Content Table */}
            <div className="px-8 py-4 overflow-y-auto flex-1">
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-50 text-xs font-semibold text-slate-500 border-b border-slate-200 uppercase">
                    <tr>
                      <th className="py-3.5 px-5">Produit</th>
                      <th className="py-3.5 px-5 text-center">Qté Système</th>
                      <th className="py-3.5 px-5 text-center">Qté Comptée (Physique)</th>
                      <th className="py-3.5 px-5 text-right">Écart Constaté</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {selectedSession.lines
                      .filter((r) => (detailFilterEcartsOnly ? r.ecart !== 0 : true))
                      .map((r) => {
                        const prod = produits.find((p) => p.id === r.produitId);
                        const prodName = prod?.nom || r.produitId;
                        const catName = prod?.categorie?.nom || 'Sans catégorie';
                        const isNegative = r.ecart < 0;
                        const isPositive = r.ecart > 0;

                        return (
                          <tr
                            key={r.id}
                            className={`transition ${
                              isNegative
                                ? 'bg-[#fff5f2]'
                                : isPositive
                                ? 'bg-[#f0fdf4]'
                                : 'hover:bg-slate-50'
                            }`}
                          >
                            <td className="py-3.5 px-5">
                              <span className="font-bold text-slate-900 block">{prodName}</span>
                              <span className="text-xs text-slate-500">{catName}</span>
                            </td>

                            <td className="py-3.5 px-5 text-center text-slate-600 font-medium">
                              {r.quantiteSysteme} u
                            </td>

                            <td className="py-3.5 px-5 text-center font-bold text-slate-900">
                              {r.quantiteComptee} u
                            </td>

                            <td className="py-3.5 px-5 text-right font-bold">
                              {r.ecart === 0 ? (
                                <span className="text-slate-400 font-normal">—</span>
                              ) : isPositive ? (
                                <span className="text-emerald-600">+{r.ecart} u</span>
                              ) : (
                                <span className="text-rose-600">−{Math.abs(r.ecart)} u</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
              <Button
                variant="outline"
                size="default"
                onClick={() => setSelectedSession(null)}
                className="text-slate-700 font-semibold px-6"
              >
                Fermer
              </Button>
            </div>
          </div>
        </div>
      )}
    </RoleGuard>
  );
}
