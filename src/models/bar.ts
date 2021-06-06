import {arrayProperty, model, property} from "@waytrade/microservice-core";

/**
 * A Open/High/Low/Close Bar.
 */
@model("A Open/High/Low/Close Bar")
export class OHLCBar {
  /** The date/time (UNIX). */
  @property("The date/time (UNIX).")
  time?: number;

  /** The open price. */
  @property("The open price.")
  open?: number;

  /** The high price. */
  @property("The high price.")
  high?: number;

  /** The low price. */
  @property("The low price.")
  low?: number;

  /** The close price. */
  @property("The close price.")
  close?: number;

  /** The traded volume if available. */
  @property("The traded volume if available.")
  volume?: number;

  /** The Weighted Average Price. */
  @property("The Weighted Average Price.")
  WAP?: number;

  /** The number of trades. */
  @property("The number of trades.")
  count?: number;
}

/**
 * Open/High/Low/Close Bars.
 */
@model("Open/High/Low/Close Bars")
export class OHLCBars {
  /** The number of trades. */
  @arrayProperty(OHLCBar, "The bars.")
  bars?: OHLCBar[];
}
