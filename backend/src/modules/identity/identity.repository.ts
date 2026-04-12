import type { PrismaClient, Prisma } from "@prisma/client";
import { ProfileStatus } from "@prisma/client";
import type {
  ClerkSyncUserInput,
  CreateIdentityProfileInput,
  IdentityConflicts,
  IdentityProfile,
  IdentityProfileList,
  IdentityProfileListQuery,
  IdentityRepository,
  IdentityUserRecord,
  UpdateIdentityProfileInput
} from "./identity.types.js";

const buildProfileUpdateData = (
  input: UpdateIdentityProfileInput
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

const toIdentityProfile = (record: {
  id: string;
  clerkUserId: string;
  email: string;
  profile: {
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
}): IdentityProfile => ({
  userId: record.id,
  clerkUserId: record.clerkUserId,
  email: record.email,
  username: record.profile.username,
  city: record.profile.city,
  state: record.profile.state,
  country: record.profile.country,
  instagramUrl: record.profile.instagramUrl,
  description: record.profile.description,
  preferredLocale: record.profile.preferredLocale,
  status: record.profile.status,
  createdAt: record.profile.createdAt,
  updatedAt: record.profile.updatedAt
});

export class PrismaIdentityRepository implements IdentityRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async findUserById(
    userId: string
  ): Promise<IdentityUserRecord | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        clerkUserId: true,
        email: true,
        profile: { select: { id: true } }
      }
    });

    if (!user) {
      return null;
    }

    return {
      userId: user.id,
      clerkUserId: user.clerkUserId,
      email: user.email,
      hasProfile: Boolean(user.profile)
    };
  }

  public async findUserByClerkUserId(
    clerkUserId: string
  ): Promise<IdentityUserRecord | null> {
    const user = await this.prisma.user.findUnique({
      where: { clerkUserId },
      select: {
        id: true,
        clerkUserId: true,
        email: true,
        profile: { select: { id: true } }
      }
    });

    if (!user) {
      return null;
    }

    return {
      userId: user.id,
      clerkUserId: user.clerkUserId,
      email: user.email,
      hasProfile: Boolean(user.profile)
    };
  }

  public async findUserByEmail(
    email: string
  ): Promise<IdentityUserRecord | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        clerkUserId: true,
        email: true,
        profile: { select: { id: true } }
      }
    });

    if (!user) {
      return null;
    }

    return {
      userId: user.id,
      clerkUserId: user.clerkUserId,
      email: user.email,
      hasProfile: Boolean(user.profile)
    };
  }

  public async findProfileByUserId(
    userId: string
  ): Promise<IdentityProfile | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        clerkUserId: true,
        email: true,
        profile: {
          select: {
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
          }
        }
      }
    });

    if (!user?.profile) {
      return null;
    }

    return toIdentityProfile({
      ...user,
      profile: user.profile
    });
  }

  public async listProfiles(
    input: IdentityProfileListQuery
  ): Promise<IdentityProfileList> {
    const skip = (input.page - 1) * input.limit;

    const [total, users] = await Promise.all([
      this.prisma.profile.count(),
      this.prisma.user.findMany({
        where: {
          profile: {
            isNot: null
          }
        },
        orderBy: {
          createdAt: "desc"
        },
        skip,
        take: input.limit,
        select: {
          id: true,
          clerkUserId: true,
          email: true,
          profile: {
            select: {
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
            }
          }
        }
      })
    ]);

    return {
      items: users
        .filter((user) => user.profile !== null)
        .map((user) =>
          toIdentityProfile({
            ...user,
            profile: user.profile!
          })
        ),
      pagination: {
        page: input.page,
        limit: input.limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / input.limit)
      }
    };
  }

  public async findConflicts(input: {
    email?: string;
    clerkUserId?: string;
    username?: string;
    excludeUserId?: string;
  }): Promise<IdentityConflicts> {
    const [emailUser, clerkUser, usernameProfile] = await Promise.all([
      input.email
        ? this.prisma.user.findUnique({
            where: { email: input.email },
            select: { id: true }
          })
        : null,
      input.clerkUserId
        ? this.prisma.user.findUnique({
            where: { clerkUserId: input.clerkUserId },
            select: { id: true }
          })
        : null,
      input.username
        ? this.prisma.profile.findUnique({
            where: { username: input.username },
            select: { userId: true }
          })
        : null
    ]);

    return {
      email: Boolean(emailUser && emailUser.id !== input.excludeUserId),
      clerkUserId: Boolean(clerkUser && clerkUser.id !== input.excludeUserId),
      username: Boolean(
        usernameProfile && usernameProfile.userId !== input.excludeUserId
      )
    };
  }

  public async createUserWithProfile(
    input: CreateIdentityProfileInput
  ): Promise<IdentityProfile> {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          clerkUserId: input.clerkUserId,
          email: input.email
        }
      });

      const profile = await tx.profile.create({
        data: {
          userId: user.id,
          username: input.username,
          city: input.city ?? null,
          state: input.state ?? null,
          country: input.country,
          instagramUrl: input.instagramUrl ?? null,
          description: input.description ?? null,
          preferredLocale: input.preferredLocale,
          status: ProfileStatus.PENDING
        }
      });

      return {
        userId: user.id,
        clerkUserId: user.clerkUserId,
        email: user.email,
        username: profile.username,
        city: profile.city,
        state: profile.state,
        country: profile.country,
        instagramUrl: profile.instagramUrl,
        description: profile.description,
        preferredLocale: profile.preferredLocale,
        status: profile.status,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt
      };
    });
  }

  public async createProfileForExistingUser(
    userId: string,
    input: CreateIdentityProfileInput
  ): Promise<IdentityProfile> {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: {
          email: input.email
        }
      });

      const profile = await tx.profile.create({
        data: {
          userId,
          username: input.username,
          city: input.city ?? null,
          state: input.state ?? null,
          country: input.country,
          instagramUrl: input.instagramUrl ?? null,
          description: input.description ?? null,
          preferredLocale: input.preferredLocale,
          status: ProfileStatus.PENDING
        }
      });

      return {
        userId: user.id,
        clerkUserId: user.clerkUserId,
        email: user.email,
        username: profile.username,
        city: profile.city,
        state: profile.state,
        country: profile.country,
        instagramUrl: profile.instagramUrl,
        description: profile.description,
        preferredLocale: profile.preferredLocale,
        status: profile.status,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt
      };
    });
  }

  public async updateProfile(
    userId: string,
    input: UpdateIdentityProfileInput
  ): Promise<IdentityProfile> {
    return this.prisma.$transaction(async (tx) => {
      if (input.email !== undefined) {
        await tx.user.update({
          where: { id: userId },
          data: { email: input.email }
        });
      }

      const profile = await tx.profile.update({
        where: { userId },
        data: buildProfileUpdateData(input),
        select: {
          username: true,
          city: true,
          state: true,
          country: true,
          instagramUrl: true,
          description: true,
          preferredLocale: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              clerkUserId: true,
              email: true
            }
          }
        }
      });

      return {
        userId: profile.user.id,
        clerkUserId: profile.user.clerkUserId,
        email: profile.user.email,
        username: profile.username,
        city: profile.city,
        state: profile.state,
        country: profile.country,
        instagramUrl: profile.instagramUrl,
        description: profile.description,
        preferredLocale: profile.preferredLocale,
        status: profile.status,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt
      };
    });
  }

  public async deleteIdentity(userId: string): Promise<void> {
    await this.prisma.user.delete({
      where: { id: userId }
    });
  }

  public async upsertUserFromClerk(input: ClerkSyncUserInput): Promise<void> {
    await this.prisma.user.upsert({
      where: {
        clerkUserId: input.clerkUserId
      },
      update: {
        email: input.email
      },
      create: {
        clerkUserId: input.clerkUserId,
        email: input.email
      }
    });
  }

  public async deleteUserByClerkUserId(clerkUserId: string): Promise<void> {
    await this.prisma.user.delete({
      where: { clerkUserId }
    });
  }
}
