import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import validator from "validator";
import debounce from "lodash/debounce";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LabledInput } from "@/components/ui/labeled-input";

import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";

import { REGEXP_ONLY_DIGITS } from "input-otp";
import { Loader2 } from "lucide-react";

import { useAuthStore } from "@/stores/useAuthStore";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Label } from "./ui/label";

const UpdateEmailCard = () => {
  const {
    requestEmailUpdateOtp,
    confirmEmailUpdate,
    isEmailAvailable,
    isSendingOtp,
    isUpdatingEmail,
    authUser,
  } = useAuthStore();

  const [newEmail, setNewEmail] = useState("");
  const [otp, setOtp] = useState("");

  const [emailError, setEmailError] = useState("");
  const [emailStatus, setEmailStatus] = useState(null); // "available" | "taken"
  const [checkingEmail, setCheckingEmail] = useState(false);

  const [cooldown, setCooldown] = useState(0);

  /* ------------------ Debounced email check ------------------ */
  const debouncedCheckEmail = useMemo(
    () =>
      debounce(async (email) => {
        const trimmedEmail = email.trim();

        if (!validator.isEmail(trimmedEmail)) {
          setEmailStatus(null);
          setEmailError("Invalid email format");
          setCheckingEmail(false);
          return;
        }

        try {
          const available = await isEmailAvailable(trimmedEmail);
          setEmailStatus(available ? "available" : "taken");
          setEmailError(available ? "" : "Email already in use");
        } catch {
          setEmailStatus(null);
        } finally {
          setCheckingEmail(false);
        }
      }, 500),
    [isEmailAvailable],
  );

  useEffect(() => {
    if (!newEmail) {
      setEmailStatus(null);
      setEmailError("");
      return;
    }

    setCheckingEmail(true);
    setEmailStatus(null);
    setEmailError("");

    debouncedCheckEmail(newEmail);

    return () => debouncedCheckEmail.cancel();
  }, [newEmail, debouncedCheckEmail]);

  /* ------------------ OTP cooldown ------------------ */
  useEffect(() => {
    if (!cooldown) return;
    const interval = setInterval(() => {
      setCooldown((c) => c - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  /* ------------------ Handlers ------------------ */
  const handleSendOtp = async () => {
    if (emailStatus !== "available") return;
    const res = await requestEmailUpdateOtp(newEmail);
    if (res) setCooldown(60);
  };

  const handleConfirmEmail = async () => {
    if (otp.length !== 6) return;
    const res = await confirmEmailUpdate({ email: newEmail, otp });
    // clean up the state

    setNewEmail("");
    setOtp("");
    setEmailError("");
    setEmailStatus(null);
    setCheckingEmail(false);
    setCooldown(0);
  };

  return (
    <div className="space-y-2">
      <Label>Personal Detail</Label>
      <div className="space-y-4">
        <div className="flex gap-2 bg-accent/50 p-2 rounded-xl items-center">
          <Avatar className="size-10">
            <AvatarImage
              className="w-full h-full object-cover rounded-full"
              src={authUser.avatar}
              alt={authUser.name}
              referrerPolicy="no-referrer"
            />
            <AvatarFallback className="bg-transparent">
              <img src="./avatar.svg" alt="" />
            </AvatarFallback>
          </Avatar>
          <div className="text-sm">
            <strong className="font-semibold">{authUser.fullName}</strong>
            <p className="text-muted-foreground text-xs">{authUser.email}</p>
          </div>
        </div>

        <LabledInput
          label="New Email"
          placeholder="you@example.com"
          inputClassName={cn(
            emailStatus === "available" &&
              "focus-visible:ring-green-500 border-green-500/50 bg-green-500/5",
            emailStatus === "taken" &&
              "focus-visible:ring-destructive border-destructive/50 bg-destructive/5",
          )}
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          error={emailError}
          disabled={isUpdatingEmail}
        />

        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <InputOTP
            maxLength={6}
            value={otp}
            onChange={setOtp}
            pattern={REGEXP_ONLY_DIGITS}
            disabled={isUpdatingEmail}
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
            onClick={handleSendOtp}
            disabled={
              emailStatus !== "available" ||
              cooldown > 0 ||
              isSendingOtp ||
              checkingEmail
            }
          >
            {isSendingOtp ? (
              <Loader2 className="animate-spin size-4" />
            ) : cooldown > 0 ? (
              cooldown
            ) : (
              "Get OTP"
            )}
          </Button>
        </div>

        <Button
          className="h-12 font-semibold rounded-xl"
          onClick={handleConfirmEmail}
          disabled={isUpdatingEmail || otp.length !== 6}
        >
          {isUpdatingEmail ? (
            <>
              <Loader2 className="animate-spin mr-2 size-4" />
              Updating...
            </>
          ) : (
            "Update Email"
          )}
        </Button>
      </div>
    </div>
  );
};

export default UpdateEmailCard;
