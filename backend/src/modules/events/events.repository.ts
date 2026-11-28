import {
  EventStatus as PrismaEventStatus,
  type Prisma,
  type PrismaClient
} from "@prisma/client";
import { mapPrismaError } from "../../infra/database/prisma-errors.js";
import type {
  CreateEventDraftInput,
  EventRecord,
  EventsRepository,
  EventStatus,
  SearchEventsFilters,
  SearchEventsResponse
} from "./events.types.js";

const eventSelect = {
  id: true,
  clubId: true,
  title: true,
  description: true,
  imageUrl: true,
  city: true,
  state: true,
  country: true,
  address: true,
  mapsUrl: true,
  startAt: true,
  endAt: true,
  registrationUrl: true,
  createdById: true,
  status: true,
  isBoosted: true,
  boostedUntil: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.EventSelect;

const toEventRecord = (
  record: Prisma.EventGetPayload<{ select: typeof eventSelect }>
): EventRecord => ({
  id: record.id,
  clubId: record.clubId,
  title: record.title,
  description: record.description,
  imageUrl: record.imageUrl,
  city: record.city,
  state: record.state,
  country: record.country,
  address: record.address,
  mapsUrl: record.mapsUrl,
  startAt: record.startAt,
  endAt: record.endAt,
  registrationUrl: record.registrationUrl,
  createdById: record.createdById,
  status: record.status,
  isBoosted: record.isBoosted,
  boostedUntil: record.boostedUntil,
  createdAt: record.createdAt,
  updatedAt: record.updatedAt
});

export class PrismaEventsRepository implements EventsRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async create(
    ownerId: string,
    data: CreateEventDraftInput
  ): Promise<EventRecord> {
    try {
      const event = await this.prisma.event.create({
        data: {
          clubId: data.clubId ?? null,
          title: data.title,
          description: data.description,
          imageUrl: data.imageUrl ?? null,
          city: data.city,
          state: data.state ?? null,
          country: data.country,
          address: data.address,
          mapsUrl: data.mapsUrl ?? null,
          startAt: new Date(data.startDate),
          endAt: new Date(data.endDate),
          registrationUrl: data.registrationUrl ?? null,
          createdById: ownerId,
          status: PrismaEventStatus.DRAFT,
          isBoosted: false
        },
        select: eventSelect
      });

      return toEventRecord(event);
    } catch (error) {
      return mapPrismaError(error);
    }
  }

  public async findById(eventId: string): Promise<EventRecord | null> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: eventSelect
    });

    return event ? toEventRecord(event) : null;
  }

  public async search(
    filters: SearchEventsFilters,
    requesterUserId?: string
  ): Promise<SearchEventsResponse> {
    const statusFilter: Prisma.EventWhereInput =
      requesterUserId !== undefined &&
      filters.status !== undefined &&
      filters.status !== "PUBLISHED"
        ? {
            status: filters.status as PrismaEventStatus,
            createdById: requesterUserId
          }
        : {
            status: PrismaEventStatus.PUBLISHED
          };

    const where: Prisma.EventWhereInput = {
      ...statusFilter,
      ...(filters.boostedOnly === "true" ? { isBoosted: true } : {}),
      ...(filters.location
        ? {
            OR: [
              { city: { contains: filters.location, mode: "insensitive" } },
              { state: { contains: filters.location, mode: "insensitive" } },
              { country: { contains: filters.location, mode: "insensitive" } },
              { address: { contains: filters.location, mode: "insensitive" } }
            ]
          }
        : {})
    };

    const skip = (filters.page - 1) * filters.limit;

    const [rows, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        orderBy: [
          { isBoosted: "desc" },
          { startAt: "asc" },
          { createdAt: "desc" }
        ],
        skip,
        take: filters.limit,
        select: eventSelect
      }),
      this.prisma.event.count({ where })
    ]);

    return {
      items: rows.map(toEventRecord),
      page: filters.page,
      limit: filters.limit,
      total
    };
  }

  public async updateStatus(
    eventId: string,
    status: EventStatus
  ): Promise<EventRecord> {
    try {
      const updated = await this.prisma.event.update({
        where: { id: eventId },
        data: { status: status as PrismaEventStatus },
        select: eventSelect
      });

      return toEventRecord(updated);
    } catch (error) {
      return mapPrismaError(error);
    }
  }

  public async markBoosted(
    eventId: string,
    boostedUntil: Date
  ): Promise<EventRecord> {
    try {
      const updated = await this.prisma.event.update({
        where: { id: eventId },
        data: {
          isBoosted: true,
          boostedUntil
        },
        select: eventSelect
      });

      return toEventRecord(updated);
    } catch (error) {
      return mapPrismaError(error);
    }
  }
}
