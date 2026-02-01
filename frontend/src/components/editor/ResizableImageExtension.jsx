import Image from "@tiptap/extension-image";
import { ReactNodeViewRenderer } from "@tiptap/react";
import ResizableImage from "./ResizableImage";

export const ResizableImageExtension = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),

      width: {
        default: "auto",
        parseHTML: element => element.getAttribute("data-width") || element.style.width || "auto",
        renderHTML: attributes => {
          if (!attributes.width) return {};
          return {
            "data-width": attributes.width,
            style: `width: ${attributes.width}; height: auto;`,
          };
        },
      },

      align: {
        default: "center",
        parseHTML: element => element.getAttribute("data-align") || "center",
        renderHTML: attributes => {
          if (!attributes.align) return {};
          return { "data-align": attributes.align };
        },
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImage);
  },
});
