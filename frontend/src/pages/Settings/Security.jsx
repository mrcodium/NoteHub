// src/pages/Security.tsx
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Lock, Loader2, AlertCircle, Globe } from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { axiosInstance } from "@/lib/axios";
import { formatDeviceInfo, formatLocation } from "@/lib/utils";
import { Link } from "react-router-dom";
import { LabledInput } from "@/components/ui/labeled-input";

const Security = () => {
  const { authUser, updatePassword, isResettingPassword } = useAuthStore();

  return (
    <div className="container mx-auto">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Security Settings</CardTitle>
          <CardDescription>
            Manage your account security settings and sessions
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8">
          <PasswordUpdateSection
            updatePassword={updatePassword}
            isResettingPassword={isResettingPassword}
          />
          <AuthenticationSection user={authUser} />
          <SessionSection user={authUser} />
          <DangerSection />
        </CardContent>
      </Card>
    </div>
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
    <div className="space-y-6">
      <h4 className="font-medium">Change Password</h4>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Current Password */}
        <LabledInput
          id="currentPassword"
          label="Current Password"
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

function AuthenticationSection({ user }) {
  return (
    <div className="space-y-4">
      <h4 className="font-medium">Authentication</h4>
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div className="space-y-1">
          <Label>Two-Factor Authentication</Label>
          <p className="text-sm text-muted-foreground">
            Add an extra layer of security to your account
          </p>
        </div>
        <Switch checked={false} />
      </div>
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div className="space-y-1">
          <Label>Email Verification</Label>
          <p className="text-sm text-muted-foreground">
            Verify your email address
          </p>
        </div>
        <Badge variant="default">Verified</Badge>
      </div>
      {user?.hasGoogleAuth && (
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-1">
            <Label>Google Authentication</Label>
            <p className="text-sm text-muted-foreground">
              Connected to Google account
            </p>
          </div>
          <Badge variant="default">Active</Badge>
        </div>
      )}
    </div>
  );
}

function SessionSection({ user }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState({
    sessions: false,
    loginHistory: false,
    logoutAll: false,
  });
  const [error, setError] = useState({
    sessions: null,
    loginHistory: null,
  });

  const handleLogoutAll = async () => {
    try {
      setLoading((prev) => ({ ...prev, logoutAll: true }));
      const response = await axiosInstance.post("/auth/logout-all", {
        userId: user?._id,
      });
      console.log(response);
      await fetchSessions();
    } catch (err) {
      console.error("Failed to logout all sessions:", err);
    } finally {
      setLoading((prev) => ({ ...prev, logoutAll: false }));
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading((prev) => ({ ...prev, sessions: true }));
      setError((prev) => ({ ...prev, sessions: null }));
      const response = await axiosInstance.get(
        `/auth/sessions?userId=${user?._id}`
      );
      setSessions(response.data);
    } catch (err) {
      setError((prev) => ({
        ...prev,
        sessions: err instanceof Error ? err.message : "Unknown error",
      }));
    } finally {
      setLoading((prev) => ({ ...prev, sessions: false }));
    }
  };

  return (
    <div className="space-y-4">
      <h4 className="font-medium">Sessions</h4>
      {loading.sessions ? (
        <div className="flex justify-center py-4">
          <p>Loading sessions...</p>
        </div>
      ) : error.sessions ? (
        <div className="text-red-500 p-4 border rounded-lg">
          Error loading sessions: {error.sessions}
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {sessions
              .filter((s) => s.isActive)
              .map((session) => (
                <div key={session.id} className="bg-input/30 p-4 rounded-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Globe className="h-5 w-5" />
                      <div>
                        <p className="font-medium">
                          {session.logoutTime
                            ? "Past Session"
                            : "Current Session"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDeviceInfo(session.device)}
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      Logout
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
                    <div className="space-y-1">
                      <p className="text-muted-foreground">IP Address</p>
                      <p>{session.ipAddress}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Location</p>
                      <p>{formatLocation(session.location)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Last Active</p>
                      <p>{new Date(session.loginTime).toLocaleTimeString()}</p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
          <Button
            variant="outline"
            onClick={handleLogoutAll}
            disabled={loading.logout || sessions?.length === 0}
          >
            {loading.logout ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Logging out...
              </>
            ) : (
              "Logout All Sessions"
            )}
          </Button>
        </>
      )}
    </div>
  );
}

function DangerSection() {
  return (
    <div className="space-y-4">
      <h4 className="font-medium">Danger Zone</h4>
      <div className="border rounded-lg p-4 bg-muted">
        <div className="flex items-center justify-between">
          <div>
            <h5 className="font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Delete Account
            </h5>
            <p className="text-sm text-muted-foreground">
              Permanently delete this user account
            </p>
          </div>
          <Button variant="destructive">Delete Account</Button>
        </div>
      </div>
    </div>
  );
}

export default Security;
