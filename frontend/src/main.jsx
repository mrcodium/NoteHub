import { StrictMode } from "react";
import { BrowserRouter } from "react-router-dom";
import { createRoot } from "react-dom/client";
import "katex/dist/katex.min.css";
import "./styles/katex-overrides.css";
import "./styles/index.css";
import "./styles/theme.css";
import "./styles/tiptap.css"
import "./styles/hljs.css"



import App from "./App.jsx";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { HelmetProvider } from "react-helmet-async";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
        <HelmetProvider>
          <App />
        </HelmetProvider>
      </GoogleOAuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
