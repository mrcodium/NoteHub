import React, { useEffect, useMemo, useState } from "react";
import { EditorProvider } from "@tiptap/react";
import { useParams } from "react-router-dom";
import debounce from "lodash/debounce";

import { extensions } from "./config/extensions.config";
import { useNoteStore } from "@/stores/useNoteStore";
import { useDraftStore } from "@/stores/useDraftStore";
import { useImageStore } from "@/stores/useImageStore";
import { useEditorStore } from "@/stores/useEditorStore";

import NoteSkeleton from "../sekeletons/NoteSkeleton";
import { MenuBar } from "./MenuBar";
import { migrateMathStrings } from "@tiptap/extension-mathematics";

const Tiptap = () => {
  const { id: noteId } = useParams();

  const { getNoteContent, status } = useNoteStore();
  const { getDraft, setDraft } = useDraftStore();
  const { getImages } = useImageStore();
  const { editorFontFamily } = useEditorStore();

  // Keep note as an object with `content` and `name`
  const [note, setNote] = useState({ content: "", name: "" });
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Debounced draft save
  const saveDraft = useMemo(
    () =>
      debounce((noteObj) => {
        // Save the entire note object, not just content/name
        setDraft(noteId, noteObj);
      }, 400),
    [noteId],
  );

  useEffect(() => {
    const fetchData = async () => {
      if (!noteId) return;

      // 1️⃣ Try draft first
      const draft = getDraft(noteId);
      if (draft) {
        setNote(draft); // draft is full object now
        setLoading(false);
        return;
      }

      // 2️⃣ Fallback to server
      const serverNote = await getNoteContent(noteId);
      console.log(serverNote);
      if (!serverNote) {
        setNotFound(true);
      } else {
        setNote(serverNote); // keep full object
      }
      setLoading(false);
    };

    getImages();
    fetchData();
  }, [noteId, getNoteContent, getDraft]);

  const handleUpdate = (html) => {
    const updatedNote = {
      ...note,
      content: html,
      updatedAt: Date.now(), // or new Date().toISOString()
    };

    setNote(updatedNote);
    saveDraft(updatedNote);
  };

  if (notFound) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <img
          src="/404-not-found.svg"
          className="p-4 rounded-lg max-w-[500px]"
        />
      </div>
    );
  }

  if (loading || status.noteContent.state === "loading") {
    return <NoteSkeleton />;
  }

  return (
    <EditorProvider
      className="h-full"
      slotBefore={<MenuBar noteId={noteId} />}
      extensions={extensions}
      content={note.content}
      onCreate={({ editor }) => migrateMathStrings(editor)}
      onUpdate={({ editor }) => handleUpdate(editor.getHTML())}
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
