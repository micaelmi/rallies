import "dotenv/config";
import { buildApp } from "./bootstrap/app.js";

const start = async (): Promise<void> => {
  const app = await buildApp();

  try {
    await app.listen({
      host: app.config.HOST,
      port: app.config.PORT
    });

    app.log.info(
      {
        host: app.config.HOST,
        port: app.config.PORT
      },
      "server_started"
    );
  } catch (error) {
    app.log.error({ err: error }, "server_start_failed");
    process.exit(1);
  }
};

await start();
