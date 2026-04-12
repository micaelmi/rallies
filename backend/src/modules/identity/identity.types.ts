import type { ProfileStatus } from "@prisma/client";
import type { z } from "zod";
import type {
  createIdentityProfileBodySchema,
  identityProfileListQuerySchema,
  updateIdentityProfileBodySchema
} from "./identity.schemas.js";

export type CreateIdentityProfileInput = z.infer<typeof createIdentityProfileBodySchema>;

export type UpdateIdentityProfileInput = z.infer<typeof updateIdentityProfileBodySchema>;

export type IdentityProfileListQuery = z.infer<typeof identityProfileListQuerySchema>;

export type IdentityProfile = {
  userId: string;
  clerkUserId: string;
  email: string;
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

export type IdentityProfileList = {
  items: IdentityProfile[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type IdentityConflicts = {
  email: boolean;
  clerkUserId: boolean;
  username: boolean;
};

export type IdentityUserRecord = {
  userId: string;
  clerkUserId: string;
  email: string;
  hasProfile: boolean;
};

export type ClerkSyncUserInput = {
  clerkUserId: string;
  email: string;
};

export interface IdentityRepository {
  findUserById(userId: string): Promise<IdentityUserRecord | null>;
  findUserByClerkUserId(clerkUserId: string): Promise<IdentityUserRecord | null>;
  findUserByEmail(email: string): Promise<IdentityUserRecord | null>;
  findProfileByUserId(userId: string): Promise<IdentityProfile | null>;
  listProfiles(input: IdentityProfileListQuery): Promise<IdentityProfileList>;
  findConflicts(input: {
    email?: string;
    clerkUserId?: string;
    username?: string;
    excludeUserId?: string;
  }): Promise<IdentityConflicts>;
  createUserWithProfile(input: CreateIdentityProfileInput): Promise<IdentityProfile>;
  createProfileForExistingUser(userId: string, input: CreateIdentityProfileInput): Promise<IdentityProfile>;
  updateProfile(userId: string, input: UpdateIdentityProfileInput): Promise<IdentityProfile>;
  deleteIdentity(userId: string): Promise<void>;
  upsertUserFromClerk(input: ClerkSyncUserInput): Promise<void>;
  deleteUserByClerkUserId(clerkUserId: string): Promise<void>;
}
