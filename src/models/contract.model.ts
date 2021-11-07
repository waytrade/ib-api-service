import * as IB from "@stoqey/ib";
import {OptionType, SecType} from "@stoqey/ib";
import {enumProperty, model, property} from "@waytrade/microservice-core";

/**
 * A contract on Interactive Brokers.
 */
@model("A contract on Interactive Brokers.")
export class Contract {
  constructor(contract: IB.Contract) {
    Object.assign(this, contract);
  }

  /** The unique IB contract identifier. */
  @property("The unique IB contract identifier.")
  conId?: number;

  /** The asset symbol. */
  @property("The asset symbol.")
  symbol?: string;

  /** The security type. */
  @enumProperty("SecType", SecType, "The security type.")
  secType?: SecType;

  /**
   * The contract's last trading day or contract month (for Options and Futures).
   *
   * Strings with format YYYYMM will be interpreted as the Contract Month
   * whereas YYYYMMDD will be interpreted as Last Trading Day.
   */
  @property("The contract's last trading day or contract month.")
  lastTradeDateOrContractMonth?: string;

  /** The option's strike price. */
  @property("The option's strike price.")
  strike?: number;

  /** Either Put or Call (i.e. Options). Valid values are P, PUT, C, CALL. */
  @enumProperty(
    "OptionType",
    OptionType,
    "Either Put or Call (i.e. Options). Valid values are P, PUT, C, CALL.",
  )
  right?: OptionType;

  /** The instrument's multiplier (i.e. options, futures). */
  @property("The instrument's multiplier (i.e. options, futures).")
  multiplier?: number;

  /** The destination exchange. */
  @property("The destination exchange.")
  exchange?: string;

  /** The trading currency. */
  @property("The trading currency.")
  currency?: string;

  /**
   * The contract's symbol within its primary exchange.
   * For options, this will be the OCC symbol.
   */
  @property("The contract's symbol within its primary exchange.")
  localSymbol?: string;

  /**
   * The contract's primary exchange. For smart routed contracts,
   * used to define contract in case of ambiguity.
   * Should be defined as native exchange of contract, e.g. ISLAND for MSFT.
   * For exchanges which contain a period in name, will only be part of exchange
   * name prior to period, i.e. ENEXT for ENEXT.BE.
   */
  @property("The contract's primary exchange.")
  primaryExch?: string;

  /**
   * The trading class name for this contract.
   * Available in TWS contract description window as well.
   * For example, GBL Dec '13 future's trading class is "FGBL".
   */
  @property("The trading class name for this contract.")
  tradingClass?: string;

  /**
   * Security's identifier when querying contract's details or placing orders
   * ISIN - Example: Apple: US0378331005.
   * CUSIP - Example: Apple: 037833100.
   */
  @property(
    "Security's identifier when querying contract's details or placing orders.",
  )
  secIdType?: string;

  /**Identifier of the security type. */
  @property("Identifier of the security type.")
  secId?: string;
}
