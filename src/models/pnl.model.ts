import {model} from "@waytrade/microservice-core";

/**
 * Daily Profit & Loss information.
 */
@model("Daily Profit & Loss information.")
export class PnL {
  /** The daily PnL. */
  dailyPnL?: number;
  /** The daily unrealized PnL. */
  unrealizedPnL?: number;
  /** The daily realized PnL. */
  realizedPnL?: number;
}
