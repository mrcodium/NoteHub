import React from "react";
import { ModeToggleMini } from "./mode-toggle";
import { Link } from "react-router-dom";
import TooltipWrapper from "./TooltipWrapper";
import { Button } from "./ui/button";
import GithubIcon from "./githubIcon";
import { useGithubStore } from "@/stores/useGithubStore";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
const BaseHeader = () => {
  const githubStarCount = useGithubStore((s) => s.starCount);
  const { authUser } = useAuthStore();

  return (
    <header className="sticky top-0 bg-background border-b left-0 w-full h-16 flex p-4 justify-between items-center">
      <div>
        <Link to={"/"} className="logo flex gap-2">
          <div className="size-6">
            <img
              className="w-full h-full object-contain"
              src="/notehub.png"
              alt=""
            />
          </div>
          Notehub
        </Link>
      </div>
      <div className="flex items-center gap-2">
        <TooltipWrapper message="Source Code">
          <a href="https://github.com/abhijeetSinghRajput/notehub">
            <Button size="sm" className="p-2" variant="secondary">
              <GithubIcon />
              {githubStarCount || ""}
            </Button>
          </a>
        </TooltipWrapper>
        <ModeToggleMini />
        {authUser && (
          <Link to={`/user/${authUser?.userName}`}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Avatar className="w-8 h-8">
                  <AvatarImage src={authUser?.avatar} />
                  <AvatarFallback>
                    {(authUser?.fullName || "U").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent align="end" className="max-w-64 text-pretty">
                <div>
                  <p className="text-sm font-medium">{authUser?.fullName}</p>
                  <div className="text-primary-foreground/80 text-xs">
                    <p>{`@${authUser?.userName}`}</p>
                    <p>{authUser?.email}</p>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </Link>
        )}
      </div>
    </header>
  );
};

export default BaseHeader;
