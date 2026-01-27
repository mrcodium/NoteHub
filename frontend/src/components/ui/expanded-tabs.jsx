import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

const buttonVariants = {
  initial: {
    paddingLeft: ".7rem",
    paddingRight: ".7rem",
  },
  animate: (isSelected) => ({
    paddingLeft: isSelected ? "1rem" : ".7rem",
    paddingRight: isSelected ? "1rem" : ".7rem",
  }),
};

const spanVariants = {
  initial: { width: 0, opacity: 0 },
  animate: { width: "auto", opacity: 1 },
  exit: { width: 0, opacity: 0 },
};

const transition = { delay: 0.1, type: "spring", bounce: 0, duration: 0.6 };

export function ExpandedTabs({ tabs, className, activeColor = "", onChange }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [selected, setSelected] = React.useState(null);

  // keep selected in sync with active route
  React.useEffect(() => {
    const activeIndex = tabs.findIndex((tab) => {
      return location.pathname.startsWith(tab.path);
    });

    if (activeIndex !== -1) {
      setSelected(activeIndex);
      onChange?.(activeIndex);
    }
  }, [location.pathname, tabs, onChange]);

  const handleSelect = (index) => {
    const tab = tabs[index];
    if (!tab?.path) return;
    setSelected(index);
    onChange?.(index);
    navigate(tab.path); // ✅ navigate
  };

  const Separator = () => (
    <div className="h-[24px] w-[1.2px] bg-border" aria-hidden="true" />
  );
  const isMobile = useIsMobile();

  return (
    <div
      className={cn(
        "flex gap-2 rounded-xl w-max border bg-muted/30 p-1 shadow-sm",
        className,
      )}
    >
      {tabs.map((tab, index) => {
        if (tab.type === "separator") {
          return <Separator key={`separator-${index}`} />;
        }

        const Icon = tab.icon;
        return (
          <motion.button
            key={tab.label}
            variants={buttonVariants}
            initial={false}
            animate="animate"
            custom={selected === index}
            onClick={() => handleSelect(index)}
            transition={transition}
            className={cn(
              "relative flex gap-2 items-center rounded-xl px-4 py-2 text-sm font-medium transition-colors duration-300",
              selected === index
                ? cn("bg-primary/20", activeColor)
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon size={16} className="flex-shrink-0" />
            <AnimatePresence initial={false}>
              {(selected === index || !isMobile) && (
                <motion.span
                  variants={spanVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={transition}
                  className="overflow-hidden whitespace-nowrap"
                >
                  {tab.label}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        );
      })}
    </div>
  );
}
