import {arrayProperty, model, property} from "@waytrade/microservice-core";

/**
 * An account summary.
 */
@model("An account summary")
export class AccountSummary {
  /** The name of the account. */
  @property("The name of the account.")
  account?: string;

  /** Account base currency. */
  @property("The account base currency.")
  baseCurrency?: string;

  /**
   * The basis for determining the price of the assets in your account.
   * Total cash value + stock value + options value + bond value.
   */
  @property("Total cash value + stock value + options value + bond value.")
  netLiquidation?: number;

  /** Total cash balance recognized at the time of trade + futures PNL. */
  @property("Total cash balance recognized at the time of trade + futures PNL.")
  totalCashValue?: number;

  /**
   * Cash recognized at the time of settlement, without purchases at the time of
   * trade, commissions, taxes and fees.
   */
  @property(
    "Cash recognized at the time of settlement, without purchases at " +
      " the time of  trade, commissions, taxes and fees.",
  )
  settledCash?: number;

  /**
   * Buying power serves as a measurement of the dollar value of securities
   * that one may purchase in a securities account without depositing
   * additional funds
   */
  @property("Total buying power.")
  buyingPower?: number;

  /** The sum of the absolute value of all stock and equity option positions. */
  @property(
    "The sum of the absolute value of all stock and equity option positions.",
  )
  grossPositionValue?: number;

  /** Initial Margin requirement of whole portfolio. */
  @property("Initial Margin requirement of whole portfolio.")
  initMarginReq?: number;

  /** Maintenance Margin requirement of whole portfolio. */
  @property("Maintenance Margin requirement of whole portfolio.")
  maintMarginReq?: number;

  /** Initial Margin requirement of whole portfolio. */
  @property("Initial Margin requirement of whole portfolio.")
  fullInitMarginReq?: number;

  /** Maintenance Margin of whole portfolio. */
  @property("Maintenance Margin of whole portfolio.")
  fullMaintMarginReq?: number;

  /** Available funds of whole portfolio. */
  @property("Available funds of whole portfolio.")
  fullAvailableFunds?: number;

  /** Excess liquidity of whole portfolio. */
  @property("Excess liquidity of whole portfolio.")
  fullExcessLiquidity?: number;

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

/**
 * A update on account summaries.
 */
@model("An update on the account summaries.")
export class AccountSummariesUpdate {
  /** List of changed account summaries. */
  @arrayProperty(AccountSummary, "List of changed account summaries")
  summaries?: AccountSummary[];
}

/**
 * A Webhook callback subscription on account summaries
 */
@model("A Webhook callback subscription on account summaries.")
export class AccountSummaryCallbackSubscription {
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

  /**
   * An id that describes the subscription instance.
   * This is to enure that after a reboot, when callback and port are still same,
   * the subscription is required because of different instance id.
   */
  @property("An id that describes the subscription instance.")
  instanceId?: string;
}
