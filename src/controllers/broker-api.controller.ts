import {
  bearerAuth,
  controller,
  description,
  get,
  HttpError,
  HttpStatus,
  inject,
  MicroserviceRequest,
  queryParameter,
  response,
  responseBody,
  summary,
} from "@waytrade/microservice-core";
import {IBApiApp} from "../app";
import {ContractDetailsList} from "../models/contract-details.model";
import {IBApiService} from "../services/ib-api.service";
import {SecurityUtils} from "../utils/security.utils";

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

/** The Brokers API controller. */
@controller("Broker API", "/api")
export class BrokerApiController {
  @inject("IBApiApp")
  private app!: IBApiApp;

  @inject("IBApiService")
  private apiService!: IBApiService;

  //
  // REST functions
  //

  @get("/contractDetails")
  @summary("Get contract details.")
  @description("Get the contract details of a given contract ID.")
  @queryParameter("conId", Number, true, "The IB contract ID.")
  @response(HttpStatus.BAD_REQUEST)
  @response(HttpStatus.NOT_FOUND, "Contract not found.")
  @response(HttpStatus.UNAUTHORIZED, "Missing or invalid authorization header.")
  @responseBody(ContractDetailsList)
  @bearerAuth([])
  async getContractDetails(
    req: MicroserviceRequest,
  ): Promise<ContractDetailsList> {
    SecurityUtils.ensureAuthorization(req);

    // verify state and arguments

    const conId = Number(req.queryParams.conId);
    if (conId === undefined || isNaN(conId)) {
      throw new HttpError(
        HttpStatus.BAD_REQUEST,
        "Missing conId parameter on query",
      );
    }

    // request contract details

    const details = await this.apiService.getContractDetails(Number(conId));

    return {
      details,
    } as ContractDetailsList;
  }

  //
  // Event stream
  //

  /** A map of all event types, with function to get the source Observable.
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
  */
}
