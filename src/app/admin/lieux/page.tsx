'use client';

import React, { useState, useEffect } from 'react';
import { RoleGuard } from '../../../components/RoleGuard';
import { api } from '../../../lib/api';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import { MapPin, Plus, Pencil, Trash2, X } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';

interface LieuStock {
  id: string;
  nom: string;
}

export default function LieuxPage() {
  const [lieux, setLieux] = useState<LieuStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [nom, setNom] = useState('');
  const [editingLieu, setEditingLieu] = useState<LieuStock | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LieuStock | null>(null);

  useEffect(() => {
    fetchLieux();
  }, []);

  const fetchLieux = async () => {
    setLoading(true);
    try {
      const res = await api.get('/lieux-stock');
      setLieux(res.data || []);
    } catch (err) {
      console.error('Erreur chargement lieux:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim()) return;

    try {
      if (editingLieu) {
        await api.patch(`/lieux-stock/${editingLieu.id}`, { nom });
      } else {
        await api.post('/lieux-stock', { nom });
      }
      setNom('');
      setEditingLieu(null);
      fetchLieux();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erreur lors de la sauvegarde');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/lieux-stock/${deleteTarget.id}`);
      setDeleteTarget(null);
      fetchLieux();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Impossible de supprimer ce lieu');
    }
  };

  return (
    <RoleGuard requireAdmin={true}>
      <div className="space-y-6 max-w-3xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <MapPin className="h-6 w-6 text-slate-700" />
            Lieux de Stock
          </h1>
          <p className="text-sm text-slate-500 mt-1">Gestion des pièces et emplacements physiques de stock</p>
        </div>

        <Card className="bg-white">
          <CardContent className="p-4">
            <form onSubmit={handleSubmit} className="flex gap-3">
              <Input
                type="text"
                required
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="ex: Pièce 1, Réserve..."
                className="flex-1"
              />
              <Button
                type="submit"
                className="bg-slate-900 hover:bg-slate-800 text-white font-medium gap-1.5"
              >
                <Plus className="h-4 w-4" />
                {editingLieu ? 'Modifier' : 'Ajouter Lieu'}
              </Button>
              {editingLieu && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingLieu(null);
                    setNom('');
                  }}
                >
                  Annuler
                </Button>
              )}
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
                  <th className="p-4">Nom du Lieu</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lieux.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-4 font-semibold text-slate-900">{l.nom}</td>
                    <td className="p-4 text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingLieu(l);
                          setNom(l.nom);
                        }}
                        className="h-8 text-xs font-semibold text-slate-700 hover:text-slate-900 gap-1"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Éditer
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTarget(l)}
                        className="h-8 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 gap-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Supprimer
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        <ConfirmModal
          isOpen={Boolean(deleteTarget)}
          title="Supprimer ce lieu de stock ?"
          message={`Êtes-vous sûr de vouloir supprimer "${deleteTarget?.nom}" ?`}
          confirmText="Supprimer"
          cancelText="Annuler"
          variant="danger"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      </div>
    </RoleGuard>
  );
}

