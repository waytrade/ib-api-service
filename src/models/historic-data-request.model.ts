import {enumProperty, model, property} from "@waytrade/microservice-core";

export enum BarSize {
  SECONDS_ONE = "1 secs",
  SECONDS_FIVE = "5 secs",
  SECONDS_TEN = "10 secs",
  SECONDS_FIFTEEN = "15 secs",
  SECONDS_THIRTY = "30 secs",
  MINUTES_ONE = "1 min",
  MINUTES_TWO = "2 mins",
  MINUTES_THREE = "3 mins",
  MINUTES_FIVE = "5 mins",
  MINUTES_TEN = "10 mins",
  MINUTES_FIFTEEN = "15 mins",
  MINUTES_TWENTY = "20 mins",
  MINUTES_THIRTY = "30 mins",
  HOURS_ONE = "1 hour",
  HOURS_TWO = "2 hours",
  HOURS_THREE = "3 hours",
  HOURS_FOUR = "4 hours",
  HOURS_EIGHT = "8 hours",
  DAYS_ONE = "1 day",
  WEEKS_ONE = "1W",
  MONTHS_ONE = "1M"
}

export enum WhatToShow {
  TRADES = "TRADES",
  MIDPOINT = "MIDPOINT",
  BID = "BID",
  ASK = "ASK",
  BID_ASK = "BID_ASK",
  HISTORICAL_VOLATILITY = "HISTORICAL_VOLATILITY",
  OPTION_IMPLIED_VOLATILITY = "OPTION_IMPLIED_VOLATILITY",
  FEE_RATE = "FEE_RATE",
  REBATE_RATE = "REBATE_RATE"
}

/**
 * A historic data request.
 */
@model("A historic data request arguments.")
export class HistoricDataRequestArguments {
  /** The contract id. */
  @property("The contract id.")
  conId!: number;

  /** The duration, in format '[n] S' (seconds), '[n] D' (days), '[n] W' (weeks), '[n] M' (months), '[n] Y' (years). */
  @property("The duration, in format '[n] S' (seconds), '[n] D' (days), '[n] W' (weeks), '[n] M' (months), '[n] Y' (years).")
  duration!: string;

  /** The bar size. */
  @enumProperty("BarSize", BarSize, "The bar size.")
  barSize!: BarSize;

  /** Data type to show. */
  @enumProperty("WhatToShow", WhatToShow, "Data type to show.")
  whatToShow!: WhatToShow;
 }
