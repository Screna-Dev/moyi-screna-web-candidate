import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

/**
 * Smart redirect component that redirects users based on their authentication status and role
 * - Not authenticated: redirects to /auth
 * - Admin users: redirects to admin dashboard
 * - Regular users: redirects to profile
 */
export default function SmartRedirect() {
  const { user, isLoading } = useAuth();

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If not authenticated, go to login
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // If authenticated, redirect based on role
  console.log('SmartRedirect - User:', user);
  console.log('SmartRedirect - Is Admin:', user.isAdmin);
  
  // Check if user is admin
  if (user.isAdmin) {
    // Redirect admin to admin panel (update with your admin route)
    return <Navigate to="/profile" replace />;
  } else {
    // Redirect regular user to profile or dashboard
    return <Navigate to="/profile" replace />;
  }
}