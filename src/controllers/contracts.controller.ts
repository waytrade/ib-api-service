import {
  bearerAuth,
  controller,
  description,
  get,
  HttpError,
  HttpStatus,
  inject,
  MicroserviceRequest,
  post,
  queryParameter,
  requestBody,
  response,
  responseBody,
  summary,
} from "@waytrade/microservice-core";
import {ContractDetailsList} from "../models/contract-details.model";
import {Contract} from "../models/contract.model";
import {IBApiService} from "../services/ib-api.service";
import {SecurityUtils} from "../utils/security.utils";

/** The contracts database controller. */
@controller("Contracts", "/contracts")
export class ContractsController {
  @inject("IBApiService")
  private apiService!: IBApiService;

  //
  // REST functions
  //

  @post("/search")
  @summary("Search contract details.")
  @description("Search for contract details that match the given criteria")
  @requestBody(Contract)
  @responseBody(ContractDetailsList)
  async searchContract(
    req: MicroserviceRequest,
    params: Contract,
  ): Promise<ContractDetailsList> {
    SecurityUtils.ensureAuthorization(req);

    try {
      const details = await this.apiService.getContractDetails(params);
      return {
        details,
      } as ContractDetailsList;
    } catch (e) {
      throw new HttpError(HttpStatus.INTERNAL_SERVER_ERROR, (<Error>e).message);
    }
  }

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

    // verify arguments

    const conId = Number(req.queryParams.conId);
    if (conId === undefined || isNaN(conId)) {
      throw new HttpError(
        HttpStatus.BAD_REQUEST,
        "Missing conId parameter on query",
      );
    }

    // get contract details

    const details = await this.apiService.getContractDetails({
      conId,
    });

    return {
      details,
    } as ContractDetailsList;
  }
}
