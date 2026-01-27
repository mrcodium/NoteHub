import React, { useState, useRef } from "react";

// UI components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LabledInput } from "@/components/ui/labeled-input";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";

// Store
import { useAuthStore } from "@/stores/useAuthStore";
import UpdateEmailCard from "@/components/UpdateEmailCard";
import { Label } from "@/components/ui/label";

const Profile = () => {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Edit your name, username, and email.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8">
          <div className="space-y-2">
            <Label>Personal Detail</Label>
            <div className="space-y-4">
              <Field
                label="Full Name"
                field="fullName"
                apiEndPoint="user/update-fullname"
              />

              <Field
                label="Username"
                field="userName"
                apiEndPoint="user/update-username"
              />
            </div>
          </div>
          <UpdateEmailCard />
        </CardContent>
      </Card>
    </div>
  );
};

function Field({ label, field, apiEndPoint }) {
  const { authUser, updateUserField } = useAuthStore();
  const [value, setValue] = useState(authUser[field] || "");
  const [valid, setValid] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);
  const [loading, setLoading] = useState(false);

  const validateUsername = (val) => {
    const v = val.trim();

    if (!v) {
      setError("Username is required.");
      return false;
    }

    if (/[A-Z]/.test(v)) {
      setError("Only lowercase letters are allowed.");
      return false;
    }

    if (!/^[a-z0-9-]+$/.test(v)) {
      setError("Only letters, numbers, and hyphens are allowed.");
      return false;
    }

    if (v.startsWith("-")) {
      setError("Username cannot start with a hyphen.");
      return false;
    }

    if (v.endsWith("-")) {
      setError("Username cannot end with a hyphen.");
      return false;
    }

    if (v.includes("--")) {
      setError("Consecutive hyphens are not allowed.");
      return false;
    }

    if (v.length > 39) {
      setError("Username cannot be longer than 39 characters.");
      return false;
    }

    setError("");
    return true;
  };

  const isValid = (val) => {
    const trimmedValue = val.trim();

    if (!trimmedValue || trimmedValue === authUser[field]) {
      setValid(false);
      setError("");
      return false;
    }

    if (field === "userName" && !validateUsername(trimmedValue)) {
      setValid(false);
      return false;
    }

    setValid(true);
    return true;
  };

  const handleiInputChange = (e) => {
    setValue(e.target.value);
    isValid(e.target.value);
  };

  const handleSave = async () => {
    if (!isValid(value)) {
      setValue(authUser[field]);
      return;
    }

    setLoading(true);
    const data = { [field]: value.trim() };
    const result = await updateUserField(apiEndPoint, data);

    if (!result) {
      setValue(authUser[field]);
    }

    setLoading(false);
    setValid(false);
  };

  const handleEnter = (e) => {
    if (e.key === "Enter") {
      handleSave();
      e.preventDefault();
      inputRef.current?.blur();
    }
  };

  return (
    <div className="relative">
      <LabledInput
        ref={inputRef}
        id={field}
        label={label}
        type="text"
        placeholder={`Enter ${label.toLowerCase()}`}
        value={value}
        onChange={handleiInputChange}
        onKeyDown={handleEnter}
        inputClassName="pr-12"
        error={error} // 👈 no UI change, just passes message
      />

      {valid && (
        <Button
          disabled={loading}
          variant="ghost"
          size="icon"
          onClick={handleSave}
          className="absolute right-2 top-1/2 -translate-y-1/2"
        >
          {loading ? <Loader2 className="animate-spin" /> : <Check />}
        </Button>
      )}
    </div>
  );
}

export default Profile;
