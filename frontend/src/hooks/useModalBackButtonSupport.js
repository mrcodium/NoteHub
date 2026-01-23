import * as React from "react";

export function useModalBackButtonSupport(open, onOpenChange, label = "Modal") {
  const wasOpenRef = React.useRef(false);

  React.useEffect(() => {
    if (open && !wasOpenRef.current) {
      console.log(`[${label}] Opening → pushing history`);
      if (!history.state?.modal) {
        history.pushState({ modal: true }, "", location.href);
      }

      const handlePopState = (e) => {
        console.log(`[${label}] popstate triggered → closing modal`, e.state);
        wasOpenRef.current = false;
        onOpenChange(false);
      };

      window.addEventListener("popstate", handlePopState);
      wasOpenRef.current = true;

      return () => {
        window.removeEventListener("popstate", handlePopState);
        if (wasOpenRef.current) {
          console.log(`[${label}] Closing programmatically`);
          wasOpenRef.current = false;
        }
      };
    } else if (!open && wasOpenRef.current) {
      console.log(`[${label}] Closing programmatically`);
      wasOpenRef.current = false;
    }
  }, [open, onOpenChange, label]);

  // Return same API as your current hook
  return { open, onOpenChange };
}
