import {model, property} from "@waytrade/microservice-core";

/**
 * An error event.
 */
@model("An error event")
export class IBApiError {
  constructor(contract: IBApiError) {
    Object.assign(this, contract);
  }

  /** The error message. */
  @property("The error message.")
  message!: string;

  /** The subscriptionn key. */
  @property("The subscriptionn key.")
  skey?: string;
}
