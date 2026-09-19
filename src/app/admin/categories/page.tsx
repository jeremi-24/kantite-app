'use client';

import React, { useState, useEffect } from 'react';
import { RoleGuard } from '../../../components/RoleGuard';
import { api } from '../../../lib/api';
import { Tag, Plus, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';

interface Categorie {
  id: string;
  nom: string;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [loading, setLoading] = useState(true);
  const [nom, setNom] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await api.get('/categories');
      setCategories(res.data || []);
    } catch (err) {
      console.error('Erreur chargement catégories:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim()) return;
    setError('');

    try {
      await api.post('/categories', { nom: nom.toUpperCase().trim() });
      setNom('');
      fetchCategories();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la création de la catégorie');
    }
  };

  return (
    <RoleGuard requireAdmin={true}>
      <div className="space-y-6 max-w-3xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Tag className="h-6 w-6 text-slate-700" />
            Catégories Produits
          </h1>
          <p className="text-sm text-slate-500 mt-1">Gestion des catégories de produits (ex: LUNETTE, ACCESSOIRES, HUILE...)</p>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-50 text-rose-800 text-sm font-medium rounded-lg border border-rose-200 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Card className="bg-white">
          <CardContent className="p-4">
            <form onSubmit={handleSubmit} className="flex gap-3">
              <Input
                type="text"
                required
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="ex: LUNETTE HOMME BOITE..."
                className="flex-1 uppercase font-semibold"
              />
              <Button
                type="submit"
                className="bg-slate-900 hover:bg-slate-800 text-white font-medium gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Ajouter Catégorie
              </Button>
            </form>
          </CardContent>
        </Card>

        {loading ? (
          <div className="py-12 text-center text-slate-500 text-sm font-medium">Chargement...</div>
        ) : (
          <Card className="overflow-hidden bg-white">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 font-semibold text-slate-500 border-b border-slate-200 text-xs uppercase">
                <tr>
                  <th className="p-4">Nom de la Catégorie</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categories.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-4 font-semibold text-slate-900">{c.nom}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </RoleGuard>
  );
}

