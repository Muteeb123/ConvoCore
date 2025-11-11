import React from 'react';
import { Button } from '@/components/ui/button';
import { FcGoogle } from 'react-icons/fc';
import { useAuth } from '@/hooks/use-auth';

interface GoogleLoginButtonProps {
  className?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({
  className = '',
  variant = 'outline',
  size = 'default',
}) => {
  const { loginMutation } = useAuth();

  const handleGoogleLogin = async () => {
    try {
      const response = await fetch('/api/auth/google');
      if (!response.ok) {
        throw new Error('Failed to get Google auth URL');
      }
      const { authUrl } = await response.json();
      window.location.href = authUrl;
    } catch (error) {
      console.error('Failed to initiate Google login:', error);
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={`w-full ${className}`}
      onClick={handleGoogleLogin}
      disabled={loginMutation.isPending}
    >
      <FcGoogle className="mr-2 h-4 w-4" />
      Continue with Google
    </Button>
  );
}; 