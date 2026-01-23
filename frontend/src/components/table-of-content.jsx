import React from "react";

const TableOfContent = ({ data = [] }) => {
  if (!data.length) return null;

  const STEP = 20;
  const stack = []; // Track parent levels

  return (
    <div>
      {data.map((item, index) => {
        // Remove stack items that are >= current level
        while (stack.length && stack[stack.length - 1] >= item.level) {
          stack.pop();
        }

        // Current depth = stack length
        const indentLevel = stack.length;

        // Push current level to stack
        stack.push(item.level);

        return (
          <div
            key={index}
            className="relative"
            style={{ paddingLeft: `${indentLevel * STEP + 8}px` }}
          >
            {/* Vertical lines for all ancestors */}
            {stack.slice(0, -1).map((lvl, i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0"
                style={{ left: `${i * STEP + 12}px` }}
              >
                <div className="w-px h-full bg-primary/10" />
              </div>
            ))}

            {/* Content */}
            <div className="relative z-10">
              <div
                className={`transition-colors ${
                  indentLevel === 0
                    ? "text-base font-semibold"
                    : "text-sm font-medium text-primary/70"
                }`}
              >
                {item.text}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TableOfContent;
