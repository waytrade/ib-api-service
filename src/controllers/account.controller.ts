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
import {AccountList} from "../models/account-list.model";
import {
  AccountSummary,
  AccountSummaryList
} from "../models/account-summary.model";
import {IBApiService} from "../services/ib-api.service";
import {SecurityUtils} from "../utils/security.utils";

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
    SecurityUtils.ensureAuthorization(req);
    return {
      accounts: await this.apiService.getManagedAccounts(),
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
    SecurityUtils.ensureAuthorization(req);
    return {
      summaries: this.apiService.getAccountSummariesSnapshot(),
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
    SecurityUtils.ensureAuthorization(req);
    const paths = req.url.split("/");
    const summary = this.apiService.getAccountSummarySnapshot(paths[paths.length - 1]);
    if (!summary) {
      throw new HttpError(HttpStatus.NOT_FOUND, "Invalid account id");
    }
    return summary;
  }
}
