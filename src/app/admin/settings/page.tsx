'use client';

import React, { useState, useEffect } from 'react';
import { RoleGuard } from '../../../components/RoleGuard';
import { api } from '../../../lib/api';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../../components/ui/card';
import { Store, Save, CheckCircle2, Phone, Mail, MapPin, Receipt, ShieldCheck, Upload, Trash2, Image as ImageIcon, RefreshCw } from 'lucide-react';

export interface StoreSettings {
  nom: string;
  adresse: string;
  telephone: string;
  email: string;
  devise: string;
  piedDePage: string;
  nifStat: string;
  logoUrl?: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<StoreSettings>({
    nom: 'BOUTIQUE POS',
    adresse: '123 Rue du Commerce, Ville',
    telephone: '+261 34 00 000 00',
    email: 'contact@boutique.com',
    devise: 'FCFA',
    piedDePage: 'Merci pour votre visite ! À bientôt.',
    nifStat: 'NIF: 1000000000 / STAT: 00000',
    logoUrl: '',
  });

  const [saved, setSaved] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    const local = localStorage.getItem('store_settings');
    if (local) {
      try {
        setSettings(JSON.parse(local));
      } catch (e) {}
    }
  }, []);

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    setUploadError('');

    const convertToBase64Fallback = () => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Url = event.target?.result as string;
        const updated = { ...settings, logoUrl: base64Url };
        setSettings(updated);
        localStorage.setItem('store_settings', JSON.stringify(updated));
        window.dispatchEvent(new Event('store_settings_updated'));
        setUploadingLogo(false);
      };
      reader.onerror = () => {
        setUploadError('Erreur de lecture du fichier image.');
        setUploadingLogo(false);
      };
      reader.readAsDataURL(file);
    };

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await api.post('/upload/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.logoUrl) {
        const logoPath = res.data.logoUrl;
        const updated = { ...settings, logoUrl: logoPath };
        setSettings(updated);
        localStorage.setItem('store_settings', JSON.stringify(updated));
        window.dispatchEvent(new Event('store_settings_updated'));
        setUploadingLogo(false);
      } else {
        convertToBase64Fallback();
      }
    } catch (err: any) {
      // Fallback automatique immédiat si la route serveur retourne 404
      convertToBase64Fallback();
    }
  };

  const handleRemoveLogo = () => {
    const updated = { ...settings, logoUrl: '' };
    setSettings(updated);
    localStorage.setItem('store_settings', JSON.stringify(updated));
    window.dispatchEvent(new Event('store_settings_updated'));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('store_settings', JSON.stringify(settings));
    window.dispatchEvent(new Event('store_settings_updated'));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const displayLogoUrl = settings.logoUrl
    ? settings.logoUrl.startsWith('http') || settings.logoUrl.startsWith('data:')
      ? settings.logoUrl
      : `${API_BASE}${settings.logoUrl}`
    : '';

  return (
    <RoleGuard requireAdmin={true}>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Store className="h-5 w-5 text-indigo-600" />
              Paramètres de la Boutique
            </h1>
            <p className="text-xs text-slate-500">
              Coordonnées, logo de l'établissement, informations fiscales et en-tête des reçus
            </p>
          </div>

          {saved && (
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-md border border-emerald-200">
              <CheckCircle2 className="h-4 w-4" />
              Paramètres enregistrés avec succès
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="bg-white overflow-hidden shadow-xs border border-slate-200/80 rounded-xl">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Store className="h-4 w-4 text-slate-600" />
                Informations Générales & Logo
              </CardTitle>
              <CardDescription>
                Ces informations et le logo apparaîtront en haut du menu, sur les reçus de caisse et sur l'application.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Section Upload Logo */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center gap-4">
                <div className="h-16 w-16 rounded-xl border border-slate-200 bg-white flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                  {displayLogoUrl ? (
                    <img
                      src={displayLogoUrl}
                      alt="Logo Boutique"
                      className="h-full w-full object-contain p-1"
                    />
                  ) : (
                    <Store className="h-8 w-8 text-indigo-600" />
                  )}
                </div>

                <div className="flex-1 text-center sm:text-left">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center justify-center sm:justify-start gap-1.5">
                    <ImageIcon className="h-4 w-4 text-indigo-600" />
                    Logo de la boutique
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Format recommandé : PNG, JPG, SVG ou WEBP. Le logo sera affiché dans le header et sur les tickets.
                  </p>

                  {uploadError && (
                    <span className="text-xs font-semibold text-rose-600 block mt-1">
                      {uploadError}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition">
                    {uploadingLogo ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    {uploadingLogo ? 'Téléversement...' : 'Changer le logo'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      disabled={uploadingLogo}
                      className="hidden"
                    />
                  </label>

                  {displayLogoUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveLogo}
                      className="text-rose-600 border-rose-200 hover:bg-rose-50 text-xs font-semibold"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Form fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Store className="h-3.5 w-3.5 text-slate-400" /> Nom de l'établissement
                  </label>
                  <Input
                    type="text"
                    required
                    value={settings.nom}
                    onChange={(e) => setSettings({ ...settings, nom: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" /> Adresse Physique
                  </label>
                  <Input
                    type="text"
                    required
                    value={settings.adresse}
                    onChange={(e) => setSettings({ ...settings, adresse: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-slate-400" /> Téléphone de contact
                  </label>
                  <Input
                    type="text"
                    value={settings.telephone}
                    onChange={(e) => setSettings({ ...settings, telephone: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-slate-400" /> Adresse Email
                  </label>
                  <Input
                    type="email"
                    value={settings.email}
                    onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                    Devise monétaire (Affichage & Reçu)
                  </label>
                  <Input
                    type="text"
                    required
                    value={settings.devise}
                    onChange={(e) => setSettings({ ...settings, devise: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-slate-400" /> Identification Fiscale / NIF STAT
                  </label>
                  <Input
                    type="text"
                    value={settings.nifStat}
                    onChange={(e) => setSettings({ ...settings, nifStat: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Receipt className="h-3.5 w-3.5 text-slate-400" /> Pied de page des Reçus de Caisse
                </label>
                <textarea
                  rows={2}
                  value={settings.piedDePage}
                  onChange={(e) => setSettings({ ...settings, piedDePage: e.target.value })}
                  className="flex w-full rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </CardContent>

            <CardFooter className="flex justify-end border-t border-slate-100 bg-slate-50/50">
              <Button type="submit" variant="primary">
                <Save className="h-4 w-4" /> Sauvegarder les paramètres
              </Button>
            </CardFooter>
          </Card>
        </form>
      </div>
    </RoleGuard>
  );
}
