import fp from "fastify-plugin";
import { ZodError } from "zod";
import { AppError } from "../shared/errors/app-error.js";

export const errorHandlerPlugin = fp(async (app) => {
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      request.log.warn(
        {
          code: error.code,
          messageKey: error.messageKey,
          details: error.details
        },
        "application_error"
      );

      return reply.status(error.statusCode).send({
        error: {
          code: error.code,
          messageKey: error.messageKey,
          details: error.details
        },
        requestId: request.id
      });
    }

    if (
      error instanceof ZodError ||
      (typeof error === "object" && error !== null && "validation" in error)
    ) {
      const details =
        error instanceof ZodError
          ? error.issues
          : (error as Record<string, unknown>).validation;

      return reply.status(400).send({
        error: {
          code: "VALIDATION_ERROR",
          messageKey: "errors.validation.invalid_request",
          details
        },
        requestId: request.id
      });
    }

    request.log.error({ err: error }, "unhandled_error");

    return reply.status(500).send({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        messageKey: "errors.common.internal_server_error"
      },
      requestId: request.id
    });
  });
});
