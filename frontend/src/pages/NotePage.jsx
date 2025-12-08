import { Button } from "@/components/ui/button";
import { useNoteStore } from "@/stores/useNoteStore";
import { Copy, CopyCheck, Pencil } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import parse from "html-react-parser";
import NoteSkeleton from "@/components/sekeletons/NoteSkeleton";
import { useNavigate } from "react-router-dom";
import hljs from "highlight.js";
import { createRoot } from "react-dom/client";
import { toast } from "sonner";
import katex from "katex";
import "katex/dist/katex.min.css";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import TooltipWrapper from "@/components/TooltipWrapper";
import Footer from "@/components/Footer";

const NotePage = () => {
  const { id } = useParams();
  const { getNoteContent, isContentLoading, noteNotFound, setNoteNotFound } =
    useNoteStore();
  const [content, setContent] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      if (id) {
        let noteContent = await getNoteContent(id);
        setContent(noteContent || "");
      }
    };

    fetchData();
  }, [id, getNoteContent]);

  useEffect(() => {
    if (content) {
      // Apply syntax highlighting
      document.querySelectorAll("pre code").forEach((block) => {
        hljs.highlightElement(block);
      });

      // Render KaTeX
      document.querySelectorAll("span[data-latex]").forEach((element) => {
        try {
          const latex = element.getAttribute("data-latex");
          const isBlock = element.getAttribute("data-display") === "yes";
          katex.render(latex, element, {
            displayMode: isBlock,
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
          const languageClass = Array.from(codeElement.classList).find((cls) =>
            cls.startsWith("language-")
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
              const codeContent = codeElement.innerText;
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
        img.addEventListener("click", () => setSelectedImage(img.src));
      });

      return () => {
        images.forEach((img) => {
          img.removeEventListener("click", () => setSelectedImage(img.src));
        });
      };
    }
  }, [content]);

  if (isContentLoading) {
    return <NoteSkeleton />;
  }

  if (content === "") {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
        <Button
          onClick={() => navigate(`/note/${id}/editor`)}
          variant="secondary"
          size="lg"
          className="shadow-md bottom-2 right-4 font-bold"
        >
          <Pencil /> Write
        </Button>
        <img
          className="size-[200px] mx-auto mt-4 grayscale-[100] opacity-50"
          src="/empty-note-state.svg"
          alt=""
        />
        <div>No content</div>
      </div>
    );
  }

  if (noteNotFound) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <img
          src="/404-not-found.svg"
          className="p-4 rounded-lg max-w-[500px]"
        ></img>
      </div>
    );
  }

  return (
    <div className={`tiptap ${!content.trim() ? "empty" : ""}`}>
      <div className="max-w-screen-md m-auto">
        <Dialog
          open={!!selectedImage}
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

        <TooltipWrapper message="Edit Content">
          <Button
            onClick={() => navigate(`/note/${id}/editor`)}
            variant="secondary"
            size="lg"
            className="fixed right-2 rounded-full bottom-2 z-10 px-6 border bg-muted"
          >
            <Pencil />
            <span>Edit</span>
          </Button>
        </TooltipWrapper>
        {parse(content)}
      </div>
      <Footer />
    </div>
  );
};

export default NotePage;
