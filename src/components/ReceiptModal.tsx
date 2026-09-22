'use client';

import React from 'react';
import { Printer, X, CheckCircle2, Scissors } from 'lucide-react';
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

  const getLogoSrc = (url?: string) => {
    if (!url) return '';
    if (url.startsWith('data:') || url.startsWith('http')) return url;
    const backendUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, '') || 'http://localhost:5003';
    return `${backendUrl}${url}`;
  };

  const logoSrc = getLogoSrc(activeStore.logoUrl);

  const renderSingleTicket = (copyLabel: string) => (
    <div className="w-[85mm] max-w-full p-4 bg-white text-slate-900 font-mono text-[11px] leading-relaxed border border-slate-200 rounded-lg shadow-2xs print:border-none print:shadow-none print:p-2 flex flex-col justify-between">
      <div>
        {/* Copy Badge */}
        <div className="text-center mb-2">
          <span className="inline-block bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border border-slate-200 print:border-slate-400">
            {copyLabel}
          </span>
        </div>

        {/* Store Logo & Header */}
        <div className="text-center pb-3 mb-3 border-b border-dashed border-slate-300">
          {logoSrc && (
            <div className="flex justify-center mb-2">
              <img
                src={logoSrc}
                alt="Logo Boutique"
                className="h-12 w-auto max-w-[120px] object-contain"
              />
            </div>
          )}
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
        <div className="pb-3 mb-3 border-b border-dashed border-slate-300 space-y-0.5 text-[10px]">
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
        <table className="w-full text-left text-[10px] mb-3">
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
        <div className="pt-2 border-t-2 border-slate-900 space-y-1">
          <div className="flex justify-between items-center text-xs font-bold text-slate-900">
            <span>TOTAL REGLE</span>
            <span>{totalNum.toLocaleString()} {activeStore.devise}</span>
          </div>
        </div>
      </div>

      {/* Footer Note */}
      <div className="text-center pt-3 mt-3 border-t border-dashed border-slate-200 text-[9px] text-slate-500 space-y-0.5">
        <p className="font-medium text-slate-700">{activeStore.piedDePage}</p>
        <p>Kantité POS SaaS</p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header bar (Non-printable) */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white print:hidden">
          <span className="text-sm font-bold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Ticket de Caisse Gagné (2 Exemplaires sur A4)
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint} className="bg-emerald-500 text-white hover:bg-emerald-600 border-none text-xs font-bold flex items-center gap-1.5 shadow-xs">
              <Printer className="h-4 w-4" /> Imprimer Ticket (Format A4 - 2 Copies)
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-slate-300 hover:text-white">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Modal Body with Dual Ticket Preview */}
        <div className="p-6 overflow-y-auto bg-slate-100/70" id="printable-receipt-area">
          <style jsx global>{`
            @media print {
              @page {
                size: A4 portrait;
                margin: 8mm;
              }
              body * {
                visibility: hidden !important;
              }
              #printable-receipt-area, #printable-receipt-area * {
                visibility: visible !important;
              }
              #printable-receipt-area {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                background: white !important;
                padding: 0 !important;
                margin: 0 !important;
              }
              .tickets-wrapper {
                display: flex !important;
                flex-direction: row !important;
                justify-content: space-between !important;
                align-items: flex-start !important;
                width: 100% !important;
                gap: 6mm !important;
              }
              .cut-divider {
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                justify-content: center !important;
                border-left: 2px dashed #94a3b8 !important;
                height: 100% !important;
                min-height: 180mm !important;
                padding: 0 4px !important;
              }
            }
          `}</style>

          <div className="tickets-wrapper flex flex-col md:flex-row justify-center items-stretch gap-6 max-w-3xl mx-auto">
            {/* Ticket 1: Exemplaire Client */}
            {renderSingleTicket('EXEMPLAIRE CLIENT')}

            {/* Cut Line Separation */}
            <div className="cut-divider hidden md:flex flex-col items-center justify-center text-slate-400 my-auto py-4">
              <div className="border-r-2 border-dashed border-slate-300 h-full min-h-[160px] flex items-center justify-center relative">
                <span className="bg-slate-100 p-1.5 rounded-full text-slate-500 border border-slate-300 text-xs my-auto flex items-center gap-1 font-sans rotate-90 md:rotate-0">
                  <Scissors className="h-4 w-4" />
                </span>
              </div>
              <span className="text-[9px] font-bold text-slate-400 mt-2 tracking-widest uppercase text-center">
                Découpe
              </span>
            </div>

            {/* Ticket 2: Exemplaire Caisse */}
            {renderSingleTicket('EXEMPLAIRE CAISSE')}
          </div>
        </div>
      </div>
    </div>
  );
};
