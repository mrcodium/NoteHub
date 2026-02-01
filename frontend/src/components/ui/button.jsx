import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";
import TooltipWrapper from "../TooltipWrapper";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow md:hover:bg-primary/90 active:bg-primary/80",
        destructive:
          "bg-destructive text-white shadow-sm md:hover:bg-destructive/90 active:bg-destructive/80",
        outline:
          "border border-input bg-background shadow-sm md:hover:bg-accent md:hover:text-accent-foreground active:bg-accent/50",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm md:hover:bg-secondary/80 active:bg-secondary/70",
        ghost:
          "md:hover:bg-accent md:hover:text-accent-foreground active:bg-accent/50",
        link:
          "text-primary underline-offset-4 md:hover:underline active:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);


const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, tooltip, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const btn = (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
        aria-label="button"
      />
    );
    return tooltip ? <TooltipWrapper message={tooltip}>{btn}</TooltipWrapper> : btn;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
