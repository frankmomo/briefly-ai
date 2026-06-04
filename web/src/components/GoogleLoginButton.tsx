'use client';

import React, { useState } from 'react';
import { getGoogleAuthUrl } from '@/lib/api';

interface GoogleLoginButtonProps {
  children: React.ReactNode;
  className?: string;
}

export function GoogleLoginButton({ children, className }: GoogleLoginButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const { url } = await getGoogleAuthUrl();
      window.location.href = url;
    } catch (error) {
      console.error('[GoogleLoginButton] Unable to start Google OAuth:', error);
      setLoading(false);
    }
  };

  return (
    <button type="button" onClick={handleLogin} disabled={loading} className={className}>
      {loading ? 'Redirigiendo...' : children}
    </button>
  );
}
