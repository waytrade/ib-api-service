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

/** The Contracts Dataase controller. */
@controller("Contracts Dataase", "/contracts")
export class BrokerApiController {
  @inject("IBApiApp")
  private app!: IBApiApp;

  @inject("IBApiService")
  private apiService!: IBApiService;

  //
  // REST functions
  //

  @get("/details")
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
}
