import { Button } from "@/components/ui/button";
import { useNoteStore } from "@/stores/useNoteStore";
import { Calendar, Clock, Copy, CopyCheck, Globe, Pencil } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import parse from "html-react-parser";
import NoteSkeleton from "@/components/sekeletons/NoteSkeleton";
import { useNavigate } from "react-router-dom";
import hljs from "highlight.js";
import { createRoot } from "react-dom/client";
import { toast } from "sonner";
import katex from "katex";
import "katex/dist/katex.min.css";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import Footer from "@/components/Footer";
import { useAuthStore } from "@/stores/useAuthStore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, formatDate, formatTimeAgo } from "@/lib/utils";
import ScrollTopButton from "@/components/ScrollTopButton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";


const NotePage = () => {
  const { id: noteId } = useParams();
  const { authUser } = useAuthStore();
  const { getNoteContent, status, noteNotFound } = useNoteStore();
  const [content, setContent] = useState("");
  const [note, setNote] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      if (noteId) {
        let note = await getNoteContent(noteId);
        setNote(note);
        setContent(note?.content || "");
      }
    };

    fetchData();
  }, [noteId, getNoteContent]);

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

  if (status.noteContent.state === "loading") {
    return <NoteSkeleton />;
  }

  if (content === "") {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
        <Button
          onClick={() => navigate(`/note/${noteId}/editor`)}
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
    <div
      className={cn(
        "h-full flex flex-col justify-between",
        !content.trim() && "empty"
      )}
    >
      <div className="max-w-screen-md w-full mx-auto relative">
        <div className="py-8 px-4 space-y-6 border-b border-dashed mb-12">
          <div className="flex items-center justify-between">
            <Link
              to={`/user/${authUser?.userName}`}
              className="flex flex-row items-center w-max gap-3"
            >
              <Avatar className="size-12 bg-muted">
                <AvatarImage
                  className="w-full h-full object-cover !m-0"
                  src={authUser?.avatar}
                  alt={authUser?.fullName}
                />
                <AvatarFallback>
                  {(authUser?.fullName || "U").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <div className="font-semibold flex gap-2 !text-primary items-center text-sm">
                  <span>{authUser?.fullName}</span>
                  <Badge
                    variant="ghost"
                    className={"p-1 border-none text-muted-foreground"}
                  >
                    {note.visibility === "public" &&
                    note.visibility === "public" ? (
                      <Globe size={16} strokeWidth={3} />
                    ) : (
                      <Lock
                        size={16}
                        strokeWidth={3}
                        className="fill-destructive/20 stroke-destructive"
                      />
                    )}
                  </Badge>
                </div>
                <span className="text-sm text-muted-foreground">
                  {`@${authUser?.userName}`}
                </span>
              </div>
            </Link>
            <Button
              tooltip="Edit Content"
              onClick={() => navigate(`/note/${note?._id}/editor`)}
              variant="secondary"
              size="lg"
              className="rounded-full px-6 border bg-muted"
            >
              <Pencil />
              <span>Edit</span>
            </Button>
          </div>
          <div className="flex justify-around gap-8">
            {/* Created Date */}
            <div className="flex gap-1 flex-col md:gap-4 md:flex-row items-center">
              <div className="flex gap-2 items-center">
                <Calendar className="size-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Created
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span
                  className="text-sm font-medium"
                  title={formatDate(note?.createdAt)}
                >
                  {format(new Date(note?.createdAt), "MMM d, yyyy")}
                </span>
              </div>
            </div>

            {/* Last Modified */}
            <div className="flex gap-1 flex-col md:gap-4 md:flex-row items-center">
              <div className="flex gap-2 items-center">
                <Clock className="size-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Last Modified
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span
                  className="text-sm font-medium"
                  title={formatDate(note?.updatedAt)}
                >
                  {formatTimeAgo(new Date(note?.updatedAt), "MMM d, yyyy")}
                </span>
              </div>
            </div>
          </div>
        </div>
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

        <div className="tiptap">{parse(content)}</div>
      </div>
      <ScrollTopButton />
      <Footer className={"pb-28"} />
    </div>
  );
};

export default NotePage;
