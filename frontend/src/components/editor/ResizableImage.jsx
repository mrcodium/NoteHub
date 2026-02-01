import { NodeViewWrapper } from "@tiptap/react";
import React, { useRef, useState } from "react";

export default function ResizableImage({ node, updateAttributes }) {
  const imgRef = useRef(null);
  const [isResizing, setIsResizing] = useState(false);

  const startResize = (e, direction) => {
    e.preventDefault();
    setIsResizing(true);
    e.currentTarget.setPointerCapture(e.pointerId);

    const startX = e.clientX;
    const startWidth = imgRef.current.offsetWidth;

    const onPointerMove = (event) => {
      let deltaX = event.clientX - startX;
      if (direction === "left") deltaX = -deltaX;

      const newWidth = Math.max(120, startWidth + deltaX);
      updateAttributes({ width: `${newWidth}px` });
    };

    const onPointerUp = () => {
      setIsResizing(false);
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
    };

    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
  };

  return (
    <NodeViewWrapper contentEditable={false} className="node-image flex w-full">
      {/* NEW inner wrapper for alignment */}
      <div
        className={`image-wrapper ${isResizing ? "resizing" : ""}`}
        data-align={node.attrs.align || "left"}
      >
        <img
          ref={imgRef}
          src={node.attrs.src}
          draggable={false}
          style={{
            width: node.attrs.width,
            height: "auto",
            maxWidth: "100%",
            display: "block",
          }}
        />

        {/* Left handle */}
        <span
          className="resize-handle left-2"
          onPointerDown={(e) => startResize(e, "left")}
        />

        {/* Right handle */}
        <span
          className="resize-handle right-2"
          onPointerDown={(e) => startResize(e, "right")}
        />
      </div>
    </NodeViewWrapper>
  );
}
