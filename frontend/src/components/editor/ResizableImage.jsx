import { NodeViewWrapper } from "@tiptap/react";
import React, { useRef } from "react";

export default function ResizableImage({ node, updateAttributes }) {
  const imgRef = useRef(null);

  const startResize = (e, direction) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);

    const startX = e.clientX;
    const startWidth = imgRef.current.offsetWidth;

    const onPointerMove = (event) => {
      let deltaX = event.clientX - startX;
      if (direction === "left") deltaX = -deltaX;

      let newWidth = startWidth + deltaX;
      if (newWidth < 120) newWidth = 120;

      updateAttributes({
        width: `${newWidth}px`,
        height: "auto",
      });
    };

    const onPointerUp = () => {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
    };

    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
  };

  return (
    <NodeViewWrapper
      className="node-image relative"
      contentEditable={false}
    >
      <img
        ref={imgRef}
        src={node.attrs.src}
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
        style={{
          width: node.attrs.width,
          height: "auto",
          maxWidth: "100%",
          display: "block",
          userSelect: "none",
          WebkitUserSelect: "none",
          WebkitTouchCallout: "none",
          touchAction: "none",
        }}
      />

      {/* Left handle */}
      <span
        onPointerDown={(e) => startResize(e, "left")}
        className="resize-handle left-2"
      />

      {/* Right handle */}
      <span
        onPointerDown={(e) => startResize(e, "right")}
        className="resize-handle right-2"
      />
    </NodeViewWrapper>
  );
}