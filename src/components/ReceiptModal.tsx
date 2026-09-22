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

  const renderSingleTicket = (showLogo: boolean) => (
    <div className="bg-white text-slate-900 font-mono text-xs leading-relaxed w-full">
      {/* Logo entreprise (Masqué dans l'appli, visible UNIQUEMENT à l'impression) */}
      {showLogo && activeStore.logoUrl && (
        <div className="text-center mb-2.5">
          <img
            src={activeStore.logoUrl}
            alt="Logo Entreprise"
            className="max-h-14 max-w-[130px] object-contain mx-auto"
          />
        </div>
      )}

      {/* Store Header */}
      <div className="text-center pb-2.5 mb-2.5 border-b border-dashed border-slate-300">
        <h2 className="text-sm font-bold uppercase tracking-wide">{activeStore.nom}</h2>
        {activeStore.adresse && <p className="text-[10px] text-slate-600">{activeStore.adresse}</p>}
        {(activeStore.telephone || activeStore.email) && (
          <p className="text-[9px] text-slate-500">
            Tél: {activeStore.telephone} {activeStore.email ? `| ${activeStore.email}` : ''}
          </p>
        )}
        {activeStore.nifStat && <p className="text-[9px] text-slate-400 mt-0.5">{activeStore.nifStat}</p>}
      </div>

      {/* Vente Details */}
      <div className="pb-2.5 mb-2.5 border-b border-dashed border-slate-300 space-y-0.5 text-[10px]">
        <div className="flex justify-between">
          <span className="text-slate-500">Ticket N° :</span>
          <span className="font-bold">#{vente.id.slice(0, 8)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Date :</span>
          <span>{formattedDate}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Règlement :</span>
          <span className="font-semibold uppercase">{vente.modePaiement}</span>
        </div>
      </div>

      {/* Articles Table */}
      <table className="w-full text-left text-[10px] mb-2.5">
        <thead>
          <tr className="border-b border-slate-300 text-slate-500 uppercase text-[9px]">
            <th className="pb-1">Article</th>
            <th className="pb-1 text-center">Qté</th>
            <th className="pb-1 text-right">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {vente.lignes.map((l, i) => (
            <tr key={i} className="align-top">
              <td className="py-1 pr-1">
                <span className="font-semibold text-slate-800 block">{l.produitNom}</span>
                {l.conditionnementType && (
                  <span className="text-[9px] text-slate-400 block">{l.conditionnementType}</span>
                )}
              </td>
              <td className="py-1 text-center font-semibold">{l.quantite}</td>
              <td className="py-1 text-right font-bold">
                {l.estOffert ? 'OFFERT' : `${(Number(l.prixReelApplique) * l.quantite).toLocaleString()} ${activeStore.devise}`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Total Box */}
      <div className="pt-1.5 border-t-2 border-slate-900 space-y-0.5">
        <div className="flex justify-between items-center text-xs font-bold text-slate-900">
          <span>TOTAL REGLE</span>
          <span>{totalNum.toLocaleString()} {activeStore.devise}</span>
        </div>
      </div>

      {/* Footer Note */}
      <div className="text-center pt-2 mt-2 border-t border-dashed border-slate-200 text-[9px] text-slate-500 space-y-0.5">
        <p className="font-medium text-slate-700">{activeStore.piedDePage}</p>
        <p className="text-[8px] text-slate-400">Logiciel StockApp POS SaaS</p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs">
      {/* Fenêtre Modale Normale dans l'Application (Masquée à l'impression) */}
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] print:hidden">
        {/* Header bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white">
          <span className="text-sm font-bold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Ticket de Caisse Validé
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint} className="bg-white text-slate-900 hover:bg-slate-100 border-none text-xs">
              <Printer className="h-3.5 w-3.5" /> Imprimer Ticket (2x A4)
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 text-slate-300 hover:text-white">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Vue 1 seul Ticket Thermique normal dans l'application (SANS logo) */}
        <div className="p-6 overflow-y-auto bg-white" id="thermal-receipt">
          {renderSingleTicket(false)}
        </div>
      </div>

      {/* Rendu Spécial Impression A4 (2 Tickets identiques superposés avec ligne de découpe + Logo) */}
      <div className="hidden print:block print:fixed print:inset-0 print:bg-white print:z-9999" id="printable-a4-wrapper">
        <style jsx global>{`
          @media print {
            @page {
              size: A4 portrait;
              margin: 0;
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

        <div className="w-[210mm] h-[297mm] flex flex-col justify-between p-3 box-border bg-white text-slate-900 font-mono text-xs">
          {/* Ticket du haut (Exemplaire 1) */}
          <div className="h-[141mm] flex flex-col items-center justify-center py-2 px-4 box-border">
            <div className="w-[80mm] max-w-[80mm] border border-slate-200/50 p-3 rounded-xs shadow-none">
              {renderSingleTicket(true)}
            </div>
          </div>

          {/* Ligne de Découpe médiane */}
          <div className="w-full flex items-center justify-center my-0.5 border-t border-b border-dashed border-slate-400 py-1 bg-slate-50/50">
            <span className="text-[9px] text-slate-500 font-sans tracking-wider uppercase flex items-center gap-2">
              ✂ ---------------- LIGNE DE DECOUPE (1 TICKET ENTREPRISE / 1 TICKET CLIENT) ---------------- ✂
            </span>
          </div>

          {/* Ticket du bas (Exemplaire 2) */}
          <div className="h-[141mm] flex flex-col items-center justify-center py-2 px-4 box-border">
            <div className="w-[80mm] max-w-[80mm] border border-slate-200/50 p-3 rounded-xs shadow-none">
              {renderSingleTicket(true)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
