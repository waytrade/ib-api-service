import {model, property} from "@waytrade/microservice-core";

/**
 * An account summary.
 */
@model("An account summary")
export class AccountSummary {
  constructor(contract: AccountSummary) {
    Object.assign(this, contract);
  }

  /** The name of the account. */
  @property("The name of the account.")
  account!: string;

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

  /** The daily unrealized PnL. */
  @property("The daily unrealized PnL.")
  dailyPnL?: number;

  /** The daily realized PnL. */
  @property("The daily realized PnL.")
  realizedPnL?: number;

  /** The daily unrealized PnL. */
  @property("The total unrealized PnL.")
  unrealizedPnL?: number;
}
