import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useTonWallet, useIsConnectionRestored } from '@tonconnect/ui-react';

export default function ProtectedRoute() {
  const wallet = useTonWallet();
  const connectionRestored = useIsConnectionRestored();
  const location = useLocation();

  // Wait for TonConnect to finish restoring the previous session
  if (!connectionRestored) {
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




