import { useEffect, useState } from "react";
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
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";
import { Dialog, DialogContent } from "./ui/dialog";
import { Button } from "./ui/button";

export function ArticleCard({
  author,
  title,
  description,
  images,
  updatedAt,
  noteSlug,
  collection,
  headings,
}) {
  const [api, setApi] = useState();
  const [current, setCurrent] = useState(0);
  const [openImageIndex, setOpenImageIndex] = useState(null);

  // Time formatter
  const formatTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    const intervals = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60,
    };

    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / secondsInUnit);
      if (interval >= 1) {
        return `${interval}${unit.charAt(0)} ago`;
      }
    }
    return "Just now";
  };

  useEffect(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  return (
    <Card className="w-full rounded-none sm:rounded-2xl border-t border-border lg:border p-4 lg:p-6">
      <CardHeader className="p-0 pb-3 flex flex-row justify-between items-center">
        <Link
          to={`user/${author?.userName}`}
          className="flex flex-row items-center w-max gap-3"
        >
          <Avatar className="w-10 h-10">
            <AvatarImage src={author?.avatar} alt={author?.fullName} />
            <AvatarFallback>
              {(author?.fullName || "U").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-semibold text-sm">{author?.fullName}</span>
            <span className="text-sm text-muted-foreground">
              {`@${author?.userName}`} • {formatTimeAgo(updatedAt)}
            </span>
          </div>
        </Link>
      </CardHeader>

      <CardContent className="p-0">
        <div className="flex flex-col items-start md:flex-row gap-4">
          <div className="flex-1">
            <CardTitle className="text-base sm:text-xl font-semibold mb-2">
              <Link
                to={`/user/${author?.userName}/${collection.slug}`}
                className="text-muted-foreground hover:underline"
              >
                {collection.slug}
              </Link>
              {" / "}
              <Link
                to={`/user/${author?.userName}/${collection.slug}/${noteSlug}`}
                className="hover:underline"
              >
                {title}
              </Link>
            </CardTitle>

            {headings?.length > 0 && (
              <Accordion type="single" collapsible className="mb-3">
                <AccordionItem value="headings" className="border-b-0 w-max">
                  <AccordionTrigger className="gap-4 py-1 text-sm hover:no-underline">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span>Table of Contents</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-0">
                    <ul className="space-y-1 mt-1 pl-2">
                      {headings.map((heading, index) => (
                        <li key={index} className={`pl-${heading.level * 2}`}>
                          <a
                            href={`#${heading.text
                              .toLowerCase()
                              .replace(/\s+/g, "-")}`}
                            className="text-sm hover:text-primary"
                          >
                            {heading.text}
                          </a>
                        </li>
                      ))}
                    </ul>
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
              <Link
                to={`/user/${author?.userName}/${collection.slug}/${noteSlug}`}
                className="block w-fit"
              >
                <Button className="w-full">
                  Read More
                  <ChevronRight />
                </Button>
              </Link>
            </div>
          </div>

          {images.length > 0 && (
            <div className="w-full md:w-[40%] shadow-md border rounded-lg overflow-hidden">
              <Carousel className="w-full relative" setApi={setApi}>
                <CarouselContent>
                  {images.map((img, index) => (
                    <CarouselItem key={index}>
                      <div
                        className="aspect-video rounded-lg bg-muted overflow-hidden cursor-pointer"
                        onClick={() => setOpenImageIndex(index)}
                      >
                        <img
                          src={img.src}
                          alt={img.alt}
                          className="w-full h-full object-cover"
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
