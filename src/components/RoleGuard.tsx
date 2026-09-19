'use client';

import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';

interface RoleGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export const RoleGuard = ({ children, requireAdmin = false }: RoleGuardProps) => {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (requireAdmin && user.role !== 'ADMIN') {
        router.push('/pos');
      }
    }
  }, [user, loading, requireAdmin, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-2 text-sm text-gray-600 font-medium">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user || (requireAdmin && user.role !== 'ADMIN')) {
    return null;
  }

  return <>{children}</>;
};
