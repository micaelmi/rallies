import type { ProfileStatus } from "@prisma/client";
import type { z } from "zod";
import type {
  createProfileBodySchema,
  profileAuthenticatedHeadersSchema,
  publicProfileParamsSchema,
  updateProfileBodySchema
} from "./profiles.schemas.js";

export type CreateProfileInput = z.infer<typeof createProfileBodySchema>;

export type UpdateProfileInput = z.infer<typeof updateProfileBodySchema>;

export type PublicProfileParams = z.infer<typeof publicProfileParamsSchema>;

export type ProfileAuthenticatedHeaders = z.infer<
  typeof profileAuthenticatedHeadersSchema
>;

export type OwnProfile = {
  userId: string;
  username: string;
  city: string | null;
  state: string | null;
  country: string;
  instagramUrl: string | null;
  description: string | null;
  preferredLocale: string;
  status: ProfileStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type PublicProfile = {
  username: string;
  city: string | null;
  state: string | null;
  country: string;
  instagramUrl: string | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ProfileUserRecord = {
  userId: string;
  hasProfile: boolean;
};

export type CreateProfileRepositoryInput = {
  username: string;
  city?: string;
  state?: string;
  country: string;
  instagramUrl?: string;
  description?: string;
  preferredLocale: string;
  status: ProfileStatus;
};

export type UpdateProfileRepositoryInput = {
  username?: string;
  city?: string | null;
  state?: string | null;
  country?: string;
  instagramUrl?: string | null;
  description?: string | null;
  preferredLocale?: string;
  status?: ProfileStatus;
};

export interface ProfilesRepository {
  findUserById(userId: string): Promise<ProfileUserRecord | null>;
  findOwnProfileByUserId(userId: string): Promise<OwnProfile | null>;
  findProfileByUsername(username: string): Promise<OwnProfile | null>;
  findPublicProfileByUsername(username: string): Promise<PublicProfile | null>;
  createProfile(
    userId: string,
    input: CreateProfileRepositoryInput
  ): Promise<OwnProfile>;
  updateProfile(
    userId: string,
    input: UpdateProfileRepositoryInput
  ): Promise<OwnProfile>;
}
