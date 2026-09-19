'use client';

import React, { useState, useEffect } from 'react';
import { RoleGuard } from '../../components/RoleGuard';
import { api } from '../../lib/api';
import { SearchInput } from '../../components/ui/SearchInput';
import { QuantityStepper } from '../../components/ui/QuantityStepper';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { ReceiptModal, ReceiptData } from '../../components/ReceiptModal';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import {
  ShoppingCart,
  Package,
  Plus,
  Trash2,
  CreditCard,
  Gift,
  AlertCircle,
  CheckCircle2,
  Banknote,
  Smartphone,
  X,
  Search,
  Check,
} from 'lucide-react';

interface Categorie {
  id: string;
  nom: string;
}

interface Conditionnement {
  id: string;
  produitId: string;
  type: string;
  facteurConversion: number;
  prixReference: string | number;
  venteUnitaireAutorisee: boolean;
}

interface Lot {
  id: string;
  produitId: string;
  prixReference: string | number;
  quantiteStock: number;
  dateReception?: string;
}

interface Produit {
  id: string;
  nom: string;
  categorieId: string;
  lieuStockId: string;
  qteMin: number;
  produitOffertId?: string | null;
}

interface CartItem {
  produit: Produit;
  conditionnement: Conditionnement;
  lot: Lot;
  quantite: number;
  prixReelApplique: number;
  estOffert: boolean;
  /** Identifiant de groupe partagé entre la ligne principale et ses cadeaux automatiques.
   * Permet de supprimer les deux ensemble si le vendeur retire la ligne principale. */
  linkedGroupId?: string;
}

export default function POSPage() {
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [selectedCategorie, setSelectedCategorie] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Selected product modal state
  const [selectedProduit, setSelectedProduit] = useState<Produit | null>(null);
  const [conditions, setConditions] = useState<Conditionnement[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [selectedCond, setSelectedCond] = useState<Conditionnement | null>(null);
  const [selectedLot, setSelectedLot] = useState<Lot | null>(null);
  const [prixSaisi, setPrixSaisi] = useState<number>(0);
  const [quantiteSaisie, setQuantiteSaisie] = useState<number>(1);
  const [modalError, setModalError] = useState<string>('');

  // Cart & Checkout
  const [cart, setCart] = useState<CartItem[]>([]);
  const [modePaiement, setModePaiement] = useState<'CASH' | 'MOBILE_MONEY'>('CASH');
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState<boolean>(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState<ReceiptData | null>(null);
  const [checkoutError, setCheckoutError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [catRes, prodRes] = await Promise.all([
        api.get('/categories'),
        api.get('/produits'),
      ]);
      setCategories(catRes.data || []);
      setProduits(prodRes.data || []);
    } catch (err) {
      console.error('Erreur chargement POS:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProduct = async (produit: Produit) => {
    setSelectedProduit(produit);
    setSelectedCond(null);
    setSelectedLot(null);
    setModalError('');
    setPrixSaisi(0);
    setQuantiteSaisie(1);

    try {
      const [condRes, lotsRes] = await Promise.all([
        api.get(`/produits/${produit.id}/conditionnements`),
        api.get(`/produits/${produit.id}/lots`),
      ]);

      const condList: Conditionnement[] = condRes.data || [];
      const lotsList: Lot[] = (lotsRes.data || []).filter((l: Lot) => l.quantiteStock > 0);

      setConditions(condList);
      setLots(lotsList);

      // Auto-skip conditionnement selection if only 1 conditionnement exists
      if (condList.length === 1) {
        const singleCond = condList[0];
        if (singleCond.type === 'UNITE' && !singleCond.venteUnitaireAutorisee) {
          setModalError('La vente à l’unité est interdite pour ce produit');
        } else {
          setSelectedCond(singleCond);
        }
      }

      // Auto-select first available lot
      if (lotsList.length > 0) {
        setSelectedLot(lotsList[0]);
        setPrixSaisi(Number(lotsList[0].prixReference));
      }
    } catch (err: any) {
      setModalError('Impossible de charger les lots ou conditionnements');
    }
  };

  const handleAddToCart = async () => {
    if (!selectedProduit || !selectedCond || !selectedLot) {
      setModalError('Veuillez sélectionner un conditionnement et un lot');
      return;
    }

    if (selectedCond.type === 'UNITE' && !selectedCond.venteUnitaireAutorisee) {
      setModalError('La vente à l’unité est interdite pour ce conditionnement');
      return;
    }

    const qteReelleNeeded = quantiteSaisie * selectedCond.facteurConversion;
    if (selectedLot.quantiteStock < qteReelleNeeded) {
      setModalError(
        `Stock insuffisant sur le lot. Disponible: ${selectedLot.quantiteStock} unités, requis: ${qteReelleNeeded}`
      );
      return;
    }

    // Identifiant de groupe pour lier la ligne principale et ses cadeaux automatiques
    const groupId = crypto.randomUUID();

    // Ajouter le produit principal au panier (prix saisi librement par le vendeur)
    const newItems: CartItem[] = [
      {
        produit: selectedProduit,
        conditionnement: selectedCond,
        lot: selectedLot,
        quantite: quantiteSaisie,
        prixReelApplique: prixSaisi,
        estOffert: false,
        linkedGroupId: groupId,
      },
    ];

    // Chercher les produits-cadeaux liés : ceux dont produitOffertId → produit principal
    const linkedGifts = produits.filter((p) => p.produitOffertId === selectedProduit.id);
    for (const gift of linkedGifts) {
      try {
        const [giftCondRes, giftLotsRes] = await Promise.all([
          api.get(`/produits/${gift.id}/conditionnements`),
          api.get(`/produits/${gift.id}/lots`),
        ]);
        const giftConds: Conditionnement[] = giftCondRes.data || [];
        const giftLots: Lot[] = (giftLotsRes.data || []).filter((l: Lot) => l.quantiteStock > 0);

        if (giftConds.length > 0 && giftLots.length > 0) {
          newItems.push({
            produit: gift,
            conditionnement: giftConds[0],
            lot: giftLots[0],
            // 1 cadeau par unité du produit principal vendue
            quantite: quantiteSaisie,
            prixReelApplique: 0,
            estOffert: true,
            linkedGroupId: groupId,
          });
        }
      } catch {
        // Cadeau introuvable en stock — on n'interrompt pas la vente
      }
    }

    setCart((prev) => [...prev, ...newItems]);
    setSelectedProduit(null);
  };


  const handleRemoveFromCart = (index: number) => {
    setCart((prev) => {
      const target = prev[index];
      if (target?.linkedGroupId) {
        // Supprimer toutes les lignes du même groupe (principale + cadeaux liés)
        return prev.filter((item) => item.linkedGroupId !== target.linkedGroupId);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const totalCart = cart.reduce(
    (sum, item) => sum + (item.estOffert ? 0 : item.prixReelApplique * item.quantite),
    0
  );

  const handleValidateSale = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);
    setCheckoutError('');

    try {
      const payload = {
        mode_paiement: modePaiement,
        lignes: cart.map((item) => ({
          produit_id: item.produit.id,
          lot_id: item.lot.id,
          conditionnement_id: item.conditionnement.id,
          quantite: item.quantite,
          prix_reel_applique: item.prixReelApplique,
          est_offert: item.estOffert,
        })),
      };

      const res = await api.post('/ventes', payload);
      setCheckoutSuccess({
        id: res.data.id,
        date: new Date(),
        total: totalCart,
        modePaiement: modePaiement,
        lignes: cart.map((item) => ({
          produitNom: item.produit.nom,
          conditionnementType: item.conditionnement.type,
          quantite: item.quantite,
          prixReelApplique: item.prixReelApplique,
          estOffert: item.estOffert,
        })),
      });
      setCart([]);
      setIsCheckoutModalOpen(false);
      fetchInitialData();
    } catch (err: any) {
      setCheckoutError(err.response?.data?.message || 'Erreur lors de la validation de la vente');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProduits = produits.filter((p) => {
    const matchCat = !selectedCategorie || p.categorieId === selectedCategorie;
    const matchQuery = !searchQuery || p.nom.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchQuery;
  });

  return (
    <RoleGuard requireAdmin={false}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Product Search & Grid (2 cols on lg) */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <SearchInput
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Rechercher un produit..."
                  />
                </div>

                <select
                  value={selectedCategorie}
                  onChange={(e) => setSelectedCategorie(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">Toutes les catégories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nom}
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <div className="py-12 text-center text-sm font-medium text-slate-500">
              Chargement des produits...
            </div>
          ) : filteredProduits.length === 0 ? (
            <EmptyState
              title="Aucun produit trouvé"
              message="Essayez de modifier votre recherche ou la catégorie sélectionnée."
              icon={Package}
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filteredProduits.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelectProduct(p)}
                  className="flex flex-col justify-between p-4 rounded-xl bg-white border border-slate-200 hover:border-indigo-500 hover:shadow-xs transition text-left group min-h-[110px]"
                >
                  <div>
                    <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600 line-clamp-2 text-sm">
                      {p.nom}
                    </h3>
                    {produits.some((g) => g.produitOffertId === p.id) && (
                      <Badge variant="warning" className="mt-1 text-[10px]">
                        <Gift className="h-3 w-3 mr-1" /> Cadeau inclus
                      </Badge>
                    )}
                  </div>
                  <span className="mt-2 text-xs font-semibold text-indigo-600 flex items-center gap-1 group-hover:underline">
                    <Plus className="h-3 w-3" /> Ajouter
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Active Cart (1 col on lg) */}
        <Card className="h-fit sticky top-20 flex flex-col justify-between">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-indigo-600" /> Panier en cours
              </CardTitle>
              <Badge variant="secondary">{cart.length} article(s)</Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            {cart.length === 0 ? (
              <EmptyState
                title="Panier vide"
                message="Cliquez sur un produit pour l'ajouter"
                icon={ShoppingCart}
              />
            ) : (
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {cart.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-xs text-slate-900 truncate">
                        {item.produit.nom}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {item.conditionnement.type} (x{item.quantite}) —{' '}
                        {item.estOffert ? (
                          <span className="font-bold text-amber-600">OFFERT</span>
                        ) : (
                          `${item.prixReelApplique.toLocaleString()} FCFA`
                        )}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-bold text-xs text-slate-900">
                        {item.estOffert
                          ? '0 FCFA'
                          : `${(item.prixReelApplique * item.quantite).toLocaleString()} FCFA`}
                      </p>
                      <button
                        onClick={() => handleRemoveFromCart(idx)}
                        className="text-[11px] font-medium text-red-600 hover:underline flex items-center gap-0.5 ml-auto mt-0.5"
                      >
                        <Trash2 className="h-3 w-3" /> Retirer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>

          <div className="p-6 pt-4 border-t border-slate-100 space-y-4">
            <div className="flex justify-between items-center text-sm font-semibold text-slate-900">
              <span>Total à payer :</span>
              <span className="text-xl font-bold text-indigo-600">
                {totalCart.toLocaleString()} FCFA
              </span>
            </div>

            <Button
              disabled={cart.length === 0}
              onClick={() => setIsCheckoutModalOpen(true)}
              variant="success"
              className="w-full py-3 text-base font-bold"
            >
              <CreditCard className="h-4 w-4" /> Encaisser la vente
            </Button>
          </div>
        </Card>
      </div>

      {/* Modal Selection Produit / Lot / Conditionnement */}
      {selectedProduit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs">
          <Card className="w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <CardTitle className="text-base">{selectedProduit.nom}</CardTitle>
                <p className="text-xs text-slate-500">Configuration de l'article pour la vente</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedProduit(null)}
                className="h-8 w-8 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>

            <CardContent className="space-y-4 pt-4">
              {modalError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-lg border border-red-200">
                  <AlertCircle className="h-4 w-4 shrink-0" /> {modalError}
                </div>
              )}

              {/* Step 1: Selection Conditionnement (Skip if only 1) */}
              {conditions.length > 1 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    1. Choisir le conditionnement
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {conditions.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          if (c.type === 'UNITE' && !c.venteUnitaireAutorisee) {
                            setModalError('La vente à l’unité est interdite pour ce conditionnement');
                          } else {
                            setModalError('');
                            setSelectedCond(c);
                          }
                        }}
                        className={`p-3 rounded-lg border text-left text-xs font-semibold transition ${
                          selectedCond?.id === c.id
                            ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 ring-2 ring-indigo-500/20'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="font-bold">{c.type}</div>
                        <div className="text-[11px] text-slate-500">1 {c.type} contient {c.facteurConversion} unité(s)</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2: Selection du Lot */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  2. Sélectionner le Lot disponible
                </label>
                {lots.length === 0 ? (
                  <p className="text-xs font-medium text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
                    Rupture de stock : Aucun lot actif disponible.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {lots.map((l, index) => (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => {
                          setSelectedLot(l);
                          setPrixSaisi(Number(l.prixReference));
                        }}
                        className={`w-full p-3 rounded-lg border text-left text-xs flex justify-between items-center transition ${
                          selectedLot?.id === l.id
                            ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 ring-2 ring-indigo-500/20'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div>
                          <span className="font-bold text-slate-900 text-xs">
                            Lot {index + 1} vendu à {Number(l.prixReference).toLocaleString()} FCFA
                          </span>
                        </div>
                        <Badge variant="success" className="rounded-full px-2.5 py-0.5">{l.quantiteStock} en stock</Badge>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Step 3: Quantité & Prix appliqué */}
              {selectedCond && selectedLot && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-800">Quantité :</label>
                    <QuantityStepper
                      value={quantiteSaisie}
                      onChange={setQuantiteSaisie}
                      min={1}
                      max={Math.floor(selectedLot.quantiteStock / selectedCond.facteurConversion)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Prix appliqué par unité ({selectedCond.type}) :
                    </label>
                    <Input
                      type="number"
                      value={prixSaisi}
                      onChange={(e) => setPrixSaisi(Number(e.target.value))}
                    />
                  </div>
                </div>
              )}
            </CardContent>

            <div className="flex justify-end gap-3 p-4 border-t border-slate-100 bg-slate-50/50">
              <Button variant="outline" size="sm" onClick={() => setSelectedProduit(null)}>
                Annuler
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={!selectedCond || !selectedLot || lots.length === 0}
                onClick={handleAddToCart}
              >
                <Plus className="h-4 w-4" /> Ajouter au panier
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Modal Paiement & Validation */}
      {isCheckoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs">
          <Card className="w-full max-w-md shadow-xl">
            <CardHeader className="border-b border-slate-100 pb-3">
              <CardTitle className="text-base">Validation du Règlement</CardTitle>
              <CardDescription>
                Montant total :{' '}
                <strong className="text-indigo-600 font-bold">{totalCart.toLocaleString()} FCFA</strong>
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 pt-4">
              {checkoutError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-lg border border-red-200">
                  <AlertCircle className="h-4 w-4 shrink-0" /> {checkoutError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">
                  Mode de règlement :
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setModePaiement('CASH')}
                    className={`p-3.5 rounded-lg border text-center text-xs font-bold flex flex-col items-center gap-1 transition ${
                      modePaiement === 'CASH'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <Banknote className="h-5 w-5 text-emerald-600" />
                    ESPÈCES (CASH)
                  </button>
                  <button
                    type="button"
                    onClick={() => setModePaiement('MOBILE_MONEY')}
                    className={`p-3.5 rounded-lg border text-center text-xs font-bold flex flex-col items-center gap-1 transition ${
                      modePaiement === 'MOBILE_MONEY'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <Smartphone className="h-5 w-5 text-indigo-600" />
                    MOBILE MONEY
                  </button>
                </div>
              </div>
            </CardContent>

            <div className="flex justify-end gap-3 p-4 border-t border-slate-100 bg-slate-50/50">
              <Button variant="outline" size="sm" onClick={() => setIsCheckoutModalOpen(false)}>
                Retour
              </Button>
              <Button
                variant="success"
                size="sm"
                disabled={isSubmitting}
                onClick={handleValidateSale}
              >
                <Check className="h-4 w-4" /> {isSubmitting ? 'Validation...' : 'Confirmer Vente'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Modal Reçu de caisse thermique après succès */}
      <ReceiptModal
        isOpen={Boolean(checkoutSuccess)}
        onClose={() => setCheckoutSuccess(null)}
        vente={checkoutSuccess}
      />
    </RoleGuard>
  );
}
