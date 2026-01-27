// src/pages/Security.tsx
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {  Loader2,  } from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LabledInput } from "@/components/ui/labeled-input";
import { Link } from "react-router-dom";
import { Label } from "@/components/ui/label";

const Security = () => {
  const { updatePassword, isResettingPassword } = useAuthStore();

  return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Security Settings</CardTitle>
          <CardDescription>
            Change your password and security settings.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8">
          <PasswordUpdateSection
            updatePassword={updatePassword}
            isResettingPassword={isResettingPassword}
          />
        </CardContent>
      </Card>
  );
};

function PasswordUpdateSection({ updatePassword, isResettingPassword }) {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [errors, setErrors] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const validatePassword = (password) => {
    return password.length >= 6;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Reset errors
    setErrors({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });

    // Validate inputs
    let isValid = true;
    const newErrors = {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    };

    if (!currentPassword) {
      newErrors.currentPassword = "Current password is required";
      isValid = false;
    }

    if (!validatePassword(newPassword)) {
      newErrors.newPassword = "Password must be at least 6 characters";
      isValid = false;
    }

    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
      isValid = false;
    }

    setErrors(newErrors);

    if (!isValid) return;

    await updatePassword({
      currentPassword,
      newPassword,
    });
    // Clear form on success
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="space-y-2">
      <Label>Change Password</Label>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Current Password */}
        <LabledInput
          id="currentPassword"
          label="Current Password"
          placeholder="Enter password"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          disabled={isResettingPassword}
          error={errors.currentPassword}
          showPasswordToggle
          inputClassName={errors.currentPassword && "ring-2 ring-red-500"}
        />

        {/* New Password */}
        <LabledInput
          id="newPassword"
          label="New Password"
          placeholder="Enter password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          disabled={isResettingPassword}
          error={errors.newPassword}
          showPasswordToggle
          inputClassName={errors.newPassword && "ring-2 ring-red-500"}
        />

        {/* Confirm New Password */}
        <LabledInput
          id="confirmPassword"
          label="Confirm New Password"
          placeholder="Enter password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={isResettingPassword}
          error={errors.confirmPassword}
          showPasswordToggle
          inputClassName={errors.confirmPassword && "ring-2 ring-red-500"}
        />

        <div className="flex justify-between items-center">
          <Link
            to="/forgot-password"
            className="text-sm text-muted-foreground hover:text-foreground underline-offset-2 hover:underline whitespace-nowrap"
          >
            Forgot your password?
          </Link>
          <Button type="submit" disabled={isResettingPassword}>
            {isResettingPassword ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              "Update Password"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default Security;
