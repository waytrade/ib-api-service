import {model, property} from "@waytrade/microservice-core";

/**
 * The connection state to IB Gateway.
 */
@model("The connection state to IB Gateway.")
export class ConnectionState {
  /** true if connected to IB Gateway, false otherwise. */
  @property("true if connected to IB Gateway, false or undefined otherwise.")
  connected?: boolean;

  /**
   * Time (UNIX) when to connection to IB Gateway was established,
   * or undefined if not connected.
   */
  @property(
    "Time (UNIX) when to connection to IB Gateway was established, or undefined if not connected",
  )
  connectionTime?: number;
}
