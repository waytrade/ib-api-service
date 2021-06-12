import {
  callback,
  controller,
  description,
  get,
  HttpError,
  MicroserviceRequest,
  pathParameter,
  post,
  queryParameter,
  requestBody,
  response,
  responseBody,
  summary,
  WebhookCallbackSubscriptions,
} from "@waytrade/microservice-core";
import HttpStatus from "http-status";
import {firstValueFrom} from "rxjs";
import {IBApiApp} from "..";
import {
  AccountSummariesUpdate,
  AccountSummaryCallbackSubscription,
} from "../models/account-summary.model";
import {OHLCBars} from "../models/bar";
import {ContractDetails} from "../models/contract-details.model";
import {
  MarketDataCallbackSubscription,
  MarketDataUpdate,
} from "../models/market-data.model";
import {
  Position,
  PositionsCallbackSubscription,
  PositionsUpdate,
} from "../models/position.model";
import {IBApiService} from "../services/ib-api-service";

/**
 * The IBApi endpoint + controller.
 */
@controller("IB Api Endpoint")
export class IBApiController {
  /** Webhook failure callback. */
  private static logFailedWebhook(url: string, error: Error): void {
    IBApiApp.warn("Failed to POST " + url + ": " + error.message);
  }

  /** List of currently active account summary webhooks. */
  private static accountSummaryHooks = new WebhookCallbackSubscriptions<AccountSummariesUpdate>(
    (url, error): void => IBApiController.logFailedWebhook(url, error),
  );

  /** List of currently active position list webhooks. */
  private static positionsHooks = new WebhookCallbackSubscriptions<PositionsUpdate>(
    (url, error): void => IBApiController.logFailedWebhook(url, error),
  );

  /** List of currently active contract market data feed webhooks. */
  private static contractMarketDataHooks = new WebhookCallbackSubscriptions<MarketDataUpdate>(
    (url, error): void => IBApiController.logFailedWebhook(url, error),
  );

  /** List of currently active fx market data feed webhooks. */
  private static fxMarketDataHooks = new WebhookCallbackSubscriptions<MarketDataUpdate>(
    (url, error): void => IBApiController.logFailedWebhook(url, error),
  );

  //
  // Service functions
  //

  /** Shutdown the controller. */
  static shutdown(): void {
    this.positionsHooks.clear();
    this.contractMarketDataHooks.clear();
    this.fxMarketDataHooks.clear();
  }

  //
  // Endpoint functions
  //

  @post("/accountSummaries")
  @summary("Get the account summaries.")
  @description("Get a snapshot of the current account summaries.")
  @responseBody(AccountSummariesUpdate)
  static async getAccountSummaries(): Promise<AccountSummariesUpdate> {
    return firstValueFrom(IBApiService.getAccountSummaries());
  }

  @post("/subscribeAccountSummaries")
  @summary("Subscribe to account summary updates.")
  @description("Subscribe to receive account summary updates via Webhook.")
  @response(201, "New subscription created.")
  @response(204, "The subscription already exists, no acton.")
  @response(400)
  @requestBody(AccountSummaryCallbackSubscription)
  @callback("{$request.body#/callbackUrl}", AccountSummariesUpdate)
  static subscribeAccountSummaries(
    request: MicroserviceRequest,
    params: AccountSummaryCallbackSubscription,
  ): void {
    // verify arguments

    if (!params.callbackUrl || !params.port) {
      throw new HttpError(400);
    }

    // add callback subscription

    const newHookAdded = this.accountSummaryHooks.add(
      params.host ?? request.remoteAddress,
      params.port,
      params.callbackUrl,
      IBApiService.getAccountSummaries(),
    );

    throw new HttpError(newHookAdded ? 201 : 204);
  }

  @get("/positions")
  @summary("Get all positions.")
  @description("Get a snapshot of currently open positions.")
  @responseBody(PositionsUpdate)
  static async getPositions(): Promise<PositionsUpdate> {
    return await firstValueFrom(IBApiService.getPositions());
  }

  @post("/positions")
  @summary("Subscribe to position updates.")
  @description("Subscribe to receive position updates via Webhook.")
  @response(201, "New subscription created.")
  @response(204, "The subscription already exists, no acton.")
  @response(400)
  @requestBody(PositionsCallbackSubscription)
  @callback("{$request.body#/callbackUrl}", PositionsUpdate)
  static subscribePositions(
    request: MicroserviceRequest,
    params: PositionsCallbackSubscription,
  ): void {
    // verify arguments

    if (!params.callbackUrl || !params.port) {
      throw new HttpError(400);
    }

    // add webhook

    const newHookAdded = this.positionsHooks.add(
      params.host ?? request.remoteAddress,
      params.port,
      params.callbackUrl,
      IBApiService.getPositions(),
    );

    throw new HttpError(newHookAdded ? 201 : 204);
  }

  @get("/position/{id}")
  @summary("Get a position.")
  @description("Get a snapshot of the positions with given position id.")
  @pathParameter("id", String, "The position id")
  @responseBody(Position)
  static async getPosition(request: MicroserviceRequest): Promise<Position> {
    const paths = request.url?.split("/");
    if (paths.length < 4) {
      throw new HttpError(HttpStatus.BAD_REQUEST);
    }
    const id = unescape(paths[3]);
    const positions = await firstValueFrom(IBApiService.getPositions());
    const position = positions.all?.find(pos => pos.id === id);
    if (!position) {
      throw new HttpError(HttpStatus.NOT_FOUND);
    }
    return position;
  }

  @get("/contractDetails")
  @summary("Get contract details.")
  @description("Get contract details of the contract id.")
  @queryParameter("conid", Number, true, "The IB contract id.")
  @response(504, "Not connect to IB Gateway.")
  @responseBody(ContractDetails)
  static async getContractDetails(
    request: MicroserviceRequest,
  ): Promise<ContractDetails> {
    // verify state and arguments

    const conid = Number(request.queryParams.conid);
    if (conid === undefined || conid == NaN) {
      throw new HttpError(400);
    }

    // request contract details

    return await IBApiService.getContractDetails(conid);
  }

  @post("/marketData")
  @summary("Subscribe to realtime market data.")
  @description("Subscribe to a realtime market data feed via Webhook.")
  @response(201, "New subscription created.")
  @response(204, "The subscription already exists, no acton.")
  @response(400)
  @requestBody(MarketDataCallbackSubscription)
  @callback("{$request.body#/callbackUrl}", MarketDataUpdate)
  static subscribeMarketData(
    request: MicroserviceRequest,
    params: MarketDataCallbackSubscription,
  ): void {
    // verify arguments

    if (
      !params.callbackUrl ||
      !params.port ||
      (!params.conId && !params.fxPair)
    ) {
      throw new HttpError(400);
    }

    // add webhook

    let newHookAdded = false;

    if (params.conId) {
      newHookAdded = this.contractMarketDataHooks.add(
        params.host ?? request.remoteAddress,
        params.port,
        params.callbackUrl,
        IBApiService.getMarketData(params.conId),
        "" + params.conId,
      );
    } else if (params.fxPair) {
      const c0 = params.fxPair.substr(0, 3);
      const c1 = params.fxPair.substr(3);
      newHookAdded = this.fxMarketDataHooks.add(
        params.host ?? request.remoteAddress,
        params.port,
        params.callbackUrl,
        IBApiService.getFxMarketData(c0, c1),
        params.fxPair,
      );
    }

    throw new HttpError(newHookAdded ? 201 : 204);
  }

  @get("/historicalData")
  @summary("Get a contracts historical data.")
  @description("Get a contracts historical data.")
  @queryParameter("conid", Number, true, "The IB contract id.")
  @queryParameter(
    "duration",
    String,
    true,
    "The amount of time for which the data needs to be retrieved",
  )
  @queryParameter("barSize", String, true, "The size of the bar")
  @queryParameter("endTime", String, false, "End time (now if undefined)")
  @responseBody(OHLCBars)
  static async getHistoricalData(
    request: MicroserviceRequest,
  ): Promise<OHLCBars> {
    const conid = Number(request.queryParams.conid);
    if (conid === undefined || conid == NaN) {
      throw new HttpError(400);
    }
    const duration = request.queryParams.duration as string;
    if (duration === undefined) {
      throw new HttpError(400);
    }
    const barSize = request.queryParams.barSize as string;
    if (barSize === undefined) {
      throw new HttpError(400);
    }

    let endTime = request.queryParams.endTime as string;
    if (!endTime) {
      const now = new Date();
      endTime = `${now.getFullYear()}${("0" + (now.getMonth() + 1)).slice(
        -2,
      )}${("0" + now.getDate()).slice(-2)} ${("0" + now.getHours()).slice(
        -2,
      )}:${("0" + now.getMinutes()).slice(-2)}:${("0" + now.getSeconds()).slice(
        -2,
      )}`;
    }

    return new Promise<OHLCBars>((resolve, reject) => {
      IBApiService.getHistoricalData(
        conid,
        endTime,
        duration,
        barSize,
        "TRADES",
      )
        .then(data => resolve(data))
        .catch(ibError => {
          reject(new HttpError(500, ibError.error.message));
        });
    });
  }
}
