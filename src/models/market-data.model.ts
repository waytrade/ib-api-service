import {model, property} from "@waytrade/microservice-core";

/**
 * Market ata values.
 */
@model("Market data values.")
export class MarketData {
  /** Number of contracts or lots offered at the bid price. */
  @property("Number of contracts or lots offered at the bid price.")
  BID_SIZE?: number;

  /** Highest priced bid for the contract. */
  @property("Highest priced bid for the contract.")
  BID?: number;

  /** Lowest price offer on the contract. */
  @property("Lowest price offer on the contract.")
  ASK?: number;

  /** Number of contracts or lots offered at the ask price. */
  @property("Number of contracts or lots offered at the ask price.")
  ASK_SIZE?: number;

  /** Last price at which the contract traded. */
  @property("Last price at which the contract traded.")
  LAST?: number;

  /** Number of contracts or lots traded at the last price. */
  @property("Number of contracts or lots traded at the last price.")
  LAST_SIZE?: number;

  /** High price for the day. */
  @property("High price for the day.")
  HIGH?: number;

  /** Low price for the day. */
  @property("Low price for the day.")
  LOW?: number;

  /** Trading volume for the day for the selected contract (US Stocks: multiplier 100). */
  @property("Trading volume for the day for the selected contract.")
  VOLUME?: number;

  /**
   * The last available closing price for the previous day.
   * For US Equities, we use corporate action processing to get the closing price,
   * so the close price is adjusted to reflect forward and reverse splits and cash and stock dividends.
   */
  @property("The last available closing price for the previous day.")
  CLOSE?: number;

  /** Today's opening price. */
  @property("Today's opening price.")
  OPEN?: number;

  /** Lowest price for the last 13 weeks. */
  @property("Lowest price for the last 13 weeks.")
  LOW_13_WEEK?: number;

  /** Highest price for the last 13 weeks. */
  @property("Highest price for the last 13 weeks.")
  HIGH_13_WEEK?: number;

  /** Lowest price for the last 26 weeks. */
  @property("Lowest price for the last 26 weeks.")
  LOW_26_WEEK?: number;

  /** Highest price for the last 26 weeks. */
  @property("Highest price for the last 26 weeks.")
  HIGH_26_WEEK?: number;

  /** Lowest price for the last 52 weeks. */
  @property("Lowest price for the last 52 weeks.")
  LOW_52_WEEK?: number;

  /** Highest price for the last 52 weeks. */
  @property("Highest price for the last 52 weeks.")
  HIGH_52_WEEK?: number;

  /** The average daily trading volume over 90 days (multiply this value times 100). */
  @property(
    "The average daily trading volume over 90 days (multiply this value times 100).",
  )
  AVG_VOLUME?: number;

  /** Total number of options that were not closed. */
  @property("Total number of options that were not closed).")
  OPEN_INTEREST?: number;

  /** The 30-day historical volatility (currently for stocks). */
  @property("The 30-day historical volatility (currently for stocks).")
  OPTION_HISTORICAL_VOL?: number;

  /**
   * A prediction of how volatile an underlying will be in the future.
   * The IB 30-day volatility is the at-market volatility estimated for a maturity thirty calendar days forward of the current trading day,
   * and is based on option prices from two consecutive expiration months.
   */
  @property("A prediction of how volatile an underlying will be in the future.")
  OPTION_IMPLIED_VOL?: number;

  /**	Call option open interest. */
  @property("Call option open interest.")
  OPTION_CALL_OPEN_INTEREST?: number;

  /** Put option open interest. */
  @property("Put option open interest.")
  OPTION_PUT_OPEN_INTEREST?: number;

  /** Call option volume for the trading day. */
  @property("Call option volume for the trading day.")
  OPTION_CALL_VOLUME?: number;

  /** Put option volume for the trading day. */
  @property("Put option volume for the trading day.")
  OPTION_PUT_VOLUME?: number;

  /** The number of points that the index is over the cash index. */
  @property("The number of points that the index is over the cash index.")
  INDEX_FUTURE_PREMIUM?: number;

  /** Identifies the options exchange(s) posting the best bid price on the options contract. */
  @property(
    "Identifies the options exchange(s) posting the best bid price on the options contract.",
  )
  BID_EXCH?: number;

  /** Identifies the options exchange(s) posting the best ask price on the options contract. */
  @property(
    "Identifies the options exchange(s) posting the best ask price on the options contract.",
  )
  ASK_EXCH?: number;

  /**
   * The mark price is equal to the Last Price unless: Ask < Last - the mark price is equal to the Ask Price.
   * Bid > Last - the mark price is equal to the Bid Price.
   */
  @property("The mark price.")
  MARK_PRICE?: number;

  /** Time of the last trade (in UNIX time). */
  @property("Time of the last trade (in UNIX time).")
  LAST_TIMESTAMP?: number;

  /** Describes the level of difficulty with which the contract can be sold short. */
  @property(
    "Describes the level of difficulty with which the contract can be sold short.",
  )
  SHORTABLE?: number;

  /** Provides the available Reuter's Fundamental Ratios. */
  @property("Provides the available Reuter's Fundamental Ratios.")
  FUNDAMENTAL_RATIOS?: number;

  /** Last trade details. */
  @property("Last trade details.")
  RT_VOLUME?: number;

  /** Indicates if a contract is halted */
  @property("Indicates if a contract is halted.")
  HALTED?: number;

  /** Trade count for the day. */
  @property("Trade count for the day.")
  TRADE_COUNT?: number;

  /** Trade count per minute. */
  @property("Trade count per minute.")
  TRADE_RATE?: number;

  /** Volume per minute. */
  @property("Volume per minute.")
  VOLUME_RATE?: number;

  /** Last Regular Trading Hours traded price. */
  @property("Last Regular Trading Hours traded price.")
  LAST_RTH_TRADE?: number;

  /** 30-day real time historical volatility. */
  @property("30-day real time historical volatility.")
  RT_HISTORICAL_VOL?: number;

  /** Contract's dividends. */
  @property("Contract's dividends.")
  IB_DIVIDENDS?: number;

  /** Contract's news feed. */
  @property("Contract's news feed.")
  NEWS_TICK?: number;

  /** The past three minutes volume. Interpolation may be applied. */
  @property("The past three minutes volume. Interpolation may be applied")
  SHORT_TERM_VOLUME_3_MIN?: number;

  /** The past five minutes volume. Interpolation may be applied. */
  @property("The past five minutes volume. Interpolation may be applied.")
  SHORT_TERM_VOLUME_5_MIN?: number;

  /** The past ten minutes volume. Interpolation may be applied. */
  @property("The past ten minutes volume. Interpolation may be applied.")
  SHORT_TERM_VOLUME_10_MIN?: number;

  /** Exchange of last traded price. */
  @property("Exchange of last traded price.")
  LAST_EXCH?: number;

  /** Timestamp (in Unix ms time) of last trade returned with regulatory snapshot. */
  @property(
    "Timestamp (in Unix ms time) of last trade returned with regulatory snapshot",
  )
  LAST_REG_TIME?: number;

  /** Total number of outstanding futures contracts (TWS v965+). *HSI open interest requested with generic tick 101. */
  @property("Total number of outstanding futures contracts.")
  FUTURES_OPEN_INTEREST?: number;

  /** Average volume of the corresponding option contracts(TWS Build 970+ is required). */
  @property(
    "Average volume of the corresponding option contracts(TWS Build 970+ is required).",
  )
  AVG_OPT_VOLUME?: number;

  /** Number of shares available to short (TWS Build 974+ is required) */
  @property("Number of shares available to short.")
  SHORTABLE_SHARES?: number;

  /**
   * Today's closing price of ETF's Net Asset Value (NAV).
   * Calculation is based on prices of ETF's underlying securities.
   */
  @property("Today's closing price of ETF's Net Asset Value (NAV).")
  ETF_NAV_CLOSE?: number;

  /**
   * Yesterday's closing price of ETF's Net Asset Value (NAV).
   * Calculation is based on prices of ETF's underlying securities.
   */
  @property("Yesterday's closing price of ETF's Net Asset Value (NAV).")
  ETF_NAV_PRIOR_CLOSE?: number;

  /**
   * The bid price of ETF's Net Asset Value (NAV).
   * Calculation is based on prices of ETF's underlying securities.
   */
  @property("The bid price of ETF's Net Asset Value (NAV).")
  ETF_NAV_BID?: number;

  /**
   * The ask price of ETF's Net Asset Value (NAV).
   * Calculation is based on prices of ETF's underlying securities.
   */
  @property("The ask price of ETF's Net Asset Value (NAV).")
  ETF_NAV_ASK?: number;

  /**
   * The last price of Net Asset Value (NAV).
   * For ETFs: Calculation is based on prices of ETF's underlying securities.
   * For NextShares: Value is provided by NASDAQ.
   */
  @property("The ask price of ETF's Net Asset Value (NAV).")
  ETF_NAV_LAST?: number;

  /** ETF Nav Last for Frozen data. */
  @property("ETF Nav Last for Frozen data.")
  ETF_NAV_FROZEN_LAST?: number;

  /** The high price of ETF's Net Asset Value (NAV). */
  @property("The high price of ETF's Net Asset Value (NAV).")
  ETF_NAV_HIGH?: number;

  /** The low price of ETF's Net Asset Value (NAV). */
  @property("The low price of ETF's Net Asset Value (NAV).")
  ETF_NAV_LOW?: number;

  /** The underlying asset price of an option. */
  @property("The underlying asset price of an option.")
  OPTION_UNDERLYING?: number;

  /** The underlying asset price of an option. */
  @property("The IV on the bid price of an option.")
  BID_OPTION_IV?: number;

  /** The bid price of an option. */
  @property("The bid price of an option.")
  BID_OPTION_PRICE?: number;

  /** The delta on the bid price of an option. */
  @property("The delta on the bid price of an option.")
  BID_OPTION_DELTA?: number;

  /** The gamma on the bid price of an option. */
  @property("The gamma on the bid price of an option.")
  BID_OPTION_GAMMA?: number;

  /** The vega on the bid price of an option. */
  @property("The vega on the bid price of an option.")
  BID_OPTION_VEGA?: number;

  /** The theta on the bid price of an option. */
  @property("The theta on the bid price of an option.")
  BID_OPTION_THETA?: number;

  /** The IV on the ask price of an option. */
  @property("The IV on the ask price of an option.")
  ASK_OPTION_IV?: number;

  /** The ask price of an option. */
  @property("The ask price of an option.")
  ASK_OPTION_PRICE?: number;

  /** The delta on the ask price of an option. */
  @property("The delta on the ask price of an option.")
  ASK_OPTION_DELTA?: number;

  /** The gamma on the ask price of an option. */
  @property("The gamma on the ask price of an option.")
  ASK_OPTION_GAMMA?: number;

  /** The vega on the ask price of an option. */
  @property("The vega on the ask price of an option.")
  ASK_OPTION_VEGA?: number;

  /** The theta on the ask price of an option. */
  @property("The theta on the ask price of an option.")
  ASK_OPTION_THETA?: number;

  /** The IV on the last price of an option. */
  @property("The IV on the last price of an option.")
  LAST_OPTION_IV?: number;

  /** The last price of an option. */
  @property("The last price of an option.")
  LAST_OPTION_PRICE?: number;

  /**The delta on the last price of an option. */
  @property("The delta on the last price of an option.")
  LAST_OPTION_DELTA?: number;

  /** The gamma on the last price of an option. */
  @property("The gamma on the last price of an option.")
  LAST_OPTION_GAMMA?: number;

  /** The vega on the last price of an option. */
  @property("The vega on the last price of an option.")
  LAST_OPTION_VEGA?: number;

  /** The theta on the last price of an option. */
  @property("The theta on the last price of an option.")
  LAST_OPTION_THETA?: number;

  /** The IV on the pricing-model of an option. */
  @property("The IV on the pricing-model of an option.")
  MODEL_OPTION_IV?: number;

  /** The price on the pricing-model of an option. */
  @property("The price on the pricing-model of an option.")
  MODEL_OPTION_PRICE?: number;

  /** The delta on the pricing-model of an option. */
  @property("The delta on the pricing-model of an option.")
  MODEL_OPTION_DELTA?: number;

  /** The gamma on the pricing-model of an option. */
  @property("The gamma on the pricing-model of an option.")
  MODEL_OPTION_GAMMA?: number;

  /** The vega on the pricing-model of an option. */
  @property("The vega on the pricing-model of an option.")
  MODEL_OPTION_VEGA?: number;

  /** The theta on the pricing-model of an option. */
  @property("The theta on the pricing-model of an option.")
  MODEL_OPTION_THETA?: number;
}

/**
 * A market data update on a contract.
 */
@model("A market data update on a contract.")
export class MarketDataUpdate {
  /** The contract id. */
  @property("The contract id. Undefined if this FX sport market data .")
  conId?: number;

  /** The FX currency pair. */
  @property(
    "The FX currency pair. Undefined if this market data of a contract.",
  )
  fxPair?: string;

  /** The market data. */
  @property("The market data.")
  marketData?: MarketData;
}

/**
 * A market data Webhook callback subscription.
 */
@model("A Webhook callback subscription on market data.")
export class MarketDataCallbackSubscription {
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

  /** The IB conId for receiving market data of a contract. */
  @property(
    "The IB conId for receiving the market data of a contract. If undefined, fxPair must the defined.",
  )
  conId?: number;

  /** The FX currency pair for receiving forex spot rates. */
  @property(
    "The FX currency pair for receiving a forex spot rate. If undefined, conId must the defined.",
  )
  fxPair?: string;
}
