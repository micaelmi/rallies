import type { FastifyInstance } from "fastify";
import { ProfilesController } from "./profiles.controller.js";
import { PrismaProfilesRepository } from "./profiles.repository.js";
import {
  createProfileRouteSchema,
  getOwnProfileRouteSchema,
  getPublicProfileRouteSchema,
  updateOwnProfileRouteSchema
} from "./profiles.schemas.js";
import { ProfilesService } from "./profiles.service.js";

export const registerProfilesRoutes = async (
  app: FastifyInstance
): Promise<void> => {
  const profilesRepository = new PrismaProfilesRepository(app.prisma);
  const profilesService = new ProfilesService(profilesRepository);
  const profilesController = new ProfilesController(profilesService);

  app.get(
    "/profiles/:username",
    {
      schema: getPublicProfileRouteSchema
    },
    profilesController.getPublicProfileByUsername
  );

  await app.register(async (protectedApp) => {
    protectedApp.addHook("preHandler", app.requireAuth);

    protectedApp.post(
      "/profiles",
      {
        schema: createProfileRouteSchema
      },
      profilesController.createProfile
    );

    protectedApp.patch(
      "/profiles/me",
      {
        schema: updateOwnProfileRouteSchema
      },
      profilesController.updateOwnProfile
    );

    protectedApp.put(
      "/profiles/me",
      {
        schema: updateOwnProfileRouteSchema
      },
      profilesController.updateOwnProfile
    );

    protectedApp.get(
      "/profiles/me",
      {
        schema: getOwnProfileRouteSchema
      },
      profilesController.getOwnProfile
    );
  });
};
