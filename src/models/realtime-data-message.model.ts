import {enumProperty, model, property} from "@waytrade/microservice-core";
import {AccountSummary} from "./account-summary.model";
import {MarketData} from "./market-data.model";
import {Position} from "./position.model";

/**
 * Type of a real-time data message.
 */
export enum RealtimeDataMessageType {
  Subscribe = "subscribe",
  Unsubscribe = "unsubscribe",
  Publish = "publish",
  Unpublish = "unpublish",
}

/** Payload of a real-time data error message. */
@model("Payload of a real-time data error message.")
export class RealtimeDataError {
  /** The error code. */
  @property("The error code.")
  code?: number;

  /** The error description. */
  @property("The error description")
  desc?: string;
}

/** Payload of a real-time data message. */
@model("Payload of a message on the live-data stream.")
export class RealtimeDataMessagePayload {
  @property("Update on the account summary.")
  accountSummary?: AccountSummary;

  @property("Updated position.")
  position?: Position;

  @property("Updated market data.")
  marketdata?: MarketData;
}

/** A message on the real-time data stream. */
@model("A message on the real-time data stream.")
export class RealtimeDataMessage {
  /** The message topic. */
  @property("The message topic.")
  topic!: string;

  @property(
    "If valid, this a error mesaage and this attribute provides details " +
      "about the error",
  )
  error?: RealtimeDataError;

  /** The message type. 'publish' if not specified. */
  @enumProperty(
    "RealtimeDataMessageType",
    RealtimeDataMessageType,
    "The message type.  'publish' if not specified.",
  )
  type?: RealtimeDataMessageType;

  /** The message data payload. */
  @property("The message data payload.")
  data?: RealtimeDataMessagePayload;
}
