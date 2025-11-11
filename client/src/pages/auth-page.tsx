import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Redirect } from "wouter";
import {
  Shield,
  Users,
  Mail,
  BarChart3,
  Calendar,
  Eye,
  EyeOff,
  Lock,
} from "lucide-react";
import { ForgotPasswordForm } from "@/components/forms/forgot-password-form";
import { GoogleLoginButton } from "@/components/auth/GoogleLoginButton";

// --- Form Schema (Unchanged) ---
const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});
type LoginData = z.infer<typeof loginSchema>;

// --- Main Auth Page Component ---
export default function AuthPage() {
  const { user, loginMutation } = useAuth();
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  if (user) {
    return <Redirect to="/" />;
  }

  const handleLogin = async (data: LoginData) => {
    try {
      await loginMutation.mutateAsync(data);
    } catch (error) {
      console.error("Login failed:", { error });
    }
  };

  // --- Forgot Password View (Unchanged) ---
  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4">
        <ForgotPasswordForm onBack={() => setShowForgotPassword(false)} />
      </div>
    );
  }

  // --- Main Login View ---
  return (
    <div className="min-h-screen w-full lg:grid lg:grid-cols-2">
      {/* 1. Left Side (Login Form) */}
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            {/* ✅ HERE IS THE REPLACEMENT: */}
            {/* This <img> tag points to /logo.svg.
              Make sure you have saved your logo file in your project's `public` folder.
            */}
            <img
              src="https://storage.googleapis.com/integriti-crm-avatars/integriti-logo-black.png"
              alt="Integriti CRM Logo"
              className="w-48 h-auto mx-auto mb-4  pr-[20px]"
            />

            <h2 className="text-3xl font-bold tracking-tight text-black">
              Welcome Back!
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Sign in to your Integriti CRM account
            </p>
          </div>

          <Card>
            <form onSubmit={loginForm.handleSubmit(handleLogin)}>
              <CardContent className="space-y-4 pt-6">
                {/* Username Input with Icon */}
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="username"
                      type="text"
                      placeholder="e.g., user@integriti.com"
                      className="pl-10"
                      {...loginForm.register("username")}
                    />
                  </div>
                  {loginForm.formState.errors.username && (
                    <p className="text-sm text-red-600">
                      {loginForm.formState.errors.username.message}
                    </p>
                  )}
                </div>

                {/* Password Input with Icon */}
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      className="pl-10 pr-10"
                      {...loginForm.register("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {loginForm.formState.errors.password && (
                    <p className="text-sm text-red-600">
                      {loginForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                {/* Aligned "Forgot Password" Link */}
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="link"
                    className="text-sm text-primary hover:text-primary/80 px-0"
                    onClick={() => setShowForgotPassword(true)}
                  >
                    Forgot password?
                  </Button>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4">
                {/* Main Login Button */}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? "Signing in..." : "Sign In"}
                </Button>

                {/* "Or" Divider */}

                {/* Google Login Button */}
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>

      {/* 2. Right Side (Brand Panel) - Unchanged */}
      <div className="hidden lg:flex flex-col justify-center p-12 bg-gradient-to-br from-primary to-blue-800 text-white relative">
        <div className="max-w-md">
          <h1 className="text-4xl font-bold mb-6">
            Manage Your Business Like a Pro
          </h1>
          <p className="text-xl mb-8 text-blue-100">
            Transform your customer relationships with our comprehensive CRM
            solution
          </p>

          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Lead Management</h3>
                <p className="text-sm text-blue-100">
                  Track and convert leads with powerful automation tools
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Email Integration</h3>
                <p className="text-sm text-blue-100">
                  Connect Gmail, Outlook, and other email providers seamlessly
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Analytics & Reports</h3>
                <p className="text-sm text-blue-100">
                  Get insights into your sales pipeline and performance
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Task & Calendar</h3>
                <p className="text-sm text-blue-100">
                  Schedule meetings and manage tasks efficiently
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Role-Based Access</h3>
                <p className="text-sm text-blue-100">
                  Secure your data with customizable user roles and permissions
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
