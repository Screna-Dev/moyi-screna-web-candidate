import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import { usePostHog } from 'posthog-js/react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function GoogleCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setUserFromToken } = useAuth();
  const posthog = usePostHog();
  const [error, setError] = useState<string | null>(null);
  const hasProcessedRef = useRef(false); // Add ref to prevent double processing

  useEffect(() => {
    // Prevent running twice
    if (hasProcessedRef.current) return;

    const handleCallback = async () => {
      const code = searchParams.get('code');
      const errorParam = searchParams.get('error');

      if (errorParam) {
        const errorMessage = decodeURIComponent(errorParam);
        setError(errorMessage);
        toast({
          title: 'Authentication Failed',
          description: errorMessage,
          variant: 'destructive',
        });
        setTimeout(() => navigate('/auth'), 3000);
        return;
      }

      if (!code) {
        navigate('/auth');
        return;
      }

      // Mark as processed BEFORE making the API call
      hasProcessedRef.current = true;

      try {
        const redirectUri = `${window.location.origin}/auth/google/callback`;
        console.log('Sending to backend:', { code, redirectUri });
        
        // Send code to backend
        const response = await fetch('/api/v1/auth/google/oauth2', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code,
            redirectUri,
          }),
        });

        console.log('Response status:', response.status);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Backend error:', errorData);
          throw new Error(errorData.message || 'Failed to authenticate with Google');
        }

        const data = await response.json();
        console.log('Backend response:', data);
        
        // Extract tokens based on your API structure
        const accessToken = data.data?.accessToken || data.accessToken;
        const refreshToken = data.data?.refreshToken || data.refreshToken;
        
        if (!accessToken) {
          console.error('No token in response. Full response:', data);
          throw new Error('No token received from server');
        }

        console.log('Tokens extracted successfully');

        // Store the tokens in localStorage (always for Google login)
        localStorage.setItem('authToken', accessToken);
        if (refreshToken) {
          localStorage.setItem('refreshToken', refreshToken);
        }

        console.log('Tokens stored in localStorage');

        // Set user from token
        setUserFromToken(accessToken);

        toast({
          title: 'Success!',
          description: 'You have successfully signed in with Google.',
        });
        
        // Redirect to profile
        navigate('/profile');
        
      } catch (err: any) {
        console.error('Error handling Google callback:', err);
        
        let errorMessage = 'Failed to complete authentication. Please try again.';
        if (err.message) {
          errorMessage = err.message;
        }
        
        setError(errorMessage);
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
        
        setTimeout(() => navigate('/auth'), 3000);
      }
    };

    handleCallback();
  }, []); // Empty dependency array - only run once on mount

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="text-center max-w-md w-full">
        {error ? (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <p className="text-sm text-muted-foreground">
              Redirecting you back to login...
            </p>
          </div>
        ) : (
          <>
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
            <h2 className="text-xl font-semibold mb-2">Completing sign in...</h2>
            <p className="text-muted-foreground">Please wait while we log you in with Google.</p>
          </>
        )}
      </div>
    </div>
  );
}