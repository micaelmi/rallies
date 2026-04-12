import type { FastifyInstance } from "fastify";
import { IdentityController } from "./identity.controller.js";
import { PrismaIdentityRepository } from "./identity.repository.js";
import {
  createIdentityProfileRouteSchema,
  deleteIdentityProfileRouteSchema,
  getIdentityProfileRouteSchema,
  listIdentityProfilesRouteSchema,
  updateIdentityProfileRouteSchema
} from "./identity.schemas.js";
import { IdentityService } from "./identity.service.js";

export const registerIdentityRoutes = async (
  app: FastifyInstance
): Promise<void> => {
  const identityRepository = new PrismaIdentityRepository(app.prisma);
  const identityService = new IdentityService(identityRepository);
  const identityController = new IdentityController(identityService);

  app.post(
    "/profiles",
    {
      schema: createIdentityProfileRouteSchema
    },
    identityController.createProfile
  );

  app.get(
    "/profiles",
    {
      schema: listIdentityProfilesRouteSchema
    },
    identityController.listProfiles
  );

  app.get(
    "/profiles/:userId",
    {
      schema: getIdentityProfileRouteSchema
    },
    identityController.getProfileByUserId
  );

  app.patch(
    "/profiles/:userId",
    {
      schema: updateIdentityProfileRouteSchema
    },
    identityController.updateProfile
  );

  app.delete(
    "/profiles/:userId",
    {
      schema: deleteIdentityProfileRouteSchema
    },
    identityController.deleteIdentity
  );
};
