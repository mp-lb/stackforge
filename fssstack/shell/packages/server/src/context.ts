import type { Logger } from "@mp-lb/fssstack-platform/logger/server";
import type { AppContext } from "./trpc";

export const createContext = (logger: Logger): AppContext => ({ logger });
