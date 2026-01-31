import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "./ui/carousel";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Globe,
  Lock,
  MoreVertical,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";
import { Dialog, DialogContent } from "./ui/dialog";
import { Button } from "./ui/button";
import { useNoteStore } from "@/stores/useNoteStore";
import NotesOption from "./NotesOption";
import { formatTimeAgo } from "@/lib/utils";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { useAuthStore } from "@/stores/useAuthStore";
import TableOfContent from "./table-of-content";
import BadgeIcon from "./icons/BadgeIcon";

export function ArticleCard({
  note,
  author,
  description,
  images,
  collection,
  headings,
}) {
  const { authUser } = useAuthStore();
  const [api, setApi] = useState();
  const [current, setCurrent] = useState(0);
  const [openImageIndex, setOpenImageIndex] = useState(null);

  const isOwner = author?.userName === authUser?.userName;
  const inputRef = useRef(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const { renameNote } = useNoteStore();

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      const timeout = setTimeout(() => {
        inputRef.current.focus();
        inputRef.current.select();
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [isRenaming]);

  const handleSaveRename = () => {
    const newName = inputRef.current?.value.trim();
    if (newName && newName !== note.name) {
      renameNote({
        noteId: note._id,
        newName: newName,
      });
    }
    setIsRenaming(false);
  };

  const handleKeyDown = (e) => {
    e.stopPropagation();
    if (e.key === "Enter") {
      handleSaveRename();
    } else if (e.key === "Escape") {
      if (inputRef.current) {
        inputRef.current.value = note.name;
      }
      setIsRenaming(false);
    }
  };

  useEffect(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  return (
    <Card className="w-full rounded-xl sm:rounded-2xl border-t border-border lg:border p-4 lg:p-6">
      <CardHeader className="p-0 mb-3 flex flex-row justify-between items-center">
        {isRenaming ? (
          <Input
            ref={inputRef}
            defaultValue={note.name}
            className="font-bold h-8 flex-1"
            onBlur={handleSaveRename}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <Link
            to={`user/${author?.userName}`}
            className="flex flex-row items-center w-max gap-3"
          >
            <Avatar className="w-10 h-10">
              <AvatarImage
                size={40}
                src={author?.avatar}
                alt={author?.fullName || "User Profile Photo"}
              />
              <AvatarFallback>
                {(author?.fullName || "U").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <div className="font-semibold flex gap-2 items-center text-sm">
                <span>{author?.fullName}</span>
                {author.role === "admin" && (
                  <BadgeIcon className="size-4 text-blue-500" />
                )}
                {isOwner && (
                  <Badge
                    variant="ghost"
                    className={"p-1 border-none text-muted-foreground"}
                  >
                    {note.visibility === "public" &&
                    collection.visibility === "public" ? (
                      <Globe size={16} strokeWidth={3} />
                    ) : (
                      <Lock
                        size={16}
                        strokeWidth={3}
                        className="fill-destructive/20 stroke-destructive"
                      />
                    )}
                  </Badge>
                )}
              </div>
              <span className="text-sm text-muted-foreground">
                {`@${author?.userName}`} •{" "}
                {formatTimeAgo(note.contentUpdatedAt)}
              </span>
            </div>
          </Link>
        )}
        {isOwner && (
          <NotesOption
            trigger={<MoreVertical className="size-4" />}
            className="size-10 rounded-full"
            note={note}
            setIsRenaming={setIsRenaming}
          />
        )}
      </CardHeader>

      <CardContent className="p-0">
        <div className="flex flex-col items-start md:flex-row gap-4">
          <div className="flex-1 w-full">
            <CardTitle className="text-base sm:text-xl font-semibold mb-2">
              <Link
                to={`/user/${author?.userName}/${collection.slug}`}
                className="text-muted-foreground hover:underline"
              >
                {collection.name}
              </Link>
              {" / "}
              <Link
                to={`/user/${author?.userName}/${collection.slug}/${note.slug}`}
                className="hover:underline"
              >
                {note.name}
              </Link>
            </CardTitle>

            {headings?.length > 0 && (
              <Accordion type="single" collapsible className="mb-3 w-full">
                <AccordionItem value="headings" className="border-b-0 w-full">
                  <AccordionTrigger className="group  hover:bg-primary/5 gap-4 py-2 text-sm hover:no-underline">
                    <div className="flex group-hover:text-primary items-center gap-2 text-muted-foreground">
                      <span>Table of Contents</span>
                    </div>
                  </AccordionTrigger>

                  <AccordionContent className="pb-0 w-full">
                    <TableOfContent data={headings} />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}

            <p
              className="text-muted-foreground text-sm line-clamp-3"
              style={{ overflowWrap: "anywhere" }}
            >
              {description}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <Button
                asChild
                size="sm"
                variant="secondary"
                className="bg-primary/10"
              >
                <Link
                  to={`/user/${author?.userName}/${collection.slug}/${note.slug}`}
                  className="block w-fit"
                  aria-label={`Rad more about ${note.name}`}
                >
                  <span className="sr-only">{`Rad more about ${note.name}`}</span>
                  <span aria-hidden="true">Read More</span>
                  <ChevronRight />
                </Link>
              </Button>
            </div>
          </div>

          {images.length > 0 && (
            <div className="w-full md:w-[40%] shadow-md border rounded-lg overflow-hidden">
              <Carousel className="w-full relative" setApi={setApi}>
                <CarouselContent>
                  {images.map((img, index) => (
                    <CarouselItem key={index}>
                      <div
                        className="aspect-video bg-white rounded-lg bg-muted overflow-hidden cursor-pointer"
                        onClick={() => setOpenImageIndex(index)}
                      >
                        <img
                          src={img.src}
                          alt={img.alt}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>

                {images.length > 1 && (
                  <>
                    {/* Arrows only on larger screens */}
                    <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background/50 hover:bg-background/80 hidden sm:flex">
                      <ChevronLeft className="h-4 w-4" />
                    </CarouselPrevious>
                    <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background/50 hover:bg-background/80 hidden sm:flex">
                      <ChevronRight className="h-4 w-4" />
                    </CarouselNext>

                    {/* Index Dots */}
                    <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                      {images.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => api?.scrollTo(index)}
                          className={`w-2 h-2 shadow-md rounded-full transition-all ${
                            current === index
                              ? "bg-primary w-3"
                              : "bg-muted-foreground/50"
                          }`}
                          aria-label={`Go to slide ${index + 1}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </Carousel>
            </div>
          )}
        </div>
      </CardContent>

      {/* Full-screen image dialog */}
      <Dialog
        open={openImageIndex !== null}
        onOpenChange={(open) => !open && setOpenImageIndex(null)}
      >
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 border-none">
          {openImageIndex !== null && (
            <div className="flex items-center justify-center w-full h-full">
              <img
                src={images[openImageIndex].src}
                alt={images[openImageIndex].alt}
                className="object-contain max-w-full max-h-[80vh]"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
