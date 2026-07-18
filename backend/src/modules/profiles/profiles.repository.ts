import type { PrismaClient, Prisma } from "@prisma/client";
import { ProfileStatus } from "@prisma/client";
import type {
  CreateProfileRepositoryInput,
  OwnProfile,
  ProfilesRepository,
  ProfileUserRecord,
  PublicProfile,
  UpdateProfileRepositoryInput
} from "./profiles.types.js";

const ownProfileSelect = {
  userId: true,
  username: true,
  city: true,
  state: true,
  country: true,
  instagramUrl: true,
  description: true,
  preferredLocale: true,
  status: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.ProfileSelect;

const publicProfileSelect = {
  username: true,
  city: true,
  state: true,
  country: true,
  instagramUrl: true,
  description: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.ProfileSelect;

const toOwnProfile = (
  record: Prisma.ProfileGetPayload<{ select: typeof ownProfileSelect }>
): OwnProfile => ({
  userId: record.userId,
  username: record.username,
  city: record.city,
  state: record.state,
  country: record.country,
  instagramUrl: record.instagramUrl,
  description: record.description,
  preferredLocale: record.preferredLocale,
  status: record.status,
  createdAt: record.createdAt,
  updatedAt: record.updatedAt
});

const toPublicProfile = (
  record: Prisma.ProfileGetPayload<{ select: typeof publicProfileSelect }>
): PublicProfile => ({
  username: record.username,
  city: record.city,
  state: record.state,
  country: record.country,
  instagramUrl: record.instagramUrl,
  description: record.description,
  createdAt: record.createdAt,
  updatedAt: record.updatedAt
});

const buildProfileUpdateData = (
  input: UpdateProfileRepositoryInput
): Prisma.ProfileUpdateInput => {
  const data: Prisma.ProfileUpdateInput = {};

  if (input.username !== undefined) {
    data.username = input.username;
  }

  if (input.city !== undefined) {
    data.city = input.city;
  }

  if (input.state !== undefined) {
    data.state = input.state;
  }

  if (input.country !== undefined) {
    data.country = input.country;
  }

  if (input.instagramUrl !== undefined) {
    data.instagramUrl = input.instagramUrl;
  }

  if (input.description !== undefined) {
    data.description = input.description;
  }

  if (input.preferredLocale !== undefined) {
    data.preferredLocale = input.preferredLocale;
  }

  if (input.status !== undefined) {
    data.status = input.status;
  }

  return data;
};

export class PrismaProfilesRepository implements ProfilesRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async findUserById(userId: string): Promise<ProfileUserRecord | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        profile: {
          select: {
            id: true
          }
        }
      }
    });

    if (!user) {
      return null;
    }

    return {
      userId: user.id,
      hasProfile: Boolean(user.profile)
    };
  }

  public async findOwnProfileByUserId(userId: string): Promise<OwnProfile | null> {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: ownProfileSelect
    });

    if (!profile) {
      return null;
    }

    return toOwnProfile(profile);
  }

  public async findProfileByUsername(username: string): Promise<OwnProfile | null> {
    const profile = await this.prisma.profile.findUnique({
      where: { username },
      select: ownProfileSelect
    });

    if (!profile) {
      return null;
    }

    return toOwnProfile(profile);
  }

  public async findPublicProfileByUsername(
    username: string
  ): Promise<PublicProfile | null> {
    const profile = await this.prisma.profile.findFirst({
      where: {
        username,
        status: ProfileStatus.ACTIVE
      },
      select: publicProfileSelect
    });

    if (!profile) {
      return null;
    }

    return toPublicProfile(profile);
  }

  public async createProfile(
    userId: string,
    input: CreateProfileRepositoryInput
  ): Promise<OwnProfile> {
    const profile = await this.prisma.profile.create({
      data: {
        userId,
        username: input.username,
        city: input.city ?? null,
        state: input.state ?? null,
        country: input.country,
        instagramUrl: input.instagramUrl ?? null,
        description: input.description ?? null,
        preferredLocale: input.preferredLocale,
        status: input.status
      },
      select: ownProfileSelect
    });

    return toOwnProfile(profile);
  }

  public async updateProfile(
    userId: string,
    input: UpdateProfileRepositoryInput
  ): Promise<OwnProfile> {
    const profile = await this.prisma.profile.update({
      where: { userId },
      data: buildProfileUpdateData(input),
      select: ownProfileSelect
    });

    return toOwnProfile(profile);
  }
}
