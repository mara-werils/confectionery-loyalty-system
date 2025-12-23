import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useTonWallet } from '@tonconnect/ui-react';

export default function ProtectedRoute() {
  const wallet = useTonWallet();
  const location = useLocation();

  // If no wallet connected, redirect to home
  if (!wallet) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // If wallet connected but not authenticated via API, show loading or auth flow
  // For now, we'll allow access if wallet is connected
  
  return <Outlet />;
}




