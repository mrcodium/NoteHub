import React from "react";
import { Link } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import { Github, Linkedin, Mail, MessageSquare, Twitter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const Footer = () => {
  const footerLinks = [
    { href: "/privacy-policy", label: "Privacy Policy" },
    { href: "/terms", label: "Terms of Service" },
  ];

  return (
    <footer className="mt-10 mb-5 flex w-full flex-col items-center justify-center gap-6">
      {/* Separator */}
      <Separator className="w-full max-w-6xl" />

      {/* Footer Links */}
      <div className="container mx-4 flex max-w-4xl flex-row flex-wrap items-center justify-center gap-4 md:mx-2">
        {footerLinks.map((link) => (
          <Link
            key={link.href}
            to={link.href}
            className="text-muted-foreground hover:text-foreground rounded-full px-3 py-1 text-sm font-medium transition-colors underline-offset-4 hover:underline"
          >
            {link.label}
          </Link>
        ))}
      </div>

      {/* Copyright */}
      <div className="text-muted-foreground text-sm text-center">
        © {new Date().getFullYear()} NoteHub. All rights reserved.
      </div>

      {/* Brand Name */}
      <div className="relative text-6xl font-black tracking-tighter text-nowrap lg:text-9xl select-none">
        <span className="bg-gradient-to-b from-foreground/20 to-transparent bg-clip-text text-transparent">
          NoteHub
        </span>
      </div>

      {/* Creator Credit */}
      <div className="group flex items-center gap-3">
        <img
          alt="Abhijeet Singh Rajput"
          loading="lazy"
          width="48"
          height="48"
          className="hidden size-12 rounded-2xl border-2 border-muted transition-all duration-300 group-hover:border-primary md:block"
          src="https://mrcodium.netlify.app/assets/avatar.jpg"
        />
        <div className="text-center md:text-left">
          <p className="text-sm text-muted-foreground">
            Built with ❤️ by{" "}
            <a
              target="_blank"
              rel="noopener noreferrer"
              href="https://mrcodium.netlify.app"
              className="font-semibold text-foreground transition-all duration-300 hover:text-primary hover:underline underline-offset-4"
            >
              Abhijeet Singh Rajput
            </a>
          </p>
          <p className="text-xs text-muted-foreground/70">
            Full Stack Developer
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;