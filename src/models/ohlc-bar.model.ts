import {arrayProperty, model, property} from "@waytrade/microservice-core";

/**
 * A OHLC bar.
 */
@model("A OHLC bar.")
export class OHLCBar {
  /** The date and time (as a yyyymmss hh:mm:ss). */
  @property("The date and time (as a yyyymmss hh:mm:ss).")
  time?: string;

  /** The open price. */
  @property("The open price.")
  open?: number;

  /** The high price. */
  @property("The high price")
  high?: number;

  /** The low price. */
  @property("The low price.")
  low?: number;

  /** The close price. */
  @property(" The close price.")
  close?: number;

  /** The traded volume if available (only available for TRADES). */
  @property("The traded volume if available (only available for TRADES).")
  volume?: number;

  /** The Weighted Average Price (only available for TRADES). */
  @property("The Weighted Average Price (only available for TRADES).")
  WAP?: number;

  /** The number of trades during the bar timespan (only available for TRADES). */
  @property("The number of trades during the bar timespan (only available for TRADES).")
  count?: number;
}

/**
 * A chart bar.
 */
 @model("A list of OHLC bars.")
 export class OHLCBars {
   @arrayProperty(OHLCBar, "The bars")
   bars?: OHLCBar[];
 }
