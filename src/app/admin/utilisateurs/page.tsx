'use client';

import React, { useState, useEffect } from 'react';
import { RoleGuard } from '../../../components/RoleGuard';
import { api } from '../../../lib/api';
import { Users, UserPlus, Pencil, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';

interface Utilisateur {
  id: string;
  nom: string;
  email: string;
  role: 'ADMIN' | 'VENDEUR';
  createdAt?: string;
}

export default function UtilisateursPage() {
  const [users, setUsers] = useState<Utilisateur[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [role, setRole] = useState<'VENDEUR' | 'ADMIN'>('VENDEUR');
  const [editingUser, setEditingUser] = useState<Utilisateur | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/utilisateurs');
      setUsers(res.data || []);
    } catch (err) {
      console.error('Erreur chargement utilisateurs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (editingUser) {
        const payload: any = { nom, email, role };
        if (motDePasse) payload.motDePasseHash = motDePasse;
        await api.patch(`/utilisateurs/${editingUser.id}`, payload);
      } else {
        await api.post('/utilisateurs', {
          nom,
          email,
          motDePasseHash: motDePasse,
          role,
        });
      }
      resetForm();
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la sauvegarde');
    }
  };

  const resetForm = () => {
    setNom('');
    setEmail('');
    setMotDePasse('');
    setRole('VENDEUR');
    setEditingUser(null);
  };

  const handleEditClick = (u: Utilisateur) => {
    setEditingUser(u);
    setNom(u.nom);
    setEmail(u.email);
    setRole(u.role);
    setMotDePasse('');
  };

  return (
    <RoleGuard requireAdmin={true}>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-slate-700" />
            Gestion des Utilisateurs
          </h1>
          <p className="text-sm text-slate-500 mt-1">Créer et gérer les comptes d'accès Vendeurs et Administrateurs</p>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-50 text-rose-800 text-sm font-medium rounded-lg border border-rose-200 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* User Form */}
        <Card className="bg-white">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-slate-500" />
              {editingUser ? `Modifier Utilisateur #${editingUser.nom}` : 'Créer un nouvel utilisateur'}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Nom complet
                  </label>
                  <Input
                    type="text"
                    required
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    placeholder="ex: Jean Dupont"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Adresse Email
                  </label>
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vendeur@boutique.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Mot de passe {editingUser && '(Optionnel)'}
                  </label>
                  <Input
                    type="password"
                    required={!editingUser}
                    value={motDePasse}
                    onChange={(e) => setMotDePasse(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Rôle système
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="VENDEUR">VENDEUR (Accès POS uniquement)</option>
                    <option value="ADMIN">ADMIN (Accès complet système)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                {editingUser && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                  >
                    Annuler
                  </Button>
                )}
                <Button
                  type="submit"
                  className="bg-slate-900 hover:bg-slate-800 text-white font-medium"
                >
                  {editingUser ? 'Sauvegarder' : 'Créer Utilisateur'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Users List */}
        {loading ? (
          <div className="py-12 text-center text-slate-500 text-sm font-medium">Chargement...</div>
        ) : (
          <Card className="overflow-hidden bg-white">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 font-semibold text-slate-500 border-b border-slate-200 text-xs uppercase">
                <tr>
                  <th className="p-4">Nom</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Rôle</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-4 font-semibold text-slate-900">{u.nom}</td>
                    <td className="p-4 text-slate-600">{u.email}</td>
                    <td className="p-4">
                      {u.role === 'ADMIN' ? (
                        <Badge variant="purple">ADMIN</Badge>
                      ) : (
                        <Badge variant="secondary">VENDEUR</Badge>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClick(u)}
                        className="h-8 text-xs font-semibold text-slate-700 hover:text-slate-900 gap-1"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Éditer
                      </Button>
                    </td>
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

