import { Button } from "@/components/ui/button";
import { Copy, CopyCheck, Pencil, Lock } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import parse from "html-react-parser";
import NoteSkeleton from "@/components/sekeletons/NoteSkeleton";
import hljs from "highlight.js";
import { createRoot } from "react-dom/client";
import { toast } from "sonner";
import katex from "katex";
import "katex/dist/katex.min.css";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import TooltipWrapper from "@/components/TooltipWrapper";
import { axiosInstance } from "@/lib/axios";
import { useAuthStore } from "@/stores/useAuthStore";
import { useImageStore } from "@/stores/useImageStore";
import Footer from "@/components/Footer";

const NotePagePublic = () => {
  const { username, collectionSlug, noteSlug } = useParams();
  const navigate = useNavigate();
  const { authUser } = useAuthStore();

  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isPrivate, setIsPrivate] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [noteId, setNoteId] = useState("");
  const { getImages } = useImageStore();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const response = await axiosInstance.get(
          `/note/${username}/${collectionSlug}/${noteSlug}`
        );

        const { note } = response.data;
        setContent(note.content || "");
        setNoteId(note._id);
        setIsOwner(authUser?._id === note.userId);
      } catch (error) {
        if (error.response?.status === 403) {
          setIsPrivate(true);
        } else {
          console.error(error);
          toast.error("Failed to load note");
        }
      } finally {
        setIsLoading(false);
      }
    };

    getImages();
    fetchData();
  }, [username, collectionSlug, noteSlug, authUser]);

  useEffect(() => {
    if (content) {
      // Apply syntax highlighting
      document.querySelectorAll("pre code").forEach((block) => {
        hljs.highlightElement(block);
      });

      // Render KaTeX
      document
        .querySelectorAll('[data-type="inline-math"], [data-type="block-math"]')
        .forEach((element) => {
          try {
            const latex = element.getAttribute("data-latex");
            const isBlock = element.getAttribute("data-type") === "block-math";

            katex.render(latex, element, {
              displayMode: isBlock, // true for block, false for inline
              throwOnError: false,
            });
          } catch (error) {
            console.error("KaTeX render error:", error);
          }
        });

      // Add header with copy button to each pre tag
      document.querySelectorAll(".pre-wrapper").forEach((pre) => {
        if (!pre.querySelector(".pre-header")) {
          const codeElement = pre.querySelector("code");
          const languageClass = Array.from(codeElement?.classList || []).find(
            (cls) => cls.startsWith("language-")
          );
          const language = languageClass
            ? languageClass.replace("language-", "")
            : "unknown";

          const header = document.createElement("header");
          header.className =
            "pre-header bg-input/50 rounded-t-lg w-full flex items-center justify-between py-2 px-4";
          header.innerHTML = `<span>${language}</span>`;
          pre.insertBefore(header, pre.firstChild);

          const buttonContainer = document.createElement("div");
          header.appendChild(buttonContainer);

          const CopyButton = () => {
            const [copied, setCopied] = useState(false);

            const handleCopy = async () => {
              const codeContent = codeElement?.innerText || "";
              await navigator.clipboard.writeText(codeContent);
              toast.success("Content copied to clipboard!");
              setCopied(true);
              setTimeout(() => setCopied(false), 3000);
            };

            return (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopy}
                disabled={copied}
                className="gap-2 size-7"
              >
                {copied ? (
                  <CopyCheck className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            );
          };

          const root = createRoot(buttonContainer);
          root.render(<CopyButton />);
        }
      });

      // Add image click handlers
      const images = [...document.querySelectorAll(".tiptap img")];
      images.forEach((img) => {
        img.style.cursor = "pointer";
        img.addEventListener("click", () =>
          setSelectedImage(img.getAttribute("src") || "")
        );
      });

      return () => {
        images.forEach((img) => {
          img.removeEventListener("click", () => setSelectedImage(null));
        });
      };
    }
  }, [content]);

  if (isLoading) {
    return <NoteSkeleton />;
  }

  if (isPrivate) {
    return (
      <div className="w-full h-[80vh] flex flex-col items-center justify-center gap-4">
        <div className="bg-secondary p-6 rounded-full">
          <Lock className="h-12 w-12 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold">This note is private</h2>
        <p className="text-muted-foreground max-w-md text-center">
          The owner of this note has set it to private. You need permission to
          view it.
        </p>
        {authUser ? (
          <Button onClick={() => navigate("/")}>Browse your notes</Button>
        ) : (
          <Button onClick={() => navigate("/login")}>
            Sign in to view your notes
          </Button>
        )}
      </div>
    );
  }

  if (!content.trim()) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
        {isOwner && (
          <Button
            onClick={() => navigate(`/note/${note._id}/editor`)}
            variant="secondary"
            size="lg"
            className="shadow-md bottom-2 right-4 font-bold"
          >
            <Pencil /> Write
          </Button>
        )}
        <img
          className="size-[200px] mx-auto mt-4 grayscale-[100] opacity-50"
          src="/empty-note-state.svg"
          alt=""
        />
        <div>No content</div>
      </div>
    );
  }

  return (
    <div className={`tiptap ${!content.trim() ? "empty" : ""}`}>
      <div className="max-w-screen-md m-auto">
        <Dialog
          open={selectedImage}
          onOpenChange={(open) => !open && setSelectedImage(null)}
        >
          <DialogContent
            closeButtonClassName="top-2 left-2 right-auto bg-black md:size-6 flex items-center justify-center bg-neutral-200 text-neutral-600"
            className="p-0 border-none w-auto h-auto max-w-[100vw] max-h-[100vh] overflow-hidden sm:rounded-lg"
          >
            <DialogTitle className="hidden">Image Dialog</DialogTitle>
            <div className="flex items-center justify-center w-full h-full">
              {selectedImage && (
                <img
                  src={selectedImage}
                  alt="Preview"
                  className="object-contain w-auto h-auto max-w-[100vw] max-h-[100vh]"
                />
              )}
            </div>
          </DialogContent>
        </Dialog>

        {isOwner && (
          <TooltipWrapper message="Edit Content">
            <Button
              onClick={() => navigate(`/note/${noteId}/editor`)}
              variant="secondary"
              size="lg"
              className="fixed right-2 rounded-full bottom-2 z-10 px-6 border bg-muted"
            >
              <Pencil />
              <span>Edit</span>
            </Button>
          </TooltipWrapper>
        )}

        {parse(content)}
        <Footer />
      </div>
    </div>
  );
};

export default NotePagePublic;
