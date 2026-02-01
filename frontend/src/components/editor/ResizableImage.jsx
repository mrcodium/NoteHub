import { NodeViewWrapper } from "@tiptap/react";
import React, { useRef, useState } from "react";

export default function ResizableImage({ node, updateAttributes }) {
  const imgRef = useRef(null);
  const [aspectRatio, setAspectRatio] = useState(null);

   
   const startResize = (e, direction) => {
  e.preventDefault();

  const startX = e.clientX;
  const startWidth = imgRef.current.offsetWidth;

  const onPointerMove = (event) => {
    let deltaX = event.clientX - startX;
    if (direction === "left") deltaX = -deltaX;

    let newWidth = startWidth + deltaX;
    if (newWidth < 120) newWidth = 120;

    updateAttributes({
      width: newWidth + "px",
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
      data-align={node.attrs.align}
      contentEditable={false}
    >
      <img
        ref={imgRef}
        src={node.attrs.src}
        style={{
          width: node.attrs.width, // controlled by resize
          height: "auto", // always auto
          maxWidth: "100%", // responsive
          display: "block",
        }}
        draggable={false}
      />

      <span
  onPointerDown={(e) => startResize(e, "left")}
  className="resize-handle left-2"
/>

<span
  onPointerDown={(e) => startResize(e, "right")}
  className="resize-handle right-2"
/>
    </NodeViewWrapper>
  );
}
