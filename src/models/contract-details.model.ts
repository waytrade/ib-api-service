import {arrayProperty, model, property} from "@waytrade/microservice-core";
import {Contract} from "./contract.model";

/**
 * Contract details on Interactive Brokers.
 */
@model("Details of a contract on Interactive Brokers.")
export class ContractDetails {
  /** A fully-defined Contract object. */
  @property("A fully-defined Contract object.")
  contract?: Contract;

  /** The market name for this product. */
  @property("The market name for this product.")
  marketName?: string;

  /** The minimum allowed price variation. */
  @property("The minimum allowed price variation.")
  minTick?: number;

  /** Supported order types for this product.  */
  @property("Supported order types for this product.")
  orderTypes?: string;

  /**Valid exchange fields when placing an order for this contract.  */
  @property("Valid exchange fields when placing an order for this contract.")
  validExchanges?: string;

  /** For derivatives, the contract ID (conID) of the underlying instrument. */
  @property(
    "For derivatives, the contract ID (conID) of the underlying instrument.",
  )
  underConId?: number;

  /**	Descriptive name of the product. */
  @property("Descriptive name of the product.")
  longName?: string;

  /**Typically the contract month of the underlying for a Future contract. */
  @property(
    "Typically the contract month of the underlying for a Future contract.",
  )
  contractMonth?: string;

  /** The industry classification of the underlying/product. For example, Financial. */
  @property(
    "The industry classification of the underlying/product. For example, Financial.",
  )
  industry?: string;

  /** The industry category of the underlying. For example, InvestmentSvc. */
  @property(
    "The industry category of the underlying. For example, InvestmentSvc.",
  )
  category?: string;

  /**	The industry subcategory of the underlying. For example, Brokerage. */
  @property(
    "The industry subcategory of the underlying. For example, Brokerage.",
  )
  subcategory?: string;

  /** The time zone for the trading hours of the product. For example, EST. */
  @property(
    "The time zone for the trading hours of the product. For example, EST.",
  )
  timeZoneId?: string;

  /**The trading hours of the product. */
  @property("The trading hours of the product.")
  tradingHours?: string;

  /** The liquid hours of the product.*/
  @property("The liquid hours of the product.")
  liquidHours?: string;

  /** Tick Size Multiplier. */
  @property("Tick size multiplier.")
  mdSizeMultiplier?: number;

  /** For derivatives, the symbol of the underlying contract. */
  @property("For derivatives, the symbol of the underlying contract.")
  underSymbol?: string;

  /**	For derivatives, the underlying security type. */
  @property("For derivatives, the underlying security type.")
  underSecType?: string;

  /**
   * The list of market rule IDs separated by comma Market rule IDs can
   * be used to determine the minimum price increment at a given price.
   */
  @property("For derivatives, the underlying security type.")
  marketRuleIds?: string;

  /**
   * Real expiration date.
   *
   * Requires TWS 968+ and API v973.04+.
   */
  @property("Real expiration date.")
  realExpirationDate?: string;

  /** Last trade time. */
  @property("Last trade time.")
  lastTradeTime?: string;

  /** Stock type.  */
  @property("Stock type.")
  stockType?: string;
}

/**
 * A list of contract details.
 */
@model("A list of contract details.")
export class ContractDetailsList {
  @arrayProperty(ContractDetails, "Array of contract details")
  details?: ContractDetails[];
}
