import React from "react";

const TableOfContent = ({ data = [] }) => {
  if (!data.length) return null;

  // 🔑 Normalize hierarchy (important fix)
  const baseLevel = Math.min(...data.map((d) => d.level));
  const STEP = 20;

  const getIndentLines = (level) => {
    const lines = [];

    for (let l = baseLevel + 1; l <= level; l++) {
      const visualLevel = l - baseLevel - 1;

      lines.push(
        <div
          key={l}
          className="absolute top-0 bottom-0"
          style={{ left: `${visualLevel * STEP + 12}px` }}
        >
          <div className="w-px h-full bg-primary/10" />
        </div>,
      );
    }

    return lines;
  };

  return (
    <div>
      {data.map((item, index) => {
        const indentLevel = item.level - baseLevel;

        return (
          <div
            key={index}
            className="relative"
            style={{ paddingLeft: `${indentLevel * STEP + 8}px` }}
          >
            {/* Vertical hierarchy lines */}
            {indentLevel > 0 && getIndentLines(item.level, index)}

            {/* Horizontal connector */}
            {/* {indentLevel > 0 && (
              <div
                className="absolute top-1/2 h-px w-3 bg-primary/0"
                style={{ left: `${(indentLevel - 1) * STEP + 12}px` }}
              />
            )} */}

            {/* Content */}
            <div className="relative z-10 cursor-pointer">
              <div
                className={`
                  transition-colors
                  ${
                    indentLevel === 0
                      ? "text-base font-semibold"
                      : indentLevel === 1
                        ? "text-sm font-medium text-primary/70"
                        : indentLevel === 2
                          ? "text-sm text-primary/50"
                          : "text-sm text-primary/40"
                  }
                `}
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
