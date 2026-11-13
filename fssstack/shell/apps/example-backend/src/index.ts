import { createLogger } from "@example/fss-shell-server";
import { createExampleBackend } from "./createExampleBackend";
import { readConfig } from "./readConfig";

const logger = createLogger({ module: "@example/fss-shell-example-backend" });

const main = async () => {
  const config = readConfig(process.env);
  const app = createExampleBackend(config, logger);

  const shutdown = () => {
    void app.close().catch((error: unknown) => {
      logger.error("backend.shutdown.failed", { error: String(error) });
      process.exitCode = 1;
    });
  };

  try {
    await app.listen({ port: config.port, host: "0.0.0.0" });
    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
    logger.info("backend.listening", { port: config.port });
  } catch (error) {
    await app.close();
    throw error;
  }
};

void main().catch((error: unknown) => {
  logger.error("backend.start.failed", { error: String(error) });
  process.exitCode = 1;
});
