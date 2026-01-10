import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const TableOfContent = ({className}) => {
  const [anchors, setAnchors] = useState([]);

  useEffect(() => {
    const handler = (e) => setAnchors(e.detail);
    window.addEventListener("toc-update", handler);
    return () => window.removeEventListener("toc-update", handler);
  }, []);

  return (
    <div className={cn("sticky top-24 space-y-2 text-sm border", className)}>
      {anchors.map((a) => (
        <div
          key={a.id}
          onClick={() => a.dom.scrollIntoView({ behavior: "smooth" })}
          className={cn(
            "cursor-pointer text-muted-foreground hover:text-primary",
            a.isActive && "text-primary font-semibold"
          )}
          style={{ paddingLeft: a.level * 12 }}
        >
          {a.textContent}
        </div>
      ))}
    </div>
  );
};

export default TableOfContent;
