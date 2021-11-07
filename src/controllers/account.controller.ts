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
import {firstValueFrom} from "rxjs";
import {AccountList} from "../models/account-list.model";
import {PnL} from "../models/pnl.model";
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

    const accounts = await this.apiService.getManagedAccounts();
    return {
      accounts: accounts,
    };
  }

  @get("/pnl")
  @summary("Get the Profit&Loss of an account.")
  @description("Get a snapshot of the current Profit&Loss on a given account.")
  @queryParameter("account", String, true, "The IB account ID.")
  @response(HttpStatus.BAD_REQUEST)
  @response(HttpStatus.UNAUTHORIZED, "Missing or invalid authorization header.")
  @responseBody(PnL)
  @bearerAuth([])
  async getPnL(req: MicroserviceRequest): Promise<PnL> {
    SecurityUtils.ensureAuthorization(req);

    const account = req.queryParams.account as string;
    if (account === undefined) {
      throw new HttpError(
        HttpStatus.BAD_REQUEST,
        "Missing account parameter on query",
      );
    }

    return await firstValueFrom(this.apiService.getPnL(account));
  }
}
