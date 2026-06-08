import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useTonWallet, useIsConnectionRestored } from '@tonconnect/ui-react';
import { useEffect, useState } from 'react';

export default function ProtectedRoute() {
  const wallet = useTonWallet();
  const connectionRestored = useIsConnectionRestored();
  const location = useLocation();
  const [restoreTimedOut, setRestoreTimedOut] = useState(false);

  useEffect(() => {
    if (connectionRestored) {
      setRestoreTimedOut(false);
      return;
    }

    const timeoutId = window.setTimeout(() => setRestoreTimedOut(true), 8000);
    return () => window.clearTimeout(timeoutId);
  }, [connectionRestored]);

  // Wait for TonConnect to finish restoring the previous session
  if (!connectionRestored) {
    if (restoreTimedOut) {
      return <Navigate to="/" state={{ from: location, tonRestoreTimedOut: true }} replace />;
    }

    return (
      <div className="min-h-screen bg-[#0d0b0a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
      </div>
    );
  }

  // If no wallet connected after restore, redirect to home
  if (!wallet) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <Outlet />;
}




