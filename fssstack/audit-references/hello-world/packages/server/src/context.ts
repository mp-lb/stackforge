import { logger } from "@mp-lb/fssstack-platform/logger/server";
import type { AppContext } from "./trpc";

export const createContext = (): AppContext => ({ logger });
