import {arrayProperty, model, property} from "@waytrade/microservice-core";
import {AccountSummary} from "./account-summary.model";
import {IBApiError} from "./error";
import {MarketData} from "./market-data.model";
import {PositionsUpdate} from "./position.model";

/**
 * An event as received my a client on the event-stream.
 */
@model("An event as received on the event-stream.")
export class IBApiEvent {
  @property("An error event.")
  error?: IBApiError;

  @arrayProperty(
    AccountSummary,
    "An update on the account summaries. " +
      "Send 'sub:accountSummaries' on event stream to subscribe. " +
      "Send 'unsub:accountSummaries' on event stream to unsubscribe.",
  )
  accountSummaries?: AccountSummary[];

  /** Update on inventorty positions. */
  @property(
    "An update on the inventory positions. " +
      "Send 'sub:positions' on event stream to subscribe. " +
      "Send 'unsub:positions' on event stream to unsubscribe.",
  )
  positions?: PositionsUpdate;

  /** Update on inventorty positions. */
  @property(
    "A market data update." +
      "Send 'sub:marketData:<conId>' on event stream to subscribe. " +
      "Send 'unsub:positions:<conId>' on event stream to unsubscribe.",
  )
  marketData?: MarketData;
}
