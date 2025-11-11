import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export const GoogleCallback: React.FC = () => {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(true);
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const handleGoogleCallback = async () => {
      try {
        if (hasRedirected) return;
        const urlParams = new URLSearchParams(location.split('?')[1] || '');
        const success = urlParams.get('success');
        const email = urlParams.get('email');
        const error = urlParams.get('error');
        const errorMessage = urlParams.get('message');
        if (error) {
          if (!isMounted || hasRedirected) return;
          let errorText = '';
          if (error === 'not_registered') {
            errorText = `Access denied. This email (${email}) is not registered in our system.`;
          } else if (error === 'deactivated') {
            errorText = `Access denied. Your account has been deactivated.`;
          } else {
            errorText = errorMessage || 'Google authentication was cancelled or failed';
          }
          toast({
            title: 'Authentication Failed',
            description: errorText,
            variant: 'destructive',
          });
          setHasRedirected(true);
          setLocation('/auth');
          return;
        }
        if (success === 'true' && email) {
          try {
            if (!isMounted || hasRedirected) return;
            const response = await fetch('/api/user', {
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
              },
            });
            if (response.ok) {
              const user = await response.json();
              toast({
                title: 'Success!',
                description: 'Successfully authenticated with Google',
              });
              setHasRedirected(true);
              setLocation('/');
              return;
            }
          } catch (err) {
            console.error('Failed to fetch user data:', err);
          }
        }
        
        setHasRedirected(true);
        setLocation('/auth');
      } catch (err) {
        if (!isMounted || hasRedirected) return;
        toast({
          title: 'Authentication Failed',
          description: err instanceof Error ? err.message : 'Authentication failed',
          variant: 'destructive',
        });
        setHasRedirected(true);
        setLocation('/auth');
      } finally {
        if (isMounted) {
          setIsProcessing(false);
        }
      }
    };

    handleGoogleCallback();

    return () => {
      isMounted = false;
    };
  }, [location, setLocation, toast, hasRedirected]);
  if (hasRedirected) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>Authenticating with Google</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p>Please wait while we complete your authentication...</p>
        </CardContent>
      </Card>
    </div>
  );
}; 