import {arrayProperty, model} from "@waytrade/microservice-core";

/**
 * A list of account IDs.
 */
@model("A list of account ID's")
export class AccountList {
  /** The account ID's. */
  @arrayProperty(String, "The account ID's.")
  accounts?: string[];
}
