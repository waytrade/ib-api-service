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
import {
  EventStreamCommand,
  EventToStreamDispatcher,
} from "@waytrade/microservice-core/dist/util/event-to-stream-dispatcher";
import {Observable} from "rxjs";
import {IBApiApp} from "../app";
import {AccountSummary} from "../models/account-summary.model";
import {ContractDetails} from "../models/contract-details.model";
import {IBApiEvent} from "../models/ib-api-event";
import {MarketDataUpdate} from "../models/market-data.model";
import {PositionsUpdate} from "../models/position.model";
import {IBApiService} from "../services/ib-api.service";

/** An event source from IBApiService. */
type IBApiEventSource = (
  service: IBApiService,
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

/**
 * The IBApi endpoint + controller.
 */
@controller("IB Api Endpoint", "/")
export class IBApiController {
  @inject("IBApiApp")
  private app!: IBApiApp;

  @inject("IBApiService")
  private apiService!: IBApiService;

  //
  // REST functions
  //

  @get("contractDetails")
  @summary("Get contract details.")
  @description("Get contract details of the contract id.")
  @queryParameter("conId", Number, true, "The IB contract id.")
  @response(HttpStatus.BAD_REQUEST)
  @response(HttpStatus.NOT_FOUND)
  @responseBody(ContractDetails)
  async getContractDetails(
    request: MicroserviceRequest,
  ): Promise<ContractDetails> {
    // verify state and arguments

    const conId = Number(request.queryParams.conId);
    if (conId === undefined || isNaN(conId)) {
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
          reject(new HttpError(HttpStatus.NOT_FOUND, msg));
        });
    });
  }

  //
  // Event stream
  //

  /** A map of all event types, with function to get the source Observable. */
  private readonly EVENT_SOURCES = new Map<IBApiEventType, IBApiEventSource>([
    [
      IBApiEventType.AccountSummaries,
      (service: IBApiService): Observable<AccountSummary[]> => {
        return service.accountSummaries;
      },
    ],
    [
      IBApiEventType.Positions,
      (service: IBApiService): Observable<PositionsUpdate> => {
        return service.positions;
      },
    ],
    [
      IBApiEventType.MarketData,
      (service: IBApiService, args: string[]): Observable<MarketDataUpdate> => {
        if (args[0]) {
          return service.getMarketData(Number(args[0]));
        } else {
          return new Observable(res =>
            res.error(new Error("Invalid request: no conId argument")),
          );
        }
      },
    ],
  ]);

  @websocket("events")
  @summary("Create an event-stream.")
  @description(
    "Update the connection to a WebSocket to receive a stream of IBApiEvent objects.</br>" +
      `To subscribe for a specific event type, send '${EventStreamCommand.Subscribe}:&lt;eventType&gt;'.</br>` +
      `To unsubscribe from a specific event type, send '${EventStreamCommand.Unsubscribe}:&lt;eventType&gt;'.</br>` +
      "Avaiable event types:</br><ul>" +
      `<li>${IBApiEventType.AccountSummaries}</li>` +
      `<li>${IBApiEventType.Positions}</li>` +
      `<li>${IBApiEventType.MarketData}:<conId></li>`,
  )
  @responseBody(IBApiEvent)
  createEventStream(stream: MicroserviceStream): void {
    new EventToStreamDispatcher(stream, this.apiService, this.EVENT_SOURCES);
  }
}
