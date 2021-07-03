import {arrayProperty, model, property} from "@waytrade/microservice-core";
import {ContractDetails} from "./contract-details.model";
import {Contract} from "./contract.model";

/**
 * A position on an IBKR account.
 */
@model("An positions on an IBKR account")
export class Position {
  @property("The positions id.")
  id?: string;

  @property("The position's contract.")
  contract?: Contract;

  @property("The position's contract details.")
  details?: ContractDetails;

  /** The number of positions held. */
  @property("The number of positions held.")
  pos?: number;

  /** The daily PnL. */
  @property("The daily PnL.")
  dailyPnL?: number;

  /** The daily unrealized PnL. */
  @property("The daily unrealized PnL.")
  unrealizedPnL?: number;

  /** The daily realized PnL. */
  @property("The daily realized PnL.")
  realizedPnL?: number;

  /** The average cost of the position. */
  @property("The average cost of the position.")
  avgCost?: number;

  /** The current market value of the position. */
  @property("The current market value of the position.")
  marketValue?: number;
}

/**
 * An update the positions.
 */
@model("An update the positions.")
export class PositionsUpdate {
  /** List all positions. */
  @arrayProperty(Position, "List all positions. Only send on full-syncs.")
  all?: Position[];

  /** List of added or changed positions since last update. */
  @arrayProperty(
    Position,
    "List of added or changed positions since last update.",
  )
  changed?: Position[];

  /** List of closed positions since last update. */
  @arrayProperty(String, "List of closed positions since last update.")
  closed?: string[];
}

/**
 * A Webhook callback subscription on the positions.
 */
@model("A Webhook callback subscription on the positions.")
export class PositionsCallbackSubscription {
  /**The hostname of the callback server. */
  @property(
    "The hostname of the callback server. The connection peer address will be used if not specified.",
  )
  host?: string;

  /**The port number of the callback server. */
  @property("The port number of the callback server.")
  port?: number;

  /** The callback url. */
  @property("The callback url.")
  callbackUrl?: string;
}
