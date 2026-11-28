import {
  ClubMemberRole as PrismaClubMemberRole,
  ClubMemberStatus as PrismaClubMemberStatus,
  ClubStatus as PrismaClubStatus,
  type Prisma,
  type PrismaClient
} from "@prisma/client";
import { mapPrismaError } from "../../infra/database/prisma-errors.js";
import type {
  ClubDetailResponse,
  ClubMemberRole,
  ClubMemberStatus,
  ClubMemberView,
  ClubsRepository,
  ClubSummary,
  CreateClubPersistenceInput,
  SearchClubsFilters,
  SearchClubsResponse
} from "./clubs.types.js";

const memberSelect = {
  id: true,
  clubId: true,
  userId: true,
  role: true,
  status: true,
  joinedAt: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.ClubMemberSelect;

const clubSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  email: true,
  phone: true,
  instagramUrl: true,
  country: true,
  state: true,
  city: true,
  address: true,
  mapsUrl: true,
  maxMembers: true,
  ownerId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  members: {
    where: {
      status: { not: PrismaClubMemberStatus.REMOVED }
    },
    orderBy: [{ createdAt: "asc" }],
    select: memberSelect
  }
} satisfies Prisma.ClubSelect;

const clubSummarySelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  country: true,
  state: true,
  city: true,
  address: true,
  ownerId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      members: {
        where: { status: PrismaClubMemberStatus.ACTIVE }
      }
    }
  }
} satisfies Prisma.ClubSelect;

const toMemberView = (
  record: Prisma.ClubMemberGetPayload<{ select: typeof memberSelect }>
): ClubMemberView => ({
  id: record.id,
  clubId: record.clubId,
  userId: record.userId,
  role: record.role,
  status: record.status,
  joinedAt: record.joinedAt,
  createdAt: record.createdAt,
  updatedAt: record.updatedAt
});

const toClubDetail = (
  record: Prisma.ClubGetPayload<{ select: typeof clubSelect }>
): ClubDetailResponse => {
  const members = record.members.map(toMemberView);
  const memberCount = members.filter((m) => m.status === "ACTIVE").length;

  return {
    id: record.id,
    name: record.name,
    slug: record.slug,
    description: record.description,
    email: record.email,
    phone: record.phone,
    instagramUrl: record.instagramUrl,
    country: record.country,
    state: record.state,
    city: record.city,
    address: record.address,
    mapsUrl: record.mapsUrl,
    maxMembers: record.maxMembers,
    ownerId: record.ownerId,
    status: record.status,
    memberCount,
    members,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
};

const toClubSummary = (
  record: Prisma.ClubGetPayload<{ select: typeof clubSummarySelect }>
): ClubSummary => ({
  id: record.id,
  name: record.name,
  slug: record.slug,
  description: record.description,
  country: record.country,
  state: record.state,
  city: record.city,
  address: record.address,
  ownerId: record.ownerId,
  status: record.status,
  memberCount: record._count.members,
  createdAt: record.createdAt,
  updatedAt: record.updatedAt
});

export class PrismaClubsRepository implements ClubsRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async createClub(
    ownerId: string,
    data: CreateClubPersistenceInput
  ): Promise<ClubDetailResponse> {
    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const club = await tx.club.create({
          data: {
            name: data.name,
            slug: data.slug,
            description: data.description,
            email: data.email,
            phone: data.phone ?? null,
            instagramUrl: data.instagramUrl ?? null,
            country: data.country,
            state: data.state ?? null,
            city: data.city ?? null,
            address: data.address,
            mapsUrl: data.mapsUrl ?? null,
            maxMembers: data.maxMembers ?? null,
            ownerId,
            status: PrismaClubStatus.ACTIVE,
            members: {
              create: {
                userId: ownerId,
                role: PrismaClubMemberRole.OWNER,
                status: PrismaClubMemberStatus.ACTIVE,
                joinedAt: new Date()
              }
            }
          },
          select: clubSelect
        });

        return club;
      });

      return toClubDetail(created);
    } catch (error) {
      return mapPrismaError(error);
    }
  }

  public async findClubById(
    clubId: string
  ): Promise<ClubDetailResponse | null> {
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
      select: clubSelect
    });

    return club ? toClubDetail(club) : null;
  }

  public async searchClubs(
    filters: SearchClubsFilters
  ): Promise<SearchClubsResponse> {
    const where: Prisma.ClubWhereInput = {
      status: PrismaClubStatus.ACTIVE,
      ...(filters.name
        ? {
            name: {
              contains: filters.name,
              mode: "insensitive"
            }
          }
        : {}),
      ...(filters.location
        ? {
            OR: [
              { city: { contains: filters.location, mode: "insensitive" } },
              { state: { contains: filters.location, mode: "insensitive" } },
              { country: { contains: filters.location, mode: "insensitive" } }
            ]
          }
        : {})
    };

    const skip = (filters.page - 1) * filters.limit;

    const [rows, total] = await Promise.all([
      this.prisma.club.findMany({
        where,
        orderBy: [{ createdAt: "desc" }],
        skip,
        take: filters.limit,
        select: clubSummarySelect
      }),
      this.prisma.club.count({ where })
    ]);

    return {
      items: rows.map(toClubSummary),
      page: filters.page,
      limit: filters.limit,
      total
    };
  }

  public async getClubMember(
    clubId: string,
    userId: string
  ): Promise<ClubMemberView | null> {
    const member = await this.prisma.clubMember.findUnique({
      where: {
        clubId_userId: { clubId, userId }
      },
      select: memberSelect
    });

    return member ? toMemberView(member) : null;
  }

  public async upsertClubMember(
    clubId: string,
    userId: string,
    status: ClubMemberStatus,
    role: ClubMemberRole,
    joinedAt: Date | null
  ): Promise<ClubMemberView> {
    try {
      const member = await this.prisma.clubMember.upsert({
        where: {
          clubId_userId: { clubId, userId }
        },
        update: {
          status: status as PrismaClubMemberStatus,
          role: role as PrismaClubMemberRole,
          joinedAt
        },
        create: {
          clubId,
          userId,
          status: status as PrismaClubMemberStatus,
          role: role as PrismaClubMemberRole,
          joinedAt
        },
        select: memberSelect
      });

      return toMemberView(member);
    } catch (error) {
      return mapPrismaError(error);
    }
  }

  public async updateMemberStatus(
    clubId: string,
    userId: string,
    status: ClubMemberStatus,
    role: ClubMemberRole,
    joinedAt: Date | null
  ): Promise<ClubMemberView> {
    try {
      const member = await this.prisma.clubMember.update({
        where: {
          clubId_userId: { clubId, userId }
        },
        data: {
          status: status as PrismaClubMemberStatus,
          role: role as PrismaClubMemberRole,
          joinedAt
        },
        select: memberSelect
      });

      return toMemberView(member);
    } catch (error) {
      return mapPrismaError(error);
    }
  }
}
