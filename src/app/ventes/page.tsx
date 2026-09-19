'use client';

import React, { useState, useEffect } from 'react';
import { RoleGuard } from '../../components/RoleGuard';
import { api } from '../../lib/api';
import { SearchInput } from '../../components/ui/SearchInput';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Receipt, Printer, XCircle, FileText, Banknote, Smartphone, X, Calendar, Filter } from 'lucide-react';
import { ReceiptModal, ReceiptData } from '../../components/ReceiptModal';

interface LigneVente {
  id: string;
  venteId: string;
  produitId: string;
  produitNom?: string;
  lotId: string;
  lotPrixVenteUnitaire?: string | number;
  conditionnementId: string;
  conditionnementLibelle?: string;
  quantite: number;
  prixReelApplique: string | number;
  estOffert: boolean;
  statut: 'VALIDEE' | 'ANNULEE';
}

interface Vente {
  id: string;
  date: string;
  modePaiement: 'CASH' | 'MOBILE_MONEY';
  total: string | number;
  statut: 'VALIDEE' | 'ANNULEE';
  utilisateurId: string;
  lignes?: LigneVente[];
}

interface Categorie {
  id: string;
  nom: string;
}

interface Produit {
  id: string;
  nom: string;
}

export default function VentesPage() {
  const [ventes, setVentes] = useState<Vente[]>([]);
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterDateDebut, setFilterDateDebut] = useState('');
  const [filterDateFin, setFilterDateFin] = useState('');
  const [filterProduitId, setFilterProduitId] = useState('');
  const [filterCategorieId, setFilterCategorieId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected sale for detail modal
  const [selectedVente, setSelectedVente] = useState<Vente | null>(null);

  // Receipt Modal state (POS Ticket)
  const [receiptModalVente, setReceiptModalVente] = useState<ReceiptData | null>(null);

  // ConfirmModal states for cancellation
  const [confirmCancelSaleId, setConfirmCancelSaleId] = useState<string | null>(null);
  const [confirmCancelLine, setConfirmCancelLine] = useState<{ venteId: string; lineId: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchVentes();
  }, [filterDateDebut, filterDateFin, filterProduitId, filterCategorieId]);

  const fetchInitialData = async () => {
    try {
      const [cRes, pRes] = await Promise.all([
        api.get('/categories'),
        api.get('/produits'),
      ]);
      setCategories(cRes.data || []);
      setProduits(pRes.data || []);
    } catch (err) {
      console.error('Erreur chargement référentiels:', err);
    }
  };

  const fetchVentes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterDateDebut) params.append('date_debut', filterDateDebut);
      if (filterDateFin) params.append('date_fin', filterDateFin);
      if (filterProduitId) params.append('produit_id', filterProduitId);
      if (filterCategorieId) params.append('categorie_id', filterCategorieId);

      const res = await api.get(`/ventes?${params.toString()}`);
      setVentes(res.data || []);
    } catch (err) {
      console.error('Erreur chargement ventes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetail = async (v: Vente) => {
    try {
      const res = await api.get(`/ventes/${v.id}`);
      setSelectedVente(res.data);
    } catch (err) {
      console.error('Erreur chargement détail vente:', err);
    }
  };

  const handlePrintTicket = async (v: Vente) => {
    try {
      const res = await api.get(`/ventes/${v.id}`);
      setReceiptModalVente(res.data);
    } catch (err) {
      console.error('Erreur chargement ticket POS:', err);
    }
  };

  const handleAnnulerVente = async (venteId: string) => {
    setErrorMsg('');
    try {
      await api.post(`/ventes/${venteId}/annuler`);
      setConfirmCancelSaleId(null);
      if (selectedVente?.id === venteId) {
        setSelectedVente(null);
      }
      fetchVentes();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Erreur lors de l’annulation de la vente');
    }
  };

  const handleAnnulerLigne = async (venteId: string, lineId: string) => {
    setErrorMsg('');
    try {
      await api.post(`/ventes/${venteId}/lignes/${lineId}/annuler`);
      setConfirmCancelLine(null);
      const res = await api.get(`/ventes/${venteId}`);
      setSelectedVente(res.data);
      fetchVentes();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Erreur lors de l’annulation de la ligne');
    }
  };

  const filteredVentes = ventes.filter((v) => {
    if (!searchQuery) return true;
    return v.id.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <RoleGuard requireAdmin={false}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="h-5 w-5 text-indigo-600" />
              Historique des Ventes
            </h1>
            <p className="text-xs text-slate-500">
              Consulter les reçus, filtrer par période ou annuler des transactions
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Du:</span>
              <input
                type="date"
                value={filterDateDebut}
                onChange={(e) => setFilterDateDebut(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Au:</span>
              <input
                type="date"
                value={filterDateFin}
                onChange={(e) => setFilterDateFin(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none"
              />
            </div>
            <select
              value={filterCategorieId}
              onChange={(e) => setFilterCategorieId(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none"
            >
              <option value="">Toutes les catégories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                </option>
              ))}
            </select>
            <select
              value={filterProduitId}
              onChange={(e) => setFilterProduitId(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none"
            >
              <option value="">Tous les produits</option>
              {produits.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nom}
                </option>
              ))}
            </select>
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="N° Vente..."
              className="w-full sm:w-44"
            />
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-lg border border-red-200">
            {errorMsg}
          </div>
        )}

        {/* Ventes Table */}
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500 font-medium">
            Chargement de l'historique...
          </div>
        ) : filteredVentes.length === 0 ? (
          <EmptyState
            title="Aucune vente trouvée"
            message="Aucune vente ne correspond à vos critères de recherche."
            icon={Receipt}
          />
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 font-semibold text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="px-5 py-3">N° Vente</th>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Règlement</th>
                    <th className="px-5 py-3">Montant Total</th>
                    <th className="px-5 py-3">Statut</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredVentes.map((v) => {
                    const isAnnulee = v.statut === 'ANNULEE';
                    return (
                      <tr key={v.id} className="hover:bg-slate-50/50 transition">
                        <td className="px-5 py-3 font-mono font-bold text-slate-900">
                          #{v.id.slice(0, 8)}
                        </td>
                        <td className="px-5 py-3 text-slate-600">
                          {new Date(v.date).toLocaleString()}
                        </td>
                        <td className="px-5 py-3">
                          <Badge variant={v.modePaiement === 'CASH' ? 'success' : 'info'}>
                            {v.modePaiement === 'CASH' ? (
                              <Banknote className="h-3 w-3 mr-1" />
                            ) : (
                              <Smartphone className="h-3 w-3 mr-1" />
                            )}
                            {v.modePaiement === 'CASH' ? 'Espèces' : 'Mobile Money'}
                          </Badge>
                        </td>
                        <td className="px-5 py-3 font-bold text-slate-900 text-sm">
                          {Number(v.total).toLocaleString()} FCFA
                        </td>
                        <td className="px-5 py-3">
                          <Badge variant={isAnnulee ? 'destructive' : 'success'}>
                            {isAnnulee ? 'ANNULÉE' : 'VALIDÉE'}
                          </Badge>
                        </td>
                        <td className="px-5 py-3 text-right space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDetail(v)}
                            className="h-7 text-xs"
                          >
                            <FileText className="h-3.5 w-3.5" /> Détails
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePrintTicket(v)}
                            className="h-7 text-xs font-semibold"
                          >
                            <Printer className="h-3.5 w-3.5" /> Ticket POS
                          </Button>
                          {!isAnnulee && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setConfirmCancelSaleId(v.id)}
                              className="h-7 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                            >
                              <XCircle className="h-3.5 w-3.5" /> Annuler
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Modal Détails Vente & Lignes */}
        {selectedVente && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs">
            <Card className="w-full max-w-4xl shadow-xl max-h-[90vh] overflow-y-auto">
              <CardHeader className="flex flex-row justify-between items-start border-b border-slate-100 pb-3">
                <div>
                  <CardTitle className="text-base font-bold">
                    Détail Vente #{selectedVente.id.slice(0, 8)}
                  </CardTitle>
                  <p className="text-xs text-slate-500">
                    Effectuée le {new Date(selectedVente.date).toLocaleString()} — Règlement:{' '}
                    {selectedVente.modePaiement}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedVente(null)}
                  className="h-8 w-8 text-slate-400"
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>

              <CardContent className="space-y-3 pt-4">
                <h4 className="font-semibold text-xs text-slate-700 uppercase tracking-wider">
                  Articles facturés
                </h4>
                {selectedVente.lignes && selectedVente.lignes.length > 0 ? (
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 font-semibold text-slate-600 border-b border-slate-100 text-xs">
                        <tr>
                          <th className="p-3">Produit</th>
                          <th className="p-3">Lot (Prix d'origine)</th>
                          <th className="p-3">Cond.</th>
                          <th className="p-3">Qté vendue</th>
                          <th className="p-3">Prix Appliqué</th>
                          <th className="p-3">Statut</th>
                          <th className="p-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedVente.lignes.map((line) => {
                          const lineAnnulee = line.statut === 'ANNULEE';
                          return (
                            <tr key={line.id}>
                              <td className="p-3 font-semibold text-slate-900">
                                {line.produitNom || `#${line.produitId.slice(0, 8)}`}
                              </td>
                              <td className="p-3 text-slate-700 font-medium whitespace-nowrap">
                                <span className="font-mono text-slate-500 text-xs">#{line.lotId.slice(0, 6)}</span>{' '}
                                <span className="text-slate-900 font-semibold">
                                  ({line.lotPrixVenteUnitaire ? Number(line.lotPrixVenteUnitaire).toLocaleString() : '0'} FCFA)
                                </span>
                              </td>
                              <td className="p-3">
                                <Badge variant="secondary">{line.conditionnementLibelle || 'UNITE'}</Badge>
                              </td>
                              <td className="p-3 font-bold">{line.quantite}</td>
                              <td className="p-3 font-semibold">
                                {line.estOffert ? (
                                  <Badge variant="warning">OFFERT (0 FCFA)</Badge>
                                ) : (
                                  `${Number(line.prixReelApplique).toLocaleString()} FCFA`
                                )}
                              </td>
                              <td className="p-3">
                                <Badge variant={lineAnnulee ? 'destructive' : 'success'}>
                                  {line.statut}
                                </Badge>
                              </td>
                              <td className="p-3 text-right">
                                {!lineAnnulee && selectedVente.statut !== 'ANNULEE' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      setConfirmCancelLine({
                                        venteId: selectedVente.id,
                                        lineId: line.id,
                                      })
                                    }
                                    className="h-6 text-xs text-red-600 hover:bg-red-50"
                                  >
                                    Annuler Ligne
                                  </Button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Aucune ligne enregistrée.</p>
                )}
              </CardContent>

              <div className="flex justify-end p-4 border-t border-slate-100 bg-slate-50/50">
                <Button variant="outline" size="sm" onClick={() => setSelectedVente(null)}>
                  Fermer
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Confirmation Modals */}
        <ConfirmModal
          isOpen={Boolean(confirmCancelSaleId)}
          title="Annuler la totalité de la vente ?"
          message="Toutes les lignes de la vente seront annulées et les stocks seront réincrémentés."
          confirmText="Annuler la vente"
          cancelText="Garder"
          variant="danger"
          onConfirm={() => confirmCancelSaleId && handleAnnulerVente(confirmCancelSaleId)}
          onCancel={() => setConfirmCancelSaleId(null)}
        />

        <ConfirmModal
          isOpen={Boolean(confirmCancelLine)}
          title="Annuler cette ligne de vente ?"
          message="La quantité de cette ligne sera restituée au stock du lot d'origine."
          confirmText="Confirmer l'annulation"
          cancelText="Annuler"
          variant="danger"
          onConfirm={() =>
            confirmCancelLine &&
            handleAnnulerLigne(confirmCancelLine.venteId, confirmCancelLine.lineId)
          }
          onCancel={() => setConfirmCancelLine(null)}
        />

        {/* Modal Reçu / Ticket de caisse POS */}
        <ReceiptModal
          isOpen={Boolean(receiptModalVente)}
          onClose={() => setReceiptModalVente(null)}
          vente={receiptModalVente}
        />
      </div>
    </RoleGuard>
  );
}
