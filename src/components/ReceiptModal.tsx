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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header bar (Non-printable) */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white print:hidden">
          <span className="text-sm font-bold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Ticket de Caisse Gagné
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint} className="bg-white text-slate-900 hover:bg-slate-100 border-none text-xs">
              <Printer className="h-3.5 w-3.5" /> Imprimer Ticket
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 text-slate-300 hover:text-white">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Receipt Thermal Format (80mm width standard) */}
        <div className="p-6 overflow-y-auto bg-white text-slate-900 font-mono text-xs leading-relaxed" id="thermal-receipt">
          <style jsx global>{`
            @media print {
              body * {
                visibility: hidden;
              }
              #thermal-receipt, #thermal-receipt * {
                visibility: visible;
              }
              #thermal-receipt {
                position: absolute;
                left: 0;
                top: 0;
                width: 80mm;
                padding: 10px;
              }
            }
          `}</style>

          {/* Store Header */}
          <div className="text-center pb-3 mb-3 border-b border-dashed border-slate-300">
            <h2 className="text-base font-bold uppercase tracking-wide">{activeStore.nom}</h2>
            {activeStore.adresse && <p className="text-[11px] text-slate-600">{activeStore.adresse}</p>}
            {(activeStore.telephone || activeStore.email) && (
              <p className="text-[10px] text-slate-500">
                Tél: {activeStore.telephone} {activeStore.email ? `| ${activeStore.email}` : ''}
              </p>
            )}
            {activeStore.nifStat && <p className="text-[10px] text-slate-400 mt-0.5">{activeStore.nifStat}</p>}
          </div>

          {/* Vente Details */}
          <div className="pb-3 mb-3 border-b border-dashed border-slate-300 space-y-0.5 text-[11px]">
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
          <table className="w-full text-left text-[11px] mb-3">
            <thead>
              <tr className="border-b border-slate-300 text-slate-500 uppercase text-[10px]">
                <th className="pb-1">Article</th>
                <th className="pb-1 text-center">Qté</th>
                <th className="pb-1 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vente.lignes.map((l, i) => (
                <tr key={i} className="align-top">
                  <td className="py-1.5 pr-1">
                    <span className="font-semibold text-slate-800 block">{l.produitNom}</span>
                    {l.conditionnementType && (
                      <span className="text-[10px] text-slate-400 block">{l.conditionnementType}</span>
                    )}
                  </td>
                  <td className="py-1.5 text-center font-semibold">{l.quantite}</td>
                  <td className="py-1.5 text-right font-bold">
                    {l.estOffert ? 'OFFERT' : `${(Number(l.prixReelApplique) * l.quantite).toLocaleString()} ${activeStore.devise}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Total Box */}
          <div className="pt-2 border-t-2 border-slate-900 space-y-1">
            <div className="flex justify-between items-center text-sm font-bold text-slate-900">
              <span>TOTAL REGLE</span>
              <span>{totalNum.toLocaleString()} {activeStore.devise}</span>
            </div>
          </div>

          {/* Footer Note */}
          <div className="text-center pt-4 mt-4 border-t border-dashed border-slate-200 text-[10px] text-slate-500 space-y-0.5">
            <p className="font-medium text-slate-700">{activeStore.piedDePage}</p>
            <p>Logiciel StockApp POS SaaS</p>
          </div>
        </div>
      </div>
    </div>
  );
};
