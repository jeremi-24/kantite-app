'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import {
  ShoppingCart,
  LayoutDashboard,
  Package,
  Receipt,
  ClipboardList,
  MapPin,
  Tag,
  Users,
  Settings,
  LogOut,
  Store,
  Shield,
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const [storeInfo, setStoreInfo] = useState<{ nom: string; adresse: string; logoUrl?: string }>({
    nom: 'StockApp SaaS',
    adresse: 'Gestion & Point de Vente',
    logoUrl: '',
  });

  useEffect(() => {
    const loadSettings = () => {
      const local = localStorage.getItem('store_settings');
      if (local) {
        try {
          const parsed = JSON.parse(local);
          setStoreInfo({
            nom: parsed.nom || 'StockApp SaaS',
            adresse: parsed.adresse || 'Gestion & Point de Vente',
            logoUrl: parsed.logoUrl || '',
          });
        } catch (e) {}
      }
    };

    loadSettings();
    window.addEventListener('storage', loadSettings);
    window.addEventListener('store_settings_updated', loadSettings);
    return () => {
      window.removeEventListener('storage', loadSettings);
      window.removeEventListener('store_settings_updated', loadSettings);
    };
  }, []);

  if (pathname === '/login') {
    return <>{children}</>;
  }

  const isAdmin = user?.role === 'ADMIN';

  const navLinks = [
    { label: 'Point de Vente', href: '/pos', icon: ShoppingCart, show: true },
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, show: isAdmin },
    { label: 'Produits & Stock', href: '/produits', icon: Package, show: isAdmin },
    { label: 'Ventes', href: '/ventes', icon: Receipt, show: true },
    { label: 'Inventaire', href: '/inventaire', icon: ClipboardList, show: isAdmin },
    { label: 'Lieux', href: '/admin/lieux', icon: MapPin, show: isAdmin },
    { label: 'Catégories', href: '/admin/categories', icon: Tag, show: isAdmin },
    { label: 'Utilisateurs', href: '/admin/utilisateurs', icon: Users, show: isAdmin },
    { label: 'Paramètres', href: '/admin/settings', icon: Settings, show: isAdmin },
  ].filter((item) => item.show);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const displayLogoUrl = storeInfo.logoUrl
    ? storeInfo.logoUrl.startsWith('http') || storeInfo.logoUrl.startsWith('data:')
      ? storeInfo.logoUrl
      : `${API_BASE}${storeInfo.logoUrl}`
    : '';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 text-sm">
      {/* Top Navbar Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
          {/* Store info branding */}
          <div className="flex items-center gap-3">
            {displayLogoUrl ? (
              <div className="h-10 w-10 rounded-xl border border-slate-200 bg-white flex items-center justify-center shrink-0 overflow-hidden shadow-xs p-1">
                <img src={displayLogoUrl} alt="Logo Boutique" className="h-full w-full object-contain" />
              </div>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shrink-0">
                <Store className="h-5 w-5" />
              </div>
            )}
            <div className="min-w-0">
              <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 block truncate">
                {storeInfo.nom}
              </span>
              <span className="text-xs text-slate-400 block -mt-1 truncate max-w-[200px] sm:max-w-[300px]">
                {storeInfo.adresse}
              </span>
            </div>
          </div>

          {/* User profile & Logout */}
          <div className="flex items-center gap-4">
            {user && (
              <div className="flex items-center gap-2.5 text-sm">
                <span className="font-semibold text-slate-700 hidden sm:inline">{user.email}</span>
                <Badge variant={isAdmin ? 'info' : 'secondary'} className="px-2.5 py-1 text-xs">
                  <Shield className="h-3.5 w-3.5 mr-1" />
                  {user.role}
                </Badge>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 border-slate-200 text-xs font-semibold"
            >
              <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Déconnexion</span>
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-slate-50 border-t border-slate-200/80 overflow-x-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-1 py-1.5">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
};
