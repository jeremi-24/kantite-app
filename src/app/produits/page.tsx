'use client';

import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { RoleGuard } from '../../components/RoleGuard';
import { api } from '../../lib/api';
import { SearchInput } from '../../components/ui/SearchInput';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import {
  Package,
  Plus,
  Edit,
  Trash2,
  Layers,
  History,
  Tag,
  MapPin,
  Gift,
  X,
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Upload,
  FileText,
  Copy,
  Check,
} from 'lucide-react';


interface Categorie {
  id: string;
  nom: string;
}

interface LieuStock {
  id: string;
  nom: string;
}

interface Produit {
  id: string;
  nom: string;
  categorieId: string;
  lieuStockId: string;
  qteMin: number;
  quantiteTotale?: number;
  caracteristiques?: any;
  produitOffertId?: string | null;
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

interface HistoriquePrixItem {
  id: string;
  lotId?: string;
  produitId?: string;
  ancienPrix: string | number;
  nouveauPrix: string | number;
  date: string;
}

export default function ProduitsPage() {
  const [produits, setProduits] = useState<Produit[]>([]);
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [lieux, setLieux] = useState<LieuStock[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [selectedLieu, setSelectedLieu] = useState('');

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Produit | null>(null);
  // Étape du formulaire : 1 = infos produit, 2 = lot initial (création uniquement)
  const [formStep, setFormStep] = useState<1 | 2>(1);
  const [showOffertField, setShowOffertField] = useState(false);

  // Product Form state
  const [formNom, setFormNom] = useState('');
  const [formCatId, setFormCatId] = useState('');
  const [formLieuId, setFormLieuId] = useState('');
  const [formQteMin, setFormQteMin] = useState(0);
  const [formOffertId, setFormOffertId] = useState('');
  // Lot initial (obligatoire à la création, absent en édition)
  const [formLotPrix, setFormLotPrix] = useState(0);
  const [formLotQte, setFormLotQte] = useState(1);

  // Sub-resource Modal (Conditionnements / Lots / Historique)
  const [manageProduit, setManageProduit] = useState<Produit | null>(null);
  const [activeTab, setActiveTab] = useState<'cond' | 'lots' | 'historique'>('cond');
  const [productConds, setProductConds] = useState<Conditionnement[]>([]);
  const [productLots, setProductLots] = useState<Lot[]>([]);
  const [historiquePrix, setHistoriquePrix] = useState<HistoriquePrixItem[]>([]);
  // Formulaires d'ajout : masqués par défaut, révélés par clic
  const [showCondForm, setShowCondForm] = useState(false);
  const [showLotForm, setShowLotForm] = useState(false);

  // Conditionnement Form
  const [condType, setCondType] = useState('UNITE');
  const [condFacteur, setCondFacteur] = useState(1);
  const [condPrix, setCondPrix] = useState(0);
  const [condVenteUnitaire, setCondVenteUnitaire] = useState(true);

  // Lot Form
  const [lotPrix, setLotPrix] = useState(0);
  const [lotQte, setLotQte] = useState(0);

  // Editing Lot Price (triggers HistoriquePrix)
  const [editingLot, setEditingLot] = useState<Lot | null>(null);
  const [editLotPrix, setEditLotPrix] = useState<number>(0);
  const [editLotQte, setEditLotQte] = useState<number>(0);

  // Confirm delete
  const [deleteProductTarget, setDeleteProductTarget] = useState<Produit | null>(null);

  // Bulk Import State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importMode, setImportMode] = useState<'file' | 'paste'>('file');
  const [importInputText, setImportInputText] = useState('');
  const [importParsedItems, setImportParsedItems] = useState<any[]>([]);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [copiedModel, setCopiedModel] = useState(false);

  // Sens de produit_offert_nom dans l'Excel :
  // La colonne est renseignée sur la ligne du CADEAU et contient le nom du produit PRINCIPAL.
  // Ex : LENS CLEANER (cadeau) pointe vers LUNETTE RAY BAN (principal).
  const sampleCsvModel = `nom,categorie,lieu_stock,quantite_initiale,prix,qte_min,conditionnement_type,facteur_conversion,vente_unitaire_autorisee,produit_offert_nom
LUNETTE SUPER,LUNETTES,Réserve,10,25000,5,BOITE,1,true,
LUNETTE GUCCI,LUNETTES,Réserve,4,70000,5,BOITE,1,true,
GEL DE DOUCHE JAUNE,COSMETIQUE,Réserve,6,15000,5,UNITE,1,true,
PAIRE DE CHAUSSETTES,ACCESSOIRES,Pièce 1,20,5000,5,PAIRE,2,false,
CARTON HUILE TOURNESOL,HUILE,Réserve,5,40000,2,CARTON,12,true,
LUNETTE RAY BAN,LUNETTES,Réserve,12,35000,5,BOITE,1,true,
LINGETTE MOUILLE,ACCESSOIRES,Réserve,50,1000,5,UNITE,1,true,LUNETTE RAY BAN`;

  const parseJsonRows = (rows: any[]) => {
    const items: any[] = [];
    for (const row of rows) {
      const nom = row['nom'] || row['Nom'] || row['PRODUIT'] || row['Produit'] || row['designation'] || row['Designation'] || '';
      const categorie = row['categorie'] || row['Categorie'] || row['CAT'] || row['Catégorie'] || '';
      if (!nom || !categorie) continue;

      items.push({
        nom: String(nom).trim(),
        categorie: String(categorie).trim(),
        lieu_stock: String(row['lieu_stock'] || row['Lieu'] || row['lieu'] || 'Réserve').trim(),
        quantite_initiale: Number(row['quantite_initiale'] || row['Quantité'] || row['qte'] || row['stock'] || 0),
        prix: Number(row['prix'] || row['Prix'] || row['prix_reference'] || 0),
        qte_min: row['qte_min'] ? Number(row['qte_min']) : 5,
        conditionnement_type: String(row['conditionnement_type'] || row['Conditionnement'] || row['conditionnement'] || 'UNITE').trim(),
        facteur_conversion: Number(row['facteur_conversion'] || row['Facteur'] || row['qte_par_carton'] || 1),
        vente_unitaire_autorisee:
          row['vente_unitaire_autorisee'] !== undefined
            ? !['false', '0', 'non', 'no'].includes(String(row['vente_unitaire_autorisee']).toLowerCase())
            : true,
        produit_offert_nom: String(row['produit_offert_nom'] || row['produit_offert'] || row['Cadeau'] || '').trim(),
      });
    }
    setImportParsedItems(items);
  };

  const parseCsvText = (text: string) => {
    setImportInputText(text);
    if (!text.trim()) {
      setImportParsedItems([]);
      return;
    }

    try {
      if (text.trim().startsWith('[') || text.trim().startsWith('{')) {
        const json = JSON.parse(text);
        const arr = Array.isArray(json) ? json : [json];
        parseJsonRows(arr);
        return;
      }
    } catch (e) {}

    const lines = text.trim().split('\n');
    if (lines.length < 2) {
      setImportParsedItems([]);
      return;
    }

    const headers = lines[0].split(/[,;\t]/).map((h) => h.trim().toLowerCase().replace(/^"|"$/g, ''));
    const rows: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const values = line.split(/[,;\t]/).map((v) => v.trim().replace(/^"|"$/g, ''));
      const row: any = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] || '';
      });
      rows.push(row);
    }

    parseJsonRows(rows);
  };

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);

    const fileName = file.name.toLowerCase();
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonRows = XLSX.utils.sheet_to_json(worksheet);
          
          setImportInputText(`[Fichier Excel : ${file.name} - ${jsonRows.length} ligne(s)]`);
          parseJsonRows(jsonRows);
        } catch (err) {
          setImportStatus({ type: 'error', message: 'Erreur lors de la lecture du fichier Excel (.xlsx)' });
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        parseCsvText(content || '');
      };
      reader.readAsText(file);
    }
  };

  const handleExecuteImport = async () => {
    if (importParsedItems.length === 0 && !selectedFile) return;
    setIsImporting(true);
    setImportStatus(null);

    try {
      let res;
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        res = await api.post('/produits/import-file', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        res = await api.post('/produits/import', importParsedItems);
      }

      setImportStatus({
        type: 'success',
        message: res.data.message || 'Importation terminée avec succès',
      });
      setSelectedFile(null);
      fetchData();
      setTimeout(() => {
        setIsImportModalOpen(false);
        setImportInputText('');
        setImportParsedItems([]);
        setImportStatus(null);
      }, 2500);
    } catch (err: any) {
      setImportStatus({
        type: 'error',
        message: err.response?.data?.message || 'Erreur lors de l’importation',
      });
    } finally {
      setIsImporting(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);


  const fetchData = async () => {
    setLoading(true);
    try {
      const [pRes, cRes, lRes] = await Promise.all([
        api.get('/produits'),
        api.get('/categories'),
        api.get('/lieux-stock'),
      ]);
      setProduits(pRes.data || []);
      setCategories(cRes.data || []);
      setLieux(lRes.data || []);
    } catch (err) {
      console.error('Erreur chargement produits:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateProduct = () => {
    setEditingProduct(null);
    setFormStep(1);
    setShowOffertField(false);
    setFormNom('');
    setFormCatId(categories[0]?.id || '');
    setFormLieuId(lieux[0]?.id || '');
    setFormQteMin(0);
    setFormOffertId('');
    setFormLotPrix(0);
    setFormLotQte(1);
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (p: Produit) => {
    setEditingProduct(p);
    setFormStep(1);
    setShowOffertField(Boolean(p.produitOffertId));
    setFormNom(p.nom);
    setFormCatId(p.categorieId);
    setFormLieuId(p.lieuStockId);
    setFormQteMin(p.qteMin);
    setFormOffertId(p.produitOffertId || '');
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingProduct && formLotQte < 1) {
      alert('La quantité du lot initial doit être au moins 1');
      return;
    }

    const payload = {
      nom: formNom,
      categorieId: formCatId,
      lieuStockId: formLieuId,
      qteMin: Number(formQteMin),
      produitOffertId: formOffertId || null,
    };

    try {
      if (editingProduct) {
        await api.patch(`/produits/${editingProduct.id}`, payload);
      } else {
        const res = await api.post('/produits', payload);
        const newId = res.data.id;
        // Créer le lot initial obligatoire
        await api.post(`/produits/${newId}/lots`, {
          prixReference: Number(formLotPrix),
          quantiteStock: Number(formLotQte),
        });
      }
      setIsProductModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erreur lors de la sauvegarde du produit');
    }
  };

  const handleDeleteProduct = async () => {
    if (!deleteProductTarget) return;
    try {
      await api.delete(`/produits/${deleteProductTarget.id}`);
      setDeleteProductTarget(null);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Impossible de supprimer le produit');
    }
  };

  const handleOpenManageSub = async (p: Produit) => {
    setManageProduit(p);
    setActiveTab('cond');
    setShowCondForm(false);
    setShowLotForm(false);
    fetchSubResources(p.id);
  };

  const fetchSubResources = async (produitId: string) => {
    try {
      const [cRes, lRes, hRes] = await Promise.all([
        api.get(`/produits/${produitId}/conditionnements`),
        api.get(`/produits/${produitId}/lots`),
        api.get('/dashboard/historique-prix'),
      ]);
      setProductConds(cRes.data || []);
      setProductLots(lRes.data || []);
      const allHist: HistoriquePrixItem[] = hRes.data || [];
      const lotIds = (lRes.data || []).map((x: Lot) => x.id);
      const filteredHist = allHist.filter(
        (item) => item.produitId === produitId || (item.lotId && lotIds.includes(item.lotId))
      );
      setHistoriquePrix(filteredHist);
    } catch (err) {
      console.error('Erreur chargement sous-ressources:', err);
    }
  };

  const handleAddCondition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manageProduit) return;
    try {
      await api.post(`/produits/${manageProduit.id}/conditionnements`, {
        type: condType,
        facteurConversion: Number(condFacteur),
        prixReference: Number(condPrix),
        venteUnitaireAutorisee: condVenteUnitaire,
      });
      fetchSubResources(manageProduit.id);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erreur lors de l’ajout du conditionnement');
    }
  };

  const handleAddLot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manageProduit) return;
    try {
      await api.post(`/produits/${manageProduit.id}/lots`, {
        prixReference: Number(lotPrix),
        quantiteStock: Number(lotQte),
      });
      setLotPrix(0);
      setLotQte(0);
      fetchSubResources(manageProduit.id);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erreur lors de la création du lot');
    }
  };

  const handleUpdateLot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLot || !manageProduit) return;
    try {
      await api.patch(`/produits/${manageProduit.id}/lots/${editingLot.id}`, {
        prixReference: Number(editLotPrix),
        quantiteStock: Number(editLotQte),
      });
      setEditingLot(null);
      fetchSubResources(manageProduit.id);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erreur mise à jour lot');
    }
  };

  const filteredProduits = produits.filter((p) => {
    const matchNom = !searchQuery || p.nom.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = !selectedCat || p.categorieId === selectedCat;
    const matchLieu = !selectedLieu || p.lieuStockId === selectedLieu;
    return matchNom && matchCat && matchLieu;
  });

  return (
    <RoleGuard requireAdmin={true}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Package className="h-5 w-5 text-indigo-600" />
              Catalogue Produits & Stock
            </h1>
            <p className="text-xs text-slate-500">
              Gestion des articles, conditionnements autorisés, réceptions de lots et prix
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setIsImportModalOpen(true)}>
              <FileSpreadsheet className="h-4 w-4" /> Import en Masse (CSV/Excel)
            </Button>
            <Button variant="primary" onClick={handleOpenCreateProduct}>
              <Plus className="h-4 w-4" /> Nouveau Produit
            </Button>
          </div>
        </div>


        {/* Filter Bar Sticky */}
        <Card className="p-4 sticky top-[116px] z-20 bg-white backdrop-blur-md shadow-md border-slate-200">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Nom du produit..." />
            </div>
            <select
              value={selectedCat}
              onChange={(e) => setSelectedCat(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-800 focus:outline-none"
            >
              <option value="">Toutes les catégories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                </option>
              ))}
            </select>

            <select
              value={selectedLieu}
              onChange={(e) => setSelectedLieu(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-800 focus:outline-none"
            >
              <option value="">Tous les lieux de stock</option>
              {lieux.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nom}
                </option>
              ))}
            </select>
          </div>
        </Card>

        {/* Products Table */}
        {loading ? (
          <div className="py-12 text-center text-sm text-slate-500 font-medium">
            Chargement des produits...
          </div>
        ) : filteredProduits.length === 0 ? (
          <EmptyState
            title="Aucun produit"
            message="Aucun produit ne correspond à vos filtres."
            icon={Package}
          />
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/80 font-semibold text-slate-600 border-b border-slate-200 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3">Nom Produit</th>
                    <th className="px-5 py-3">Catégorie</th>
                    <th className="px-5 py-3">Lieu de Stock</th>
                    <th className="px-5 py-3">Stock Total</th>
                    <th className="px-5 py-3">Produit Offert</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProduits.map((p) => {
                    const catName = categories.find((c) => c.id === p.categorieId)?.nom || 'N/A';
                    const lieuName = lieux.find((l) => l.id === p.lieuStockId)?.nom || 'N/A';
                    const offertName = p.produitOffertId
                      ? produits.find((x) => x.id === p.produitOffertId)?.nom || 'Oui'
                      : null;
                    const stockTotal = p.quantiteTotale || 0;
                    const isLowStock = stockTotal > 0 && stockTotal <= p.qteMin;
                    const isOutStock = stockTotal === 0;

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition">
                        <td className="px-5 py-3 font-semibold text-slate-900">{p.nom}</td>
                        <td className="px-5 py-3 font-medium text-slate-700">{catName}</td>
                        <td className="px-5 py-3 text-slate-600 flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" /> {lieuName}
                        </td>
                        <td className="px-5 py-3">
                          {isOutStock ? (
                            <Badge variant="destructive" className="rounded-full px-2.5 py-0.5 font-medium">0 unité (Rupture)</Badge>
                          ) : isLowStock ? (
                            <Badge variant="warning" className="rounded-full px-2.5 py-0.5 font-medium">{stockTotal} unité(s) (Alerte)</Badge>
                          ) : (
                            <Badge variant="success" className="rounded-full px-2.5 py-0.5 font-medium">{stockTotal} unité(s)</Badge>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          {offertName ? (
                            <Badge variant="warning">
                              <Gift className="h-3 w-3 mr-1" /> Offre: {offertName}
                            </Badge>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right space-x-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenManageSub(p)}
                            className="h-7 text-xs text-indigo-700 border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100"
                          >
                            <Layers className="h-3.5 w-3.5" /> Conditionnements / Lots / Prix
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEditProduct(p)}
                            className="h-7 text-xs"
                          >
                            <Edit className="h-3.5 w-3.5" /> Modifier
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteProductTarget(p)}
                            className="h-7 text-xs text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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

        {/* Modal Creation / Modification Produit — 2 étapes (création) ou 1 étape (édition) */}
        {isProductModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs">
            <Card className="w-full max-w-md shadow-xl">
              <CardHeader className="border-b border-slate-100 pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">
                      {editingProduct ? 'Modifier le Produit' : (
                        formStep === 1 ? 'Nouveau Produit — Étape 1 / 2' : 'Nouveau Produit — Étape 2 / 2'
                      )}
                    </CardTitle>
                    {!editingProduct && (
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {formStep === 1 ? 'Informations de base' : 'Stock et prix de départ'}
                      </p>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" type="button" onClick={() => setIsProductModalOpen(false)} className="h-8 w-8 text-slate-400">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>

              {/* ÉTAPE 1 — Infos produit (toujours visible en édition) */}
              {(formStep === 1 || editingProduct) && (
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (!editingProduct) { setFormStep(2); return; }
                  handleSaveProduct(e);
                }}>
                  <CardContent className="space-y-3 pt-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Nom du Produit</label>
                      <Input
                        type="text" required autoFocus
                        value={formNom}
                        onChange={(e) => setFormNom(e.target.value)}
                        placeholder="ex: Lunettes Soleil Rayban"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Catégorie</label>
                      <select
                        value={formCatId} onChange={(e) => setFormCatId(e.target.value)} required
                        className="w-full rounded-lg border border-slate-200 p-2.5 text-xs font-semibold focus:outline-none"
                      >
                        {categories.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Lieu de Stock</label>
                      <select
                        value={formLieuId} onChange={(e) => setFormLieuId(e.target.value)} required
                        className="w-full rounded-lg border border-slate-200 p-2.5 text-xs font-semibold focus:outline-none"
                      >
                        {lieux.map((l) => <option key={l.id} value={l.id}>{l.nom}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Seuil alerte stock bas</label>
                      <Input
                        type="number" required min={0}
                        value={formQteMin} onChange={(e) => setFormQteMin(Number(e.target.value))}
                      />
                    </div>

                    {/* Cadeau lié — caché par défaut */}
                    {!showOffertField ? (
                      <button
                        type="button"
                        onClick={() => setShowOffertField(true)}
                        className="text-[11px] text-indigo-500 hover:text-indigo-700 hover:underline flex items-center gap-1"
                      >
                        <Gift className="h-3 w-3" />
                        Ce produit est-il un cadeau offert avec un autre produit ?
                      </button>
                    ) : (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Produit principal associé
                          <span className="ml-1 font-normal text-slate-400">(ce produit = le cadeau)</span>
                        </label>
                        <select
                          value={formOffertId} onChange={(e) => setFormOffertId(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 p-2.5 text-xs font-semibold focus:outline-none"
                        >
                          <option value="">— Aucun —</option>
                          {produits
                            .filter((p) => p.id !== editingProduct?.id)
                            .map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
                        </select>
                        <button
                          type="button" onClick={() => { setShowOffertField(false); setFormOffertId(''); }}
                          className="mt-1 text-[11px] text-slate-400 hover:text-slate-600"
                        >Annuler</button>
                      </div>
                    )}
                  </CardContent>

                  <div className="flex justify-end gap-3 p-4 border-t border-slate-100 bg-slate-50/50">
                    <Button variant="outline" size="sm" type="button" onClick={() => setIsProductModalOpen(false)}>Annuler</Button>
                    <Button variant="primary" size="sm" type="submit">
                      {editingProduct ? 'Enregistrer' : 'Suivant →'}
                    </Button>
                  </div>
                </form>
              )}

              {/* ÉTAPE 2 — Lot initial (création uniquement) */}
              {formStep === 2 && !editingProduct && (
                <form onSubmit={handleSaveProduct}>
                  <CardContent className="space-y-4 pt-4">
                    <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100 text-[11px] text-indigo-700">
                      <strong>{formNom}</strong> — un produit doit toujours avoir au moins un lot.
                      Renseignez le stock de départ.
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Prix de vente (FCFA)</label>
                      <Input
                        type="number" required min={0} autoFocus
                        value={formLotPrix}
                        onChange={(e) => setFormLotPrix(Number(e.target.value))}
                        placeholder="ex: 15 000"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Quantité en stock</label>
                      <Input
                        type="number" required min={1}
                        value={formLotQte}
                        onChange={(e) => setFormLotQte(Number(e.target.value))}
                        placeholder="ex: 10"
                      />
                    </div>
                  </CardContent>

                  <div className="flex justify-between gap-3 p-4 border-t border-slate-100 bg-slate-50/50">
                    <Button variant="outline" size="sm" type="button" onClick={() => setFormStep(1)}>← Retour</Button>
                    <Button variant="primary" size="sm" type="submit">Créer le Produit</Button>
                  </div>
                </form>
              )}
            </Card>
          </div>
        )}

        {/* Modal Sous-Ressources (Conditionnements / Lots / Historique Prix) */}
        {manageProduit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs">
            <Card className="w-full max-w-3xl shadow-xl max-h-[90vh] overflow-y-auto">
              <CardHeader className="flex flex-row justify-between items-start border-b border-slate-100 pb-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package className="h-4 w-4 text-indigo-600" /> Gestion : {manageProduit.nom}
                  </CardTitle>
                  <p className="text-xs text-slate-500">
                    Conditionnements autorisés, réceptions de lots et historique des prix
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setManageProduit(null)}
                  className="h-8 w-8 text-slate-400"
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>

              <CardContent className="space-y-4 pt-4">
                {/* Tabs Header */}
                <div className="flex border-b border-slate-200 gap-4">
                  <button
                    type="button"
                    onClick={() => setActiveTab('cond')}
                    className={`pb-2 font-semibold text-xs border-b-2 flex items-center gap-1.5 transition ${
                      activeTab === 'cond'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Layers className="h-3.5 w-3.5" /> Conditionnements ({productConds.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('lots')}
                    className={`pb-2 font-semibold text-xs border-b-2 flex items-center gap-1.5 transition ${
                      activeTab === 'lots'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Tag className="h-3.5 w-3.5" /> Lots & Stocks ({productLots.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('historique')}
                    className={`pb-2 font-semibold text-xs border-b-2 flex items-center gap-1.5 transition ${
                      activeTab === 'historique'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <History className="h-3.5 w-3.5" /> Historique Prix ({historiquePrix.length})
                  </button>
                </div>

                {/* Tab 1: Conditionnements */}
                {activeTab === 'cond' && (
                  <div className="space-y-3">
                    {/* Tableau existant */}
                    {productConds.length === 0 && !showCondForm ? (
                      <p className="text-xs text-slate-400 text-center py-4">Aucun conditionnement configuré.</p>
                    ) : productConds.length > 0 && (
                      <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 font-semibold text-slate-500 border-b">
                            <tr>
                              <th className="p-3">Type</th>
                              <th className="p-3">Contenance</th>
                              <th className="p-3">Prix Réf</th>
                              <th className="p-3">Vente unitaire</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {productConds.map((c) => (
                              <tr key={c.id}>
                                <td className="p-3 font-bold">{c.type}</td>
                                <td className="p-3">1 {c.type} contient {c.facteurConversion} unité(s)</td>
                                <td className="p-3 font-semibold">{Number(c.prixReference).toLocaleString()} FCFA</td>
                                <td className="p-3">
                                  {c.venteUnitaireAutorisee
                                    ? <Badge variant="success">Autorisée</Badge>
                                    : <Badge variant="destructive">Interdite</Badge>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Formulaire d'ajout — masqué par défaut */}
                    {showCondForm ? (
                      <form
                        onSubmit={async (e) => { await handleAddCondition(e); setShowCondForm(false); }}
                        className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3"
                      >
                        <p className="text-xs font-semibold text-slate-800">Ajouter un conditionnement</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">Type</label>
                            <select
                              value={condType} onChange={(e) => setCondType(e.target.value)}
                              className="w-full rounded-md border border-slate-200 p-2 text-xs font-semibold bg-white"
                            >
                              {['UNITE', 'BOITE', 'CARTON', 'PAIRE', 'SACHET', 'AUTRE'].map((t) => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                              1 {condType} contient (unités)
                            </label>
                            <Input type="number" min={1} value={condFacteur} onChange={(e) => setCondFacteur(Number(e.target.value))} className="h-8 text-xs" />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">Prix Réf (FCFA)</label>
                            <Input type="number" value={condPrix} onChange={(e) => setCondPrix(Number(e.target.value))} className="h-8 text-xs" />
                          </div>
                          <div className="flex items-end pb-1">
                            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                              <input type="checkbox" checked={condVenteUnitaire} onChange={(e) => setCondVenteUnitaire(e.target.checked)} className="rounded border-slate-300" />
                              Vente unitaire autorisée
                            </label>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => setShowCondForm(false)}>Annuler</Button>
                          <Button type="submit" variant="primary" size="sm"><Plus className="h-3.5 w-3.5" /> Ajouter</Button>
                        </div>
                      </form>
                    ) : (
                      <Button
                        type="button" variant="outline" size="sm"
                        onClick={() => setShowCondForm(true)}
                        className="w-full border-dashed text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                      >
                        <Plus className="h-3.5 w-3.5" /> Ajouter un conditionnement
                      </Button>
                    )}
                  </div>
                )}

                {/* Tab 2: Lots & Stocks */}
                {activeTab === 'lots' && (
                  <div className="space-y-3">
                    {/* Tableau des lots existants */}
                    {productLots.length === 0 && !showLotForm ? (
                      <p className="text-xs text-slate-400 text-center py-4">Aucun lot enregistré.</p>
                    ) : productLots.length > 0 && (
                      <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 font-semibold text-slate-500 border-b">
                            <tr>
                              <th className="p-3">Date réception</th>
                              <th className="p-3">Stock</th>
                              <th className="p-3">Prix Réf</th>
                              <th className="p-3 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {productLots.map((l) => (
                              <tr key={l.id}>
                                <td className="p-3 text-slate-600">
                                  {l.dateReception ? new Date(l.dateReception).toLocaleDateString() : 'N/A'}
                                </td>
                                <td className="p-3 font-bold text-slate-900">{l.quantiteStock} u</td>
                                <td className="p-3 font-semibold">{Number(l.prixReference).toLocaleString()} FCFA</td>
                                <td className="p-3 text-right">
                                  {editingLot?.id === l.id ? (
                                    <form onSubmit={handleUpdateLot} className="flex items-center gap-2 justify-end">
                                      <Input type="number" value={editLotQte} onChange={(e) => setEditLotQte(Number(e.target.value))} className="h-7 w-20 text-xs" placeholder="Stock" />
                                      <Input type="number" value={editLotPrix} onChange={(e) => setEditLotPrix(Number(e.target.value))} className="h-7 w-24 text-xs" placeholder="Prix" />
                                      <Button type="submit" variant="warning" size="sm" className="h-7 text-xs">OK</Button>
                                      <Button type="button" variant="outline" size="sm" onClick={() => setEditingLot(null)} className="h-7 text-xs">✕</Button>
                                    </form>
                                  ) : (
                                    <Button
                                      variant="ghost" size="sm" type="button"
                                      onClick={() => { setEditingLot(l); setEditLotPrix(Number(l.prixReference)); setEditLotQte(l.quantiteStock); }}
                                      className="h-6 text-xs"
                                    >
                                      <Edit className="h-3 w-3" /> Modifier
                                    </Button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Formulaire ajout lot — masqué par défaut */}
                    {showLotForm ? (
                      <form
                        onSubmit={async (e) => { await handleAddLot(e); setShowLotForm(false); }}
                        className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3"
                      >
                        <p className="text-xs font-semibold text-slate-800">Nouveau lot (réception de stock)</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">Quantité reçue</label>
                            <Input type="number" min={0} required value={lotQte} onChange={(e) => setLotQte(Number(e.target.value))} className="h-8 text-xs" />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">Prix Réf (FCFA)</label>
                            <Input type="number" required value={lotPrix} onChange={(e) => setLotPrix(Number(e.target.value))} className="h-8 text-xs" />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => setShowLotForm(false)}>Annuler</Button>
                          <Button type="submit" variant="success" size="sm"><Plus className="h-3.5 w-3.5" /> Ajouter</Button>
                        </div>
                      </form>
                    ) : (
                      <Button
                        type="button" variant="outline" size="sm"
                        onClick={() => setShowLotForm(true)}
                        className="w-full border-dashed text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                      >
                        <Plus className="h-3.5 w-3.5" /> Réceptionner un nouveau lot
                      </Button>
                    )}
                  </div>
                )}

                {/* Tab 3: Historique des Prix */}
                {activeTab === 'historique' && (
                  <div className="space-y-3">
                    {historiquePrix.length === 0 ? (
                      <EmptyState
                        title="Aucune variation de prix"
                        message="Aucun changement de prix n'a encore été archivé pour ce produit."
                        icon={History}
                      />
                    ) : (
                      <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 font-semibold text-slate-500 border-b">
                            <tr>
                              <th className="p-3">Date Modification</th>
                              <th className="p-3">Ancien Prix</th>
                              <th className="p-3">Nouveau Prix</th>
                              <th className="p-3">Écart</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {historiquePrix.map((h) => {
                              const diff = Number(h.nouveauPrix) - Number(h.ancienPrix);
                              return (
                                <tr key={h.id}>
                                  <td className="p-3 text-slate-600">
                                    {new Date(h.date).toLocaleString()}
                                  </td>
                                  <td className="p-3 font-semibold text-red-600 line-through">
                                    {Number(h.ancienPrix).toLocaleString()} FCFA
                                  </td>
                                  <td className="p-3 font-bold text-emerald-700">
                                    {Number(h.nouveauPrix).toLocaleString()} FCFA
                                  </td>
                                  <td className="p-3 font-bold">
                                    {diff > 0 ? `+${diff.toLocaleString()}` : diff.toLocaleString()}{' '}
                                    FCFA
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>

              <div className="flex justify-end p-4 border-t border-slate-100 bg-slate-50/50">
                <Button variant="outline" size="sm" onClick={() => setManageProduit(null)}>
                  Fermer
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Modal Import en Masse */}
        {isImportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs">
            <Card className="w-full max-w-2xl shadow-xl max-h-[92vh] overflow-y-auto">
              <CardHeader className="flex flex-row justify-between items-start border-b border-slate-100 pb-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5 text-indigo-600" />
                    Importation en masse (CSV / Excel)
                  </CardTitle>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsImportModalOpen(false)} className="h-8 w-8 text-slate-400">
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>

              <CardContent className="space-y-4 pt-4">
                {importStatus && (
                  <div className={`p-3.5 rounded-lg text-xs font-semibold border flex items-center gap-2 ${
                    importStatus.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}>
                    {importStatus.type === 'success'
                      ? <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      : <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />}
                    <span>{importStatus.message}</span>
                  </div>
                )}

                {/* Format attendu + modèle */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] space-y-1">
                  <p className="font-semibold text-slate-800">Format d'entête attendu :</p>
                  <p className="font-mono text-slate-500 break-all">
                    nom, categorie, lieu_stock, quantite_initiale, prix, qte_min, conditionnement_type, facteur_conversion, vente_unitaire_autorisee, produit_offert_nom
                  </p>
                  <p className="text-amber-700">
                    <strong>produit_offert_nom</strong> : sur la ligne du <strong>cadeau</strong>, mettre le nom du produit principal.
                  </p>
                  <p className="text-slate-500">Conditionnements : <code>UNITE | BOITE | CARTON | PAIRE | SACHET | AUTRE</code></p>
                  <Button
                    variant="outline" size="sm"
                    onClick={() => { navigator.clipboard.writeText(sampleCsvModel); setCopiedModel(true); setTimeout(() => setCopiedModel(false), 2000); }}
                    className="mt-1 gap-1.5 text-xs bg-white"
                  >
                    {copiedModel ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedModel ? 'Copié !' : 'Copier le modèle CSV'}
                  </Button>
                </div>

                {/* Choix de méthode */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setImportMode('file'); setImportInputText(''); setImportParsedItems([]); setSelectedFile(null); }}
                    className={`flex-1 py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                      importMode === 'file'
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-800'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Upload className="h-3.5 w-3.5" /> Charger un fichier
                  </button>
                  <button
                    type="button"
                    onClick={() => { setImportMode('paste'); setSelectedFile(null); setImportParsedItems([]); }}
                    className={`flex-1 py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                      importMode === 'paste'
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-800'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <FileText className="h-3.5 w-3.5" /> Coller du texte
                  </button>
                </div>

                {/* Zone active selon le mode */}
                {importMode === 'file' ? (
                  <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl p-6 text-center flex flex-col items-center bg-slate-50/50 hover:bg-indigo-50/30 transition cursor-pointer relative">
                    <Upload className="h-8 w-8 text-indigo-500 mb-2" />
                    <span className="font-semibold text-xs text-slate-800">
                      {selectedFile ? selectedFile.name : 'Cliquez ou glissez un fichier Excel / CSV'}
                    </span>
                    {selectedFile && importParsedItems.length > 0 && (
                      <span className="text-[11px] text-emerald-700 mt-1">{importParsedItems.length} ligne(s) détectée(s)</span>
                    )}
                    <input type="file" accept=".xlsx,.xls,.csv,.txt,.json" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                  </div>
                ) : (
                  <textarea
                    rows={5}
                    value={importInputText}
                    onChange={(e) => parseCsvText(e.target.value)}
                    placeholder="Collez ici les lignes CSV copiées d'Excel..."
                    autoFocus
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                )}

                {/* Aperçu — seulement si données parsées */}
                {importParsedItems.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-xs text-slate-900">
                        {importParsedItems.length} article(s) prêts à importer
                      </h4>
                      <Badge variant="secondary">Aperçu</Badge>
                    </div>
                    <div className="border border-slate-200 rounded-lg overflow-hidden max-h-[220px] overflow-y-auto">
                      <table className="w-full text-left text-xs text-slate-700">
                        <thead className="bg-slate-50 font-semibold text-slate-500 border-b sticky top-0">
                          <tr>
                            <th className="p-2">Produit</th>
                            <th className="p-2">Catégorie</th>
                            <th className="p-2">Qté</th>
                            <th className="p-2">Prix</th>
                            <th className="p-2">Cond.</th>
                            <th className="p-2">Cadeau de</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {importParsedItems.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/60">
                              <td className="p-2 font-semibold text-slate-900">{item.nom}</td>
                              <td className="p-2">{item.categorie}</td>
                              <td className="p-2 font-bold text-indigo-600">{item.quantite_initiale}</td>
                              <td className="p-2 font-semibold">{Number(item.prix).toLocaleString()} F</td>
                              <td className="p-2">{item.conditionnement_type || 'UNITE'} ×{item.facteur_conversion || 1}</td>
                              <td className="p-2">
                                {item.produit_offert_nom
                                  ? <Badge variant="warning">{item.produit_offert_nom}</Badge>
                                  : <span className="text-slate-300">—</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </CardContent>

              <div className="flex justify-end gap-3 p-4 border-t border-slate-100 bg-slate-50/50">
                <Button variant="outline" size="sm" onClick={() => setIsImportModalOpen(false)}>Annuler</Button>
                <Button
                  variant="primary" size="sm"
                  disabled={importParsedItems.length === 0 || isImporting}
                  onClick={handleExecuteImport}
                >
                  <Upload className="h-4 w-4" />
                  {isImporting ? 'Importation...' : `Importer (${importParsedItems.length})`}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Delete Confirmation */}
        <ConfirmModal
          isOpen={Boolean(deleteProductTarget)}
          title="Supprimer ce produit ?"
          message={"Êtes-vous sûr de vouloir supprimer définitivement \"" + (deleteProductTarget?.nom || "") + "\" ?"}
          confirmText="Supprimer"
          cancelText="Annuler"
          variant="danger"
          onConfirm={handleDeleteProduct}
          onCancel={() => setDeleteProductTarget(null)}
        />

      </div>
    </RoleGuard>
  );
}
