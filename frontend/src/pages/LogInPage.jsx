import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, Lock, User2 } from "lucide-react";
import { useState } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import GoogleLoginButton from "@/components/GoogleLoginButton";
import { z } from "zod";
import BaseHeader from "@/components/BaseHeader";
import { LabledInput } from "@/components/ui/labeled-input";

const loginSchema = z.object({
  identifier: z.string().min(1, "Username or Email is required"),
  password: z.string().min(1, "Password is required"),
});

const LogInPage = () => {
  const { isLoggingIn, login } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    identifier: "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
    setErrors((prev) => ({ ...prev, [id]: "" }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      loginSchema.parse(formData);
      const success = await login(formData);
      if (success) navigate("/");
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors = error.errors.reduce((acc, curr) => {
          acc[curr.path[0]] = curr.message;
          return acc;
        }, {});
        setErrors(fieldErrors);
      }
    }
  };

  return (
    <div className="flex pt-8 items-center justify-center h-svh bg-[#f5f5f5] dark:bg-background">
      <BaseHeader />
      <div className={cn("flex flex-col gap-2 max-w-[440px] w-full m-auto")}>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Login</CardTitle>
            <CardDescription>
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleFormSubmit}>
              <div className="flex flex-col gap-5">
                {/* Username/Email Field */}
                <LabledInput
                  id="identifier"
                  label="Username or Email"
                  type="text"
                  placeholder="Enter username or email"
                  value={formData.identifier}
                  onChange={handleChange}
                  disabled={isLoggingIn}
                  error={errors.identifier}
                  inputClassName={errors.identifier && "ring-2 ring-red-500"}
                />

                {/* Password Field with Forgot Password Link */}
                <div className="flex flex-col gap-2">
                  <LabledInput
                    id="password"
                    label="Password"
                    type="password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange}
                    disabled={isLoggingIn}
                    error={errors.password}
                    showPasswordToggle
                    inputClassName={errors.password && "ring-2 ring-red-500"}
                  />
                  <Link
                    to="/forgot-password"
                    className="text-sm underline-offset-2 hover:underline w-min whitespace-nowrap"
                  >
                    Forgot your password?
                  </Link>
                </div>

                <Button type="submit" className="w-full h-12 font-semibold rounded-xl" disabled={isLoggingIn}>
                  {isLoggingIn ? (
                    <>
                      <Loader2 className="animate-spin mr-2" />
                      Logging in...
                    </>
                  ) : (
                    "Login"
                  )}
                </Button>
              </div>
            </form>
            <GoogleLoginButton className={"mt-4 h-12 font-semibold rounded-xl"} />
            <div className="mt-4 text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link
                to="/signup"
                className="underline font-semibold text-foreground"
              >
                Sign up
              </Link>
            </div>
          </CardContent>
        </Card>
        <div className="text-muted-foreground mt-6 *:[a]:hover:text-primary text-center text-sm text-balance *:[a]:underline *:[a]:underline-offset-4">
          By clicking continue, you agree to our{" "}
          <Link to={"/privacy-policy"} className="underline">
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LogInPage;
