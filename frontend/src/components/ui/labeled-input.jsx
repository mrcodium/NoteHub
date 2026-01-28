import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const LabledInput = React.forwardRef(
  (
    {
      id,
      label,
      type = "text",
      placeholder,
      value,
      onChange,
      disabled = false,
      error,
      showPasswordToggle = false,
      loading = false,
      className,
      inputClassName,
      labelClassName,
      rightElement,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);

    const inputType = showPasswordToggle
      ? showPassword
        ? "text"
        : "password"
      : type;

    return (
      <div className={cn("grid items-center gap-1", className)}>
        <div className="relative">
          <Label
            htmlFor={id}
            className={cn(
              "text-muted-foreground text-sm font-normal top-2 left-3 absolute",
              labelClassName
            )}
          >
            {label}
          </Label>
          <Input
            ref={ref}
            id={id}
            type={inputType}
            placeholder={placeholder}
            className={cn(
              "pt-7 text-base h-auto rounded-lg transition-all",
              showPasswordToggle || rightElement ? "pr-12" : "",
              inputClassName,
              !placeholder && !value && "pt-3 focus-visible:pt-7"
            )}
            value={value}
            onChange={onChange}
            disabled={disabled}
            {...props}
          />
          {loading && (
            <Loader2 className="absolute top-[50%] right-3 size-4 animate-spin text-muted-foreground" />
          )}
          {showPasswordToggle && !loading && (
            <Button
              type="button"
              variant="ghost"
              className="p-1 text-muted-foreground hover:text-foreground h-full hover:bg-transparent aspect-square absolute top-[50%] translate-y-[-50%] right-0"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
            >
              {showPassword ? (
                <Eye className="size-4" />
              ) : (
                <EyeOff className="size-4" />
              )}
            </Button>
          )}
          {rightElement && !loading && !showPasswordToggle && (
            <div className="absolute top-[50%] translate-y-[-50%] right-3">
              {rightElement}
            </div>
          )}
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    );
  }
);

LabledInput.displayName = "LabledInput";