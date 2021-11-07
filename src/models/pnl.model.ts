import {model, property} from "@waytrade/microservice-core";

/**
 * Daily Profit & Loss information.
 */
@model("Daily Profit & Loss information.")
export class PnL {
  /** The daily PnL. */
  @property("The daily PnL.")
  dailyPnL?: number;

  /** The daily unrealized PnL. */
  @property("The daily unrealized PnL.")
  unrealizedPnL?: number;

  /** The daily realized PnL. */
  @property("The daily realized PnL.")
  realizedPnL?: number;
}
