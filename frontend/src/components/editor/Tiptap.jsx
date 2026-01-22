import React, { useEffect, useState } from "react";
import { extensions } from "./config/extensions.config";
import { EditorProvider } from "@tiptap/react";
import { useParams } from "react-router-dom";
import { useNoteStore } from "@/stores/useNoteStore";
import NoteSkeleton from "../sekeletons/NoteSkeleton";
import { MenuBar } from "./MenuBar";
import { useImageStore } from "@/stores/useImageStore";
import { migrateMathStrings } from "@tiptap/extension-mathematics";
import { useEditorStore } from "@/stores/useEditorStore";

const Tiptap = () => {
  const { getNoteContent, status } = useNoteStore();
  const { getImages } = useImageStore();
  const { id: noteId } = useParams();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const { editorFontFamily } = useEditorStore();

  useEffect(() => {
    const fetchData = async () => {
      if (noteId) {
        const storedData = JSON.parse(localStorage.getItem("noteContent"));
        if (storedData && storedData.noteId === noteId) {
          setContent(storedData.content);
        } else {
          const note = await getNoteContent(noteId);
          if (note === null) {
            setNotFound(true);
          } else {
            setContent(note.content);
          }
        }
        setLoading(false);
      }
    };
    getImages();
    fetchData();
  }, [noteId, getNoteContent]);

  useEffect(() => {
    if (content) {
      const data = { noteId, content };
      localStorage.setItem("noteContent", JSON.stringify(data));
    }
  }, [content, noteId]);

  const handleUpdate = (newContent) => {
    setContent(newContent);
  };

  if (notFound) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <img
          src="/404-not-found.svg"
          className="p-4 rounded-lg max-w-[500px]"
        ></img>
      </div>
    );
  }

  if (status.noteContent.state === "loading" || loading) {
    return <NoteSkeleton />;
  }

  return (
    <EditorProvider
      className="h-full opacity-0"
      slotBefore={<MenuBar noteId={noteId} />}
      extensions={extensions}
      content={content}
      onUpdate={({ editor }) => handleUpdate(editor.getHTML())}
      onCreate={({ editor }) => {
        migrateMathStrings(editor);
      }}
      editorProps={{
        transformPastedHTML(html) {
          const doc = new DOMParser().parseFromString(html, "text/html");

          doc.querySelectorAll("[style]").forEach((el) => {
            el.style.removeProperty("font-family");
            el.style.removeProperty("font-size");
            el.style.removeProperty("line-height");

            if (!el.getAttribute("style")?.trim()) {
              el.removeAttribute("style");
            }
          });
          console.count("hello");
          return doc.body.innerHTML;
        },
        attributes: {
          class:
            "prose dark:prose-invert mx-auto prose-sm sm:prose-base lg:prose-lg xl:prose-2xl focus:outline-none min-h-full",
          style: `font-family: ${editorFontFamily}, serif;`,
          spellcheck: "false",
        },
      }}
    />
  );
};

export default Tiptap;
