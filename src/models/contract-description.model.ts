import {arrayProperty, model} from "@waytrade/microservice-core";
import {Contract} from "./contract.model";

/**
 * A contract description.
 */
 @model(" A contract description.")
 export class ContractDescription {
  /** The underlying contract. */
  contract?: Contract;

  /** Array of derivative security types. */
  derivativeSecTypes?: string[];
 }

/**
 * A list of contract descriprions.
 */
 @model("A list of contract descriprions.")
 export class ContractDescriptionList {
   @arrayProperty(ContractDescription, "Array of contract descriprions")
   descs?: ContractDescription[];
 }
