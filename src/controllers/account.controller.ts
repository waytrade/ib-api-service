import {
  bearerAuth,
  controller,
  description,
  get, HttpError, HttpStatus,
  inject,
  MicroserviceRequest,
  pathParameter,
  response,
  responseBody,
  summary
} from "@waytrade/microservice-core";
import {firstValueFrom} from "rxjs";
import {AccountList} from "../models/account-list.model";
import {
  AccountSummary,
  AccountSummaryList
} from "../models/account-summary.model";
import {PositionList} from "../models/position-list.model";
import {IBApiService} from "../services/ib-api.service";

/** The account information controller. */
@controller("Account", "/account")
export class AccountController {
  @inject("IBApiService")
  private apiService!: IBApiService;

  @get("/managedAccounts")
  @summary("Get the managed accounts.")
  @description("Get the accounts to which the logged user has access to.")
  @response(HttpStatus.UNAUTHORIZED, "Missing or invalid authorization header.")
  @responseBody(AccountList)
  @bearerAuth([])
  async getManagedAccounts(req: MicroserviceRequest): Promise<AccountList> {
    return {
      accounts: await this.apiService.managedAccounts,
    };
  }

  @get("/accountSummaries")
  @summary("Get a snapshot the account summaries.")
  @description(
    "Get a snapshot of the account summaries of all managed accounts.</br> " +
      "Use Real-time Data endpoint for receiving realtime updates.",
  )
  @response(HttpStatus.UNAUTHORIZED, "Missing or invalid authorization header.")
  @responseBody(AccountSummaryList)
  @bearerAuth([])
  async getAccountSummaries(
    req: MicroserviceRequest,
  ): Promise<AccountSummaryList> {
    return {
      summaries: await firstValueFrom(this.apiService.accountSummaries)
    };
  }

  @get("/accountSummary/{account}")
  @pathParameter("account", String, "The account id")
  @summary("Get a snapshot of a account summary.")
  @description(
    "Get a snapshot of the current account summary of a given account.</br> " +
      "Use Real-time Data endpoint for receiving realtime updates.",
  )
  @response(HttpStatus.UNAUTHORIZED, "Missing or invalid authorization header.")
  @responseBody(AccountSummary)
  @bearerAuth([])
  async getAccountSummary(req: MicroserviceRequest): Promise<AccountSummary> {
    const paths = req.url.split("/");
    const summary = await firstValueFrom(
      this.apiService.getAccountSummary(paths[paths.length - 1])
    );

    if (!summary || !summary.baseCurrency) {
      throw new HttpError(HttpStatus.NOT_FOUND, "Invalid account id");
    }

    return summary;
  }

  @get("/positions")
  @summary("Get a snapshot of all open positions.")
  @description(
    "Get a snapshot of all open positions on all managed accounts.</br> " +
      "Use Real-time Data endpoint for receiving realtime updates.",
  )
  @response(HttpStatus.UNAUTHORIZED, "Missing or invalid authorization header.")
  @responseBody(PositionList)
  @bearerAuth([])
  async getPositions(req: MicroserviceRequest): Promise<PositionList> {
    return {
      positions: ((await firstValueFrom(this.apiService.positions))?.changed) ?? []
    };
  }
}
