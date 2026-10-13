import { ClerkProvider } from "@clerk/react-router";
import type { PropsWithChildren } from "react";

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

export function AuthProvider({ children }: PropsWithChildren) {
  if (!publishableKey) return children;
  return <ClerkProvider publishableKey={publishableKey}>{children}</ClerkProvider>;
}
