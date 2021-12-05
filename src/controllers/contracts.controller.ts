import {
  bearerAuth,
  controller,
  description,
  get,
  HttpError,
  HttpStatus,
  inject,
  MicroserviceRequest, post, queryParameter, requestBody, response,
  responseBody,
  summary
} from "@waytrade/microservice-core";
import {ContractDescriptionList} from "../models/contract-description.model";
import {ContractDetailsList} from "../models/contract-details.model";
import {Contract} from "../models/contract.model";
import {IBApiService} from "../services/ib-api.service";
import {SecurityUtils} from "../utils/security.utils";

/** The contracts database controller. */
@controller("Contracts", "/contracts")
export class ContractsController {
  @inject("IBApiService")
  private apiService!: IBApiService;

  @get("/search")
  @summary("Search contracts.")
  @description("Search contracts where name or symbol matches the given text pattern.")
  @queryParameter("pattern", String, true, "The  text pattern.")
  @responseBody(ContractDescriptionList)
  @response(HttpStatus.BAD_REQUEST)
  @response(HttpStatus.UNAUTHORIZED, "Missing or invalid authorization header.")
  @bearerAuth([])
  async searchContract(
    req: MicroserviceRequest,
  ): Promise<ContractDescriptionList> {
    SecurityUtils.ensureAuthorization(req);

    const pattern = req.queryParams.pattern as string;
    if (pattern === undefined) {
      throw new HttpError(
        HttpStatus.BAD_REQUEST,
        "Missing pattern parameter on query",
      );
    }

    try {
      return {
        descs: await this.apiService.searchContracts(pattern)
      } as ContractDescriptionList;
    } catch (e) {
      throw new HttpError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        (<Error>e).message,
      );
    }
  }

  @post("/details")
  @summary("Get contract details.")
  @description("Get the contract details of a given contract ID.")
  @response(HttpStatus.BAD_REQUEST)
  @response(HttpStatus.UNAUTHORIZED, "Missing or invalid authorization header.")
  @requestBody(Contract)
  @responseBody(ContractDetailsList)
  @bearerAuth([])
  async getContractDetails(
    req: MicroserviceRequest,
    contract: Contract,
  ): Promise<ContractDetailsList> {
    SecurityUtils.ensureAuthorization(req);

    try {
      return {
        details: await this.apiService.getContractDetails(contract)
      } as ContractDetailsList;
    } catch (e) {
      throw new HttpError(
        HttpStatus.BAD_REQUEST,
        (<Error>e).message,
      );
    }
  }

  @get("/detailsById")
  @summary("Get contract details by conId.")
  @description("Get the contract details of a given contract ID.")
  @queryParameter("conId", Number, true, "The IB contract ID.")
  @response(HttpStatus.BAD_REQUEST)
  @response(HttpStatus.NOT_FOUND, "Contract not found.")
  @response(HttpStatus.UNAUTHORIZED, "Missing or invalid authorization header.")
  @responseBody(ContractDetailsList)
  @bearerAuth([])
  async getContractDetailsById(
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

    try {
      return {
        details: await this.apiService.getContractDetails({
          conId,
        })
      } as ContractDetailsList;
    } catch (e) {
      throw new HttpError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        (<Error>e).message,
      );
    }
  }
}
