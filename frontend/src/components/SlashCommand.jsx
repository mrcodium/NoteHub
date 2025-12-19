import { Extension, ReactRenderer } from "@tiptap/react";
import Suggestion from "@tiptap/suggestion";
import SuggestionList from "./SuggestionList.jsx";
import tippy from "tippy.js";
import {
  CodeSquare,
  Heading1,
  Heading2,
  Heading3,
  Image,
  LinkIcon,
  List,
  ListOrdered,
  ListTodo,
  Minus,
  Pilcrow,
  Quote,
  Sigma,
  Table,
} from "lucide-react";
import { fuzzyFilter } from "@/lib/utils.js";

export const SlashCommand = Extension.create({
  name: "slashCommand",

  addOptions() {
    return {
      suggestion: {
        char: "/",
        items: ({ query }) => {
          // Filter suggestions based on the query
          const suggestions = [
            { icon: <Pilcrow />, label: "Paragraph", command: "setParagraph" },
            {
              icon: <Heading1 />,
              label: "Heading 1",
              command: "setHeading",
              props: { level: 1 },
              shortcut: "#",
            },
            {
              icon: <Heading2 />,
              label: "Heading 2",
              command: "setHeading",
              props: { level: 2 },
              shortcut: "##",
            },
            {
              icon: <Heading3 />,
              label: "Heading 3",
              command: "setHeading",
              props: { level: 3 },
              shortcut: "###",
            },
            {
              icon: <List />,
              label: "Bullet List",
              command: "toggleBulletList",
              shortcut: "-",
            },
            {
              icon: <ListOrdered />,
              label: "Numbered List",
              command: "toggleOrderedList",
              shortcut: "1.",
            },
            {
              icon: <ListTodo />,
              label: "Task List",
              command: "toggleTaskList",
              shortcut: "[]",
            },
            {
              icon: <Quote />,
              label: "Blockquote",
              command: "toggleBlockquote",
              shortcut: ">",
            },
            {
              icon: <CodeSquare />,
              label: "Code Block",
              command: "toggleCodeBlock",
              shortcut: "```",
            },
            { icon: <Table />, label: "Table", command: "insertTable" },
            {
              icon: <Minus />,
              label: "Horizontal Rule",
              command: "setHorizontalRule",
              shortcut: "---",
            },

            {
              icon: <LinkIcon />,
              label: "Link",
              command: "custom",
              dialog: "openLinkDialog",
            },
            {
              icon: <Image />,
              label: "Image",
              command: "custom",
              dialog: "openImageDialog",
            },
            {
              icon: <Sigma />,
              label: "Math Equation",
              command: "custom",
              dialog: "openMathDialog",
            },
          ];

          return fuzzyFilter(query, suggestions);
        },
        render: () => {
          let component;
          let popup;

          return {
            onStart: (props) => {
              component = new ReactRenderer(SuggestionList, {
                props: {
                  items: props.items,
                  command: props.command,
                  editor: props.editor,
                  range: props.range,
                },
                editor: props.editor,
              });

              if (!props.clientRect) {
                return;
              }

              popup = tippy("body", {
                getReferenceClientRect: props.clientRect,
                appendTo: document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: "manual",
                placement: "bottom-start",
              });
            },

            onUpdate: (props) => {
              component.updateProps({
                items: props.items,
                command: props.command,
                editor: props.editor,
                range: props.range,
              });

              if (props.items.length === 0) {
                // Hide the popup if there are no items
                popup[0].hide();
              } else {
                // Show the popup if there are items
                popup[0].show();
              }

              if (!props.clientRect) return;
              popup[0].setProps({
                getReferenceClientRect: props.clientRect,
              });
            },

            onKeyDown: (props) => {
              if (props.event.key === "Escape") {
                popup[0].hide();
                return true;
              }
              return component.ref?.onKeyDown(props.event);
            },

            onExit: () => {
              popup[0].destroy();
              component.destroy();
            },
          };
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});
