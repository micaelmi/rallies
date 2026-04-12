import { Prisma } from "@prisma/client";
import { AppError } from "../../shared/errors/app-error.js";

export const mapPrismaError = (error: unknown): never => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const target = Array.isArray(error.meta?.target) ? error.meta.target.join(",") : "unknown";

      throw new AppError({
        code: "RESOURCE_CONFLICT",
        messageKey: "errors.common.resource_conflict",
        statusCode: 409,
        details: { target }
      });
    }
  }

  throw error;
};
