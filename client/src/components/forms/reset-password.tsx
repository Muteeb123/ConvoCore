import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Loader2, CheckCircle } from "lucide-react";
// import { useUserStore } from "@/stores/useRoleStore";
// You can use your existing apiRequest function if you import it,
// but standard fetch is used here to keep the file self-contained.
// import { apiRequest } from "@/lib/queryClient";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  //   const activeUser = useUserStore((state) => state.user);

  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // On component load, get the token from the URL
  useEffect(() => {
    const urlToken = searchParams.get("token");
    if (!urlToken) {
      setError("Invalid or missing reset token. Please request a new link.");
    } else {
      setToken(urlToken);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!token) {
      setError("Invalid or missing reset token.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token,
          newPassword: password,
          //   activeUser: activeUser,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "An unknown error occurred.");
      }

      // Handle Success
      setSuccessMessage("Password reset successfully! Redirecting to login...");
      setTimeout(() => {
        navigate("/auth");
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Failed to connect to the server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            Set New Password
          </CardTitle>
          <CardDescription className="text-center">
            Enter and confirm your new password below.
          </CardDescription>
        </CardHeader>

        {/* Success Message View */}
        {successMessage ? (
          <CardContent className="flex flex-col items-center justify-center space-y-4 p-8">
            <CheckCircle className="w-16 h-16 text-green-500" />
            <p className="text-center font-medium">{successMessage}</p>
          </CardContent>
        ) : (
          /* Form View */
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {/* Show this error if the token is invalid on load */}
              {!token && error && (
                <div
                  className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
                  role="alert"
                >
                  <span className="block sm:inline">{error}</span>
                </div>
              )}

              {/* Only show the form if the token exists */}
              {token && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="password">New Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">
                      Confirm New Password
                    </Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                    />
                  </div>

                  {/* Show submission errors (e.g., "Passwords do not match") */}
                  {error && (
                    <p className="text-sm text-red-600 text-center">{error}</p>
                  )}
                </>
              )}
            </CardContent>

            {/* Only show footer if token exists and not successful */}
            {token && (
              <CardFooter>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {isSubmitting ? "Resetting..." : "Set New Password"}
                </Button>
              </CardFooter>
            )}
          </form>
        )}
      </Card>
    </div>
  );
}
