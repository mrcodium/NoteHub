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
import { Check, Eye, EyeOff, Loader2, Lock, Mail, User2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import GoogleLoginButton from "@/components/GoogleLoginButton";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import validator from "validator";
import BaseHeader from "@/components/BaseHeader";
import { LabledInput } from "@/components/ui/labeled-input";
import { Helmet } from "react-helmet-async";

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

const SignupPage = () => {
  const { isSigningUp, signup, sendSignupOtp, isSendingOtp, isEmailAvailable } =
    useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState(null);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    otp: "",
  });

  const [errors, setErrors] = useState({
    name: "",
    email: "",
    password: "",
    otp: "",
  });

  const debouncedEmail = useDebounce(formData.email, 500);

  useEffect(() => {
    let interval;
    if (cooldown > 0) {
      interval = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [cooldown]);

  useEffect(() => {
    const checkEmailAvailability = async () => {
      const trimmedEmail = formData.email.trim();
      if (!trimmedEmail || !validator.isEmail(trimmedEmail)) {
        setEmailStatus(null);
        return;
      }

      setIsCheckingEmail(true);
      try {
        const isAvailable = await isEmailAvailable(trimmedEmail);
        setEmailStatus(isAvailable ? "available" : "taken");
        setErrors((prev) => ({
          ...prev,
          email: isAvailable ? "" : "Email is already registered",
        }));
      } catch (error) {
        console.error("Email check failed:", error);
        setEmailStatus(null);
      } finally {
        setIsCheckingEmail(false);
      }
    };

    checkEmailAvailability();
  }, [debouncedEmail, isEmailAvailable]);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));

    if (id === "email") {
      setErrors((prev) => ({ ...prev, email: "" }));
      setEmailStatus(null);
    } else {
      setErrors((prev) => ({ ...prev, [id]: "" }));
    }
  };

  const handleSendotp = async () => {
    const trimmedEmail = formData.email.trim();

    if (!trimmedEmail) {
      setErrors((prev) => ({ ...prev, email: "Email is required" }));
      return;
    }

    if (!validator.isEmail(trimmedEmail)) {
      setErrors((prev) => ({ ...prev, email: "Invalid email format" }));
      return;
    }

    if (emailStatus === "taken") {
      return;
    }

    try {
      const result = await sendSignupOtp(trimmedEmail);
      if (result?.status >= 200) {
        setCooldown(60);
      }
    } catch (error) {
      console.error("Error sending OTP:", error);
    }
  };

  const validateForm = () => {
    // Create trimmed form data
    const trimmedData = {
      fullName: formData.fullName.trim(),
      email: formData.email.trim(),
      password: formData.password.trim(),
      otp: formData.otp.trim(),
    };

    let valid = true;
    let newErrors = {
      name: "",
      email: "",
      password: "",
      otp: "",
    };

    // Name validation
    if (!trimmedData.fullName) {
      newErrors.name = "Name is required";
      valid = false;
    } else if (!validator.isLength(trimmedData.fullName, { min: 3 })) {
      newErrors.name = "Name must be at least 3 characters";
      valid = false;
    }

    // Email validation
    if (!trimmedData.email) {
      newErrors.email = "Email is required";
      valid = false;
    } else if (!validator.isEmail(trimmedData.email)) {
      newErrors.email = "Invalid email format";
      valid = false;
    } else if (emailStatus === "taken") {
      newErrors.email = "Email is already registered";
      valid = false;
    }

    // Password validation
    if (!trimmedData.password) {
      newErrors.password = "Password is required";
      valid = false;
    } else if (validator.isEmpty(trimmedData.password)) {
      newErrors.password = "Password cannot be empty";
      valid = false;
    } else if (!validator.isLength(trimmedData.password, { min: 6 })) {
      newErrors.password = "Password must be at least 6 characters";
      valid = false;
    }

    // OTP validation
    if (!trimmedData.otp) {
      newErrors.otp = "OTP is required";
      valid = false;
    } else if (
      !validator.isNumeric(trimmedData.otp) ||
      !validator.isLength(trimmedData.otp, { min: 6, max: 6 })
    ) {
      newErrors.otp = "OTP must be 6 digits";
      valid = false;
    }

    setErrors(newErrors);
    return { valid, trimmedData };
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    const { valid, trimmedData } = validateForm();
    if (!valid) return;

    try {
      await signup(trimmedData);
      navigate("/");
    } catch (error) {
      console.error("Signup failed:", error);
    }
  };

  return (
    <>
      <Helmet>
        <title>Sign Up | NoteHub</title>
        <meta
          name="description"
          content="Create your NoteHub account to organize, write, and share notes with ease."
        />
        <meta property="og:title" content="Sign Up | NoteHub" />
        <meta
          property="og:description"
          content="Create your NoteHub account to organize, write, and share notes with ease."
        />
        <meta
          property="og:url"
          content="https://notehub-38kp.onrender.com/signup"
        />

        <meta name="twitter:title" content="Sign Up | NoteHub" />
        <meta
          name="twitter:description"
          content="Create your NoteHub account to organize, write, and share notes with ease."
        />
      </Helmet>

      <BaseHeader />
      <div className="flex p-4 pt-8 items-center justify-center bg-[#f5f5f5] dark:bg-background">
        <div className={cn("flex flex-col gap-2 max-w-[440px] w-full m-auto")}>
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Signup</CardTitle>
              <CardDescription>
                Fill this form to create an account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleFormSubmit}>
                <div className="flex flex-col gap-5">
                  {/* Name Field */}
                  <LabledInput
                    id="fullName"
                    label="Full Name"
                    type="text"
                    placeholder="Enter your full name"
                    value={formData.fullName}
                    onChange={handleChange}
                    disabled={isSigningUp}
                    error={errors.name}
                    inputClassName={errors.name && "ring-2 ring-red-500"}
                  />

                  {/* Email Field */}
                  <LabledInput
                    id="email"
                    label="Email Address"
                    type="email"
                    placeholder="Enter your email address"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={isSigningUp}
                    error={errors.email}
                    inputClassName={errors.email && "ring-2 ring-red-500"}
                    loading={isCheckingEmail}
                    rightElement={
                      !isCheckingEmail && emailStatus === "available" ? (
                        <Check className="size-4 text-green-500" />
                      ) : null
                    }
                  />

                  {/* Password Field */}
                  <LabledInput
                    id="password"
                    label="Password"
                    type="password"
                    placeholder="Create a secure password"
                    value={formData.password}
                    onChange={handleChange}
                    disabled={isSigningUp}
                    error={errors.password}
                    showPasswordToggle
                    inputClassName={errors.password && "ring-2 ring-red-500"}
                  />

                  {/* OTP Input */}
                  <div className="flex flex-col gap-1">
                    <div className="relative flex flex-col sm:flex-row items-center gap-4">
                      <InputOTP
                        maxLength={6}
                        id="otp"
                        value={formData.otp}
                        onChange={(value) =>
                          setFormData((prev) => ({ ...prev, otp: value }))
                        }
                        pattern={REGEXP_ONLY_DIGITS}
                        disabled={false}
                      >
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                        </InputOTPGroup>
                        <InputOTPSeparator />
                        <InputOTPGroup>
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                      <Button
                        variant="outline"
                        type="button"
                        onClick={handleSendotp}
                        disabled={
                          cooldown > 0 ||
                          isSendingOtp ||
                          emailStatus !== "available"
                        }
                      >
                        {isSendingOtp ? (
                          <Loader2 className="animate-spin mr-2 size-4" />
                        ) : cooldown > 0 ? (
                          cooldown
                        ) : (
                          "Send OTP"
                        )}
                      </Button>
                      {errors.otp && (
                        <p className="text-xs absolute left-0 -bottom-4 text-red-500">
                          {errors.otp}
                        </p>
                      )}
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 font-semibold rounded-xl"
                    disabled={isSigningUp || emailStatus === "taken"}
                  >
                    {isSigningUp ? (
                      <>
                        <Loader2 className="animate-spin mr-2 size-4" />
                        Creating Account...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </div>
              </form>
              <GoogleLoginButton
                className={"mt-4 h-12 font-semibold rounded-xl"}
              />
              <div className="mt-4 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link
                  to={"/login"}
                  className="underline font-semibold text-foreground"
                >
                  Login
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
    </>
  );
};

export default SignupPage;
