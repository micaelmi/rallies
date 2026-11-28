import type { WalletService } from "../wallet/wallet.service.js";
import {
  EVENT_BOOST_COST,
  EVENT_PUBLISH_COST,
  EventNotFoundError,
  InvalidEventStateError,
  UnauthorizedEventActionError,
  type CreateEventDraftInput,
  type EventRecord,
  type EventsRepository,
  type SearchEventsFilters,
  type SearchEventsResponse
} from "./events.types.js";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export class EventsService {
  public constructor(
    private readonly eventsRepository: EventsRepository,
    private readonly walletService: WalletService
  ) {}

  public async createDraft(
    ownerId: string,
    input: CreateEventDraftInput
  ): Promise<EventRecord> {
    return this.eventsRepository.create(ownerId, input);
  }

  public async searchEvents(
    filters: SearchEventsFilters,
    requesterUserId?: string
  ): Promise<SearchEventsResponse> {
    return this.eventsRepository.search(filters, requesterUserId);
  }

  public async getEventById(
    eventId: string,
    requesterUserId?: string
  ): Promise<EventRecord> {
    const event = await this.eventsRepository.findById(eventId);

    if (!event) {
      throw new EventNotFoundError(eventId);
    }

    if (event.status !== "PUBLISHED" && event.createdById !== requesterUserId) {
      throw new EventNotFoundError(eventId);
    }

    return event;
  }

  public async publishEvent(
    eventId: string,
    ownerId: string,
    idempotencyKey: string
  ): Promise<EventRecord> {
    const event = await this.eventsRepository.findById(eventId);

    if (!event) {
      throw new EventNotFoundError(eventId);
    }

    if (event.createdById !== ownerId) {
      throw new UnauthorizedEventActionError({ eventId, ownerId });
    }

    if (event.status !== "DRAFT") {
      throw new InvalidEventStateError(event.status, "DRAFT");
    }

    await this.walletService.consumeCredits(
      ownerId,
      EVENT_PUBLISH_COST,
      "EVENT_PUBLISH",
      idempotencyKey,
      `Publish event ${event.title}`
    );

    return this.eventsRepository.updateStatus(eventId, "PUBLISHED");
  }

  public async boostEvent(
    eventId: string,
    ownerId: string,
    durationDays: number,
    idempotencyKey: string
  ): Promise<EventRecord> {
    const event = await this.eventsRepository.findById(eventId);

    if (!event) {
      throw new EventNotFoundError(eventId);
    }

    if (event.createdById !== ownerId) {
      throw new UnauthorizedEventActionError({ eventId, ownerId });
    }

    if (event.status !== "PUBLISHED") {
      throw new InvalidEventStateError(event.status, "PUBLISHED");
    }

    await this.walletService.consumeCredits(
      ownerId,
      EVENT_BOOST_COST,
      "EVENT_BOOST",
      idempotencyKey,
      `Boost event ${event.title} (${durationDays}d)`
    );

    const baseDate =
      event.boostedUntil && event.boostedUntil.getTime() > Date.now()
        ? event.boostedUntil
        : new Date();
    const boostedUntil = new Date(baseDate.getTime() + durationDays * DAY_IN_MS);

    return this.eventsRepository.markBoosted(eventId, boostedUntil);
  }
}
