import { Color } from "@tiptap/extension-color";
import { TextStyleKit } from "@tiptap/extension-text-style";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import {
  BulletList,
  OrderedList,
  ListItem,
  TaskList,
  TaskItem,
  ListKeymap,
} from "@tiptap/extension-list";
import {
  Table,
  TableRow,
  TableCell,
  TableHeader,
} from "@tiptap/extension-table";
import { Placeholder } from "@tiptap/extensions";
import Image from "@tiptap/extension-image";
import { SlashCommand } from "@/components/SlashCommand";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { createLowlight } from "lowlight";
import { all } from "lowlight";
import CodeBlockComponent from "@/components/CodeBlockComponent";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { Extension } from "@tiptap/core";
import { Dropcursor, Gapcursor } from "@tiptap/extensions";
import Link from "@tiptap/extension-link";
import Math, { migrateMathStrings } from "@tiptap/extension-mathematics";

const lowlight = createLowlight(all);

const TabExtension = Extension.create({
  name: "tabHandler",

  addKeyboardShortcuts() {
    return {
      Tab: ({ editor }) => {
        // Allow default behavior in tables
        if (editor.isActive("table")) {
          return false; // Let the table extension handle it
        }

        // Only allow Tab in code blocks
        if (editor.isActive("codeBlock")) {
          return false; // Let CustomCodeBlock handle it
        }

        // Block Tab everywhere else
        return true;
      },

      "Shift-Tab": ({ editor }) => {
        // Allow default behavior in tables
        if (editor.isActive("table")) {
          return false; // Let the table extension handle it
        }

        // Only allow Shift-Tab in code blocks
        if (editor.isActive("codeBlock")) {
          return false; // Let CustomCodeBlock handle it
        }

        // Block Shift-Tab everywhere else
        return true;
      },
    };
  },
});

const AutoPairExtension = Extension.create({
  name: "autoPair",

  addKeyboardShortcuts() {
    const pairs = {
      "{": "}",
      "[": "]",
      "(": ")",
      '"': '"',
      "'": "'",
      "`": "`",
    };

    const shortcuts = {};

    Object.entries(pairs).forEach(([open, close]) => {
      shortcuts[open] = ({ editor }) => {
        // Only auto-pair in code blocks
        if (!editor.isActive("codeBlock")) {
          return false;
        }

        const { state } = editor;
        const { selection } = state;
        const { from, to, empty } = selection;

        if (!empty) return false;

        const text = open + close;
        editor.commands.insertContent(text);
        editor.commands.setTextSelection(from + 1);
        return true;
      };
    });

    return shortcuts;
  },
});

const CustomCodeBlock = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockComponent);
  },

  addKeyboardShortcuts() {
    return {
      Tab: () => {
        return this.editor.commands.insertContent("    "); // 4 spaces
      },
      "Shift-Tab": () => {
        // You can implement Shift-Tab behavior for code blocks here if needed
        return true;
      },
    };
  },
}).configure({ lowlight });

export const extensions = [
  Color.configure({ types: [TextStyleKit.name, ListItem.name] }),
  TextStyleKit.configure({ types: [ListItem.name] }),
  StarterKit.configure({
    bulletList: {
      keepMarks: true,
      keepAttributes: false,
    },
    orderedList: {
      keepMarks: true,
      keepAttributes: false,
    },
    codeBlock: false,
  }),
  CustomCodeBlock,
  Highlight.configure({ multicolor: true }),
  TextAlign.configure({
    types: ["heading", "paragraph"],
  }),
  Underline,
  ListKeymap,
  TaskList,
  TaskItem.configure({
    nested: true,
  }),
  Table.configure({
    resizable: true,
  }),
  TableRow,
  TableHeader,
  TableCell,
  Placeholder.configure({
    placeholder: "Type / for options",
  }),
  Image,
  // ...keep your existing imports and code above
  Math.configure({
    blockOptions: {
      onClick: (node, pos) => {
        // dispatch an event so the dialog can open and receive data
        window.dispatchEvent(
          new CustomEvent("open-math-dialog", {
            detail: { latex: node.attrs.latex, pos, mode: "block" },
          })
        );
      },
    },
    inlineOptions: {
      onClick: (node, pos) => {
        window.dispatchEvent(
          new CustomEvent("open-math-dialog", {
            detail: { latex: node.attrs.latex, pos, mode: "inline" },
          })
        );
      },
    },
  }),

  SlashCommand,
  TabExtension,
  AutoPairExtension,
  Dropcursor,
  Gapcursor,
  Link.configure({
    openOnClick: false,
    autolink: true,
    linkOnPaste: true,
    HTMLAttributes: {
      target: "_blank",
      rel: "noopener noreferrer",
    },
    validate: (href) => /^https?:\/\//.test(href),
  }),
];
