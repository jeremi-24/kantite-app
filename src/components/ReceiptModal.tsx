'use client';

import React from 'react';
import { Printer, X, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/button';

export interface ReceiptData {
  id: string;
  date: string | Date;
  total: number | string;
  modePaiement: string;
  lignes: Array<{
    produitNom: string;
    conditionnementType?: string;
    quantite: number;
    prixReelApplique: number | string;
    estOffert?: boolean;
  }>;
}

export interface StoreInfo {
  nom: string;
  adresse: string;
  telephone: string;
  email: string;
  devise: string;
  piedDePage: string;
  nifStat: string;
  logoUrl?: string;
}

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  vente: ReceiptData | null;
  storeInfo?: StoreInfo;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  vente,
  storeInfo,
}) => {
  if (!isOpen || !vente) return null;

  const defaultStore: StoreInfo = {
    nom: 'BOUTIQUE POS',
    adresse: '123 Rue du Commerce, Ville',
    telephone: '+261 34 00 000 00',
    email: 'contact@boutique.com',
    devise: 'FCFA',
    piedDePage: 'Merci pour votre visite ! À bientôt.',
    nifStat: 'NIF: 1000000000 / STAT: 00000',
    logoUrl: '',
  };

  let activeStore = defaultStore;
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem('store_settings');
    if (local) {
      try {
        activeStore = { ...defaultStore, ...JSON.parse(local) };
      } catch (e) {}
    }
  }
  if (storeInfo) {
    activeStore = { ...activeStore, ...storeInfo };
  }

  const handlePrint = () => {
    window.print();
  };

  const totalNum = Number(vente.total);
  const formattedDate = new Date(vente.date).toLocaleString('fr-FR');

  const renderTicketContent = (showLogo: boolean) => (
    <div className="bg-white text-slate-900 font-mono text-xs leading-relaxed w-full">
      {/* Logo Entreprise (Masqué dans la modale web, affiché à l'impression / aperçu) */}
      {showLogo && activeStore.logoUrl && (
        <div className="text-center mb-3">
          <img
            src={activeStore.logoUrl}
            alt="Logo Entreprise"
            className="max-h-16 max-w-[150px] object-contain mx-auto"
          />
        </div>
      )}

      {/* En-tête de la Boutique */}
      <div className="text-center pb-3 mb-3 border-b border-dashed border-slate-300 space-y-0.5">
        <h2 className="text-sm font-bold uppercase tracking-wider">{activeStore.nom}</h2>
        {activeStore.adresse && <p className="text-[11px] text-slate-600">{activeStore.adresse}</p>}
        {(activeStore.telephone || activeStore.email) && (
          <p className="text-[10px] text-slate-500">
            Tél: {activeStore.telephone} {activeStore.email ? `| ${activeStore.email}` : ''}
          </p>
        )}
        {activeStore.nifStat && <p className="text-[10px] text-slate-400 mt-0.5">{activeStore.nifStat}</p>}
      </div>

      {/* Détails de la transaction */}
      <div className="pb-3 mb-3 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
        <div className="flex justify-between">
          <span className="text-slate-500">Ticket N° :</span>
          <span className="font-bold text-slate-900">#{vente.id.slice(0, 8)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Date & Heure :</span>
          <span>{formattedDate}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Mode de Règlement :</span>
          <span className="font-semibold uppercase text-slate-800">{vente.modePaiement}</span>
        </div>
      </div>

      {/* Tableau des Articles */}
      <table className="w-full text-left text-[11px] mb-3">
        <thead>
          <tr className="border-b border-slate-300 text-slate-500 uppercase text-[10px]">
            <th className="pb-1.5">Article</th>
            <th className="pb-1.5 text-center">Qté</th>
            <th className="pb-1.5 text-right">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {vente.lignes.map((l, i) => (
            <tr key={i} className="align-top">
              <td className="py-1.5 pr-2">
                <span className="font-semibold text-slate-900 block">{l.produitNom}</span>
                {l.conditionnementType && (
                  <span className="text-[10px] text-slate-400 block">{l.conditionnementType}</span>
                )}
              </td>
              <td className="py-1.5 text-center font-semibold">{l.quantite}</td>
              <td className="py-1.5 text-right font-bold text-slate-900">
                {l.estOffert ? 'OFFERT' : `${(Number(l.prixReelApplique) * l.quantite).toLocaleString()} ${activeStore.devise}`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Encadré du Total */}
      <div className="pt-2 border-t-2 border-slate-900 space-y-1">
        <div className="flex justify-between items-center text-sm font-bold text-slate-900">
          <span>TOTAL RÉGLÉ</span>
          <span>{totalNum.toLocaleString()} {activeStore.devise}</span>
        </div>
      </div>

      {/* Pied de Page */}
      <div className="text-center pt-3 mt-3 border-t border-dashed border-slate-200 text-[10px] text-slate-500 space-y-0.5">
        <p className="font-medium text-slate-700">{activeStore.piedDePage}</p>
        <p className="text-[9px] text-slate-400">Logiciel StockApp POS SaaS</p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs">
      {/* Modale d'affichage Web normale (Masquée à l'impression) */}
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] print:hidden">
        {/* Header bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white">
          <span className="text-sm font-bold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Ticket de Caisse Validé
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint} className="bg-white text-slate-900 hover:bg-slate-100 border-none text-xs">
              <Printer className="h-3.5 w-3.5" /> Imprimer A4 (2x Côte à côte)
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 text-slate-300 hover:text-white">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Aperçu Web : 1 seul Ticket (Masqué à l'impression) */}
        <div className="p-6 overflow-y-auto bg-white" id="thermal-receipt">
          {renderTicketContent(false)}
        </div>
      </div>

      {/* LAYOUT SPÉCIAL IMPRESSION A4 PORTRAIT (2 COLONNES VERTICALES CÔTÉ À CÔTÉ + DÉCOUPE VERTICALE + LOGO) */}
      <div className="hidden print:block print:fixed print:inset-0 print:bg-white print:z-9999" id="printable-a4-wrapper">
        <style jsx global>{`
          @media print {
            @page {
              size: A4 portrait;
              margin: 0;
            }
            html, body {
              width: 210mm !important;
              height: 297mm !important;
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body * {
              visibility: hidden !important;
            }
            #printable-a4-wrapper, #printable-a4-wrapper * {
              visibility: visible !important;
            }
            #printable-a4-wrapper {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 210mm !important;
              height: 297mm !important;
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
              box-sizing: border-box !important;
            }
          }
        `}</style>

        <div className="w-[210mm] h-[297mm] flex flex-row box-border bg-white text-slate-900 font-mono text-xs overflow-hidden">
          {/* COLONNE GAUCHE - TICKET 1 PORTRAIT (105mm de largeur) */}
          <div className="w-[105mm] h-[297mm] p-6 box-border border-r-2 border-dashed border-slate-400 flex flex-col justify-between relative">
            <div className="w-full">
              {renderTicketContent(true)}
            </div>
            {/* Pied de page découpe */}
            <div className="text-[9px] text-slate-400 text-center tracking-wider uppercase border-t border-slate-200 pt-2 mt-4 font-sans flex justify-between items-center">
              <span>EXEMPLAIRE CLIENT / ENTREPRISE</span>
              <span className="font-bold">✂ DÉCOUPE</span>
            </div>
          </div>

          {/* COLONNE DROITE - TICKET 2 PORTRAIT IDENTIQUE (105mm de largeur) */}
          <div className="w-[105mm] h-[297mm] p-6 box-border flex flex-col justify-between relative">
            <div className="w-full">
              {renderTicketContent(true)}
            </div>
            {/* Pied de page découpe */}
            <div className="text-[9px] text-slate-400 text-center tracking-wider uppercase border-t border-slate-200 pt-2 mt-4 font-sans flex justify-between items-center">
              <span className="font-bold">DÉCOUPE ✂</span>
              <span>EXEMPLAIRE DUPLICATA / CAISSE</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
