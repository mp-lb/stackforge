import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import App from "./App.tsx"
import { AuthProvider } from "./auth.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider><ThemeProvider><App /></ThemeProvider></AuthProvider>
  </StrictMode>
)
