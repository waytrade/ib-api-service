import {model, property} from "@waytrade/microservice-core";

/**
 * An account summary.
 */
@model("An account summary")
export class AccountSummary {
  constructor(summary: AccountSummary) {
    Object.assign(this, summary);
  }

  /** The name of the account. */
  @property("The name of the account.")
  account!: string;

  /** Account base currency. */
  @property("The account base currency.")
  baseCurrency?: string;

  /**  Identifies the IB account structure. */
  @property(" Identifies the IB account structure.")
  accountType?: string;

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
   * Total accrued cash value of stock, commodities and securities.
   */
  @property("Total accrued cash value of stock, commodities and securities.")
  accruedCash?: number;

  /**
   * Buying power serves as a measurement of the dollar value of securities
   * that one may purchase in a securities account without depositing
   * additional funds
   */
  @property("Total buying power.")
  buyingPower?: number;

  /**
   * Forms the basis for determining whether a client has the necessary assets
   * to either initiate or maintain security positions.
   * Cash + stocks + bonds + mutual funds.
   */
  @property("Cash + stocks + bonds + mutual funds.")
  equityWithLoanValue?: number;

  /**
   *  Marginable Equity with Loan value as of 16:00 ET the previous day
   */
  @property(
    " Marginable Equity with Loan value as of 16:00 ET the previous day.",
  )
  previousEquityWithLoanValue?: number;

  /** The sum of the absolute value of all stock and equity option positions. */
  @property(
    "The sum of the absolute value of all stock and equity option positions.",
  )
  grossPositionValue?: number;

  /** Regulation T margin for universal account. */
  @property("Regulation T margin for universal account.")
  regTEquity?: number;

  /** Regulation T margin for universal account. */
  @property("Regulation T margin for universal account.")
  regTMargin?: number;

  /**
   * Special Memorandum Account: Line of credit created when the market value
   * of securities in a Regulation T account increase in value.
   * */
  @property(
    "Special Memorandum Account: Line of credit created when the market " +
      "value of securities in a Regulation T account increase in value.",
  )
  SMA?: number;

  /** Initial Margin requirement of whole portfolio. */
  @property("Initial Margin requirement of whole portfolio.")
  initMarginReq?: number;

  /** Maintenance Margin requirement of whole portfolio. */
  @property("Maintenance Margin requirement of whole portfolio.")
  maintMarginReq?: number;

  /** This value tells what you have available for trading. */
  @property("This value tells what you have available for trading.")
  availableFunds?: number;

  /** This value shows your margin cushion, before liquidation. */
  @property("This value shows your margin cushion, before liquidation.")
  excessLiquidity?: number;

  /** Excess liquidity as a percentage of net liquidation value. */
  @property("Excess liquidity as a percentage of net liquidation value.")
  cushion?: number;

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

  /** Time when look-ahead values take effect. */
  @property("Time when look-ahead values take effect.")
  lookAheadNextChange?: number;

  /**
   * Initial Margin requirement of whole portfolio as of next
   * period's margin change.
   */
  @property(
    "Initial Margin requirement of whole portfolio as of next " +
      "period's margin change.",
  )
  lookAheadInitMarginReq?: number;

  /**
   * Maintenance Margin requirement of whole portfolio as of next
   * period's margin change.
   */
  @property(
    "Maintenance Margin requirement of whole portfolio as of next " +
      "period's margin change.",
  )
  lookAheadMaintMarginReq?: number;

  /** This value reflects your available funds at the next margin change. */
  @property(
    "This value reflects your available funds at the next margin change.",
  )
  lookAheadAvailableFunds?: number;

  /** This value reflects your excess liquidity at the next margin change. */
  @property(
    "This value reflects your excess liquidity at the next margin change.",
  )
  lookAheadExcessLiquidity?: number;

  /** A measure of how close the account is to liquidation. */
  @property("A measure of how close the account is to liquidation.")
  highestSeverity?: number;

  /**
   * The Number of Open/Close trades a user could put on before Pattern
   * Day Trading is detected. A value of "-1" means that the user can put on
   *  unlimited day trades.
   */
  @property(
    "The Number of Open/Close trades a user could put on before " +
      "Pattern Day Trading is detected. A value of -1 means that the user " +
      "can put on unlimited day trades.",
  )
  dayTradesRemaining?: number;

  /** GrossPositionValue / NetLiquidation. */
  @property("GrossPositionValue / NetLiquidation.")
  leverage?: number;

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
