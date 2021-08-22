import {
  controller,
  description,
  get,
  HttpError,
  HttpStatus,
  inject,
  MicroserviceRequest,
  MicroserviceStream,
  queryParameter,
  response,
  responseBody,
  summary,
  websocket,
} from "@waytrade/microservice-core";
import {Observable} from "rxjs";
import {IBApiApp} from "../app";
import {ContractDetails} from "../models/contract-details.model";
import {IBApiEvent} from "../models/ib-api-event";
import {IBApiService} from "../services/ib-api.service";
import {EventStreamChannel} from "./events/event-stream-channel";

/** Event request types. */
enum IBApiEventRequestType {
  /** Subscribe for an event. */
  Subscribe = "sub",
  /** Unsubscribe from an event. */
  Unsubscribe = "unsub",
}

/** An event source from IBApi. */
type IBApiEventSource = (
  ibApiService: IBApiService,
  args: string[],
) => Observable<unknown>;

/**
 * Event types.
 *
 * Adapt IBApiEventTypeSources and description of
 * IBApiController.createEventStream if you changed it!!
 */
export enum IBApiEventType {
  /** Accounts summaries update. */
  AccountSummaries = "accountSummaries",

  /** Account positions update. */
  Positions = "positions",

  /** Market data update. */
  MarketData = "marketData",
}

/** All IBApi event sources, with event type as key. */
export const IBApiEventTypeSources = new Map<IBApiEventType, IBApiEventSource>([
  [
    IBApiEventType.AccountSummaries,
    (ibApiService): Observable<unknown> => {
      return ibApiService.accountSummaries;
    },
  ],
  [
    IBApiEventType.Positions,
    (ibApiService): Observable<unknown> => {
      return ibApiService.positions;
    },
  ],
  [
    IBApiEventType.MarketData,
    (ibApiService, args: string[]): Observable<unknown> => {
      if (args[0]) {
        return ibApiService.getMarketData(Number(args[0]));
      } else {
        return new Observable(res =>
          res.error(new Error("Invalid request: no conId argument")),
        );
      }
    },
  ],
]);

/**
 * The IBApi endpoint + controller.
 */
@controller("IB Api Endpoint", "/")
export class IBApiController {
  @inject("IBApiApp")
  private app!: IBApiApp;

  @inject("IBApiService")
  private apiService!: IBApiService;

  /** List of currently open event-stream channels. */
  private readonly eventStreamChannels = new Set<EventStreamChannel>();

  /** Stop the controller */
  stop(): void {
    this.eventStreamChannels.forEach(ch => {
      ch.close();
    });
  }

  //
  // REST functions
  //

  @get("contractDetails")
  @summary("Get contract details.")
  @description("Get contract details of the contract id.")
  @queryParameter("conId", Number, true, "The IB contract id.")
  @response(HttpStatus.BAD_REQUEST)
  @responseBody(ContractDetails)
  async getContractDetails(
    request: MicroserviceRequest,
  ): Promise<ContractDetails> {
    // verify state and arguments

    const conId = Number(request.queryParams.conId);
    if (conId === undefined || conId == NaN) {
      throw new HttpError(HttpStatus.BAD_REQUEST);
    }

    // request contract details
    return new Promise<ContractDetails>((resolve, reject) => {
      this.apiService
        .getContractDetails(Number(conId))
        .then(result => resolve(result))
        .catch(err => {
          const msg = `getContractDetails(): ${err.code} - ${err.error.message}`;
          this.app.error(msg);
          reject(new HttpError(HttpStatus.BAD_REQUEST, msg));
        });
    });
  }

  //
  // Event stream
  //

  @websocket("events")
  @summary("Create an event-stream.")
  @description(
    "Update the connection to a WebSocket to receive a stream of IBApiEvent objects.</br>" +
      `To subscribe for a specific event type, send '${IBApiEventRequestType.Subscribe}:&lt;eventType&gt;'.</br>` +
      `To unsubscribe from a specific event type, send '${IBApiEventRequestType.Unsubscribe}:&lt;eventType&gt;'.</br>` +
      "Avaiable event types:</br><ul>" +
      `<li>${IBApiEventType.AccountSummaries}</li>` +
      `<li>${IBApiEventType.Positions}</li>` +
      `<li>${IBApiEventType.MarketData}</li>`,
  )
  @responseBody(IBApiEvent)
  createEventStream(stream: MicroserviceStream): void {
    // add to event channel list

    let channel: EventStreamChannel | undefined = new EventStreamChannel(
      stream,
      this.apiService,
    );

    this.eventStreamChannels.add(channel);

    stream.closed.then(() => {
      if (channel) {
        channel.close();
        this.eventStreamChannels.delete(channel);
      }
      channel = undefined;
    });

    // register message handler

    stream.onReceived = (message): void => {
      try {
        const tokens = message.split(":");
        if (tokens.length < 2) {
          return;
        }

        const cmd = tokens[0];
        const eventType = tokens[1];
        const eventArgs = tokens.length > 2 ? tokens.slice(2) : [];

        switch (cmd) {
          case IBApiEventRequestType.Subscribe:
            channel?.subscribeEvents(eventType as IBApiEventType, eventArgs);
            break;
          case IBApiEventRequestType.Unsubscribe:
            channel?.unsubscribeEvents(eventType as IBApiEventType, eventArgs);
            break;
        }
      } catch (e) {
        this.app.error(
          `Error during processing event-stream requests: ${JSON.stringify(e)}`,
        );
      }
    };
  }
}
