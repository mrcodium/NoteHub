import React, { useState, useRef } from "react";

// UI components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LabledInput } from "@/components/ui/labeled-input";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";

// Store
import { useAuthStore } from "@/stores/useAuthStore";
import UpdateEmailCard from "@/components/UpdateEmailCard";

const PersonalDetails = () => {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Personal Details</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
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
        </CardContent>
      </Card>
      <UpdateEmailCard />
    </div>
  );
};

function Field({ label, field, apiEndPoint }) {
  const { authUser, updateUserField } = useAuthStore();
  const [value, setValue] = useState(authUser[field] || "");
  const [valid, setValid] = useState(false);
  const inputRef = useRef(null);
  const [loading, setLoading] = useState(false);

  const isValid = (val) => {
    const trimmedValue = val.trim();
    if (!trimmedValue || trimmedValue === authUser[field]) {
      setValid(false);
      return false;
    }
    setValid(true);
    return true;
  };

  const handleiInputChange = (e) => {
    isValid(e.target.value);
    setValue(e.target.value);
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
        // onBlur={handleSave}
        onKeyDown={handleEnter}
        inputClassName="pr-12"
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

export default PersonalDetails;
