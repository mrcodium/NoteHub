import React, { useCallback, useEffect, useMemo, useState } from "react";
import { EditorProvider } from "@tiptap/react";
import { useParams } from "react-router-dom";

import { extensions } from "./config/extensions.config";
import { useNoteStore } from "@/stores/useNoteStore";
import { useDraftStore } from "@/stores/useDraftStore";
import { useImageStore } from "@/stores/useImageStore";
import { useEditorStore } from "@/stores/useEditorStore";

import NoteSkeleton from "../sekeletons/NoteSkeleton";
import { MenuBar } from "./MenuBar";
import { migrateMathStrings } from "@tiptap/extension-mathematics";
import { useDebounceCallback } from "@/hooks/useDebounceCallback";

const Tiptap = () => {
  const { id: noteId } = useParams();

  const { getNoteContent, status } = useNoteStore();
  const { getDraft, setDraft } = useDraftStore();
  const { getImages } = useImageStore();
  const { editorFontFamily } = useEditorStore();

  const [note, setNote] = useState({ content: "", name: "" });
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // ✅ Stable reference
  const saveDraftCallback = useCallback(
    (noteObj) => {
      if (!noteId) return;
      setDraft(noteId, noteObj);
    },
    [noteId, setDraft],
  );

  const saveDraft = useDebounceCallback(saveDraftCallback, 400);

  useEffect(() => {
    const fetchData = async () => {
      if (!noteId) return;

      setLoading(true);
      setNotFound(false);

      const draft = getDraft(noteId);
      if (draft) {
        setNote(draft);
        setLoading(false);
        return;
      }

      const serverNote = await getNoteContent(noteId);
      if (!serverNote) {
        setNotFound(true);
      } else {
        setNote(serverNote);
      }
      setLoading(false);
    };

    getImages();
    fetchData();

    return () => {
      saveDraft.cancel();
    };
  }, [noteId, getNoteContent, getDraft, getImages]);

  // ✅ BEST SOLUTION: Use functional state update
  const handleUpdate = useCallback((html) => {
    setNote((prevNote) => {
      const updatedNote = {
        ...prevNote,
        content: html,
        updatedAt: Date.now(),
      };
      saveDraft(updatedNote);
      return updatedNote;
    });
  }, []);

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
