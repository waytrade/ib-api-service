import * as IB from "@stoqey/ib";
import {MapExt} from "@waytrade/microservice-core";
import {AccountSummary} from "../models/account-summary.model";
import {MarketData} from "../models/market-data.model";

/**
 * Account summary tag values, make suer this is in sync with
 * AccountSummary model.
 *
 * Ecented AccountSummary model if you extend this!!
 */
export const ACCOUNT_SUMMARY_TAGS = [
  "AccountType",
  "NetLiquidation",
  "TotalCashValue",
  "SettledCash",
  "AccruedCash",
  "BuyingPower",
  "EquityWithLoanValue",
  "PreviousEquityWithLoanValue",
  "GrossPositionValue",
  "RegTEquity",
  "RegTMargin",
  "InitMarginReq",
  "SMA",
  "InitMarginReq",
  "MaintMarginReq",
  "AvailableFunds",
  "ExcessLiquidity",
  "Cushion",
  "FullInitMarginReq",
  "FullMaintMarginReq",
  "FullAvailableFunds",
  "FullExcessLiquidity",
  "LookAheadNextChange",
  "LookAheadInitMarginReq",
  "LookAheadMaintMarginReq",
  "LookAheadAvailableFunds",
  "LookAheadExcessLiquidity",
  "HighestSeverity",
  "DayTradesRemaining",
  "Leverage",
];

/**
 * Collection of helper functions used by IBApiService.
 */
export class IBApiServiceHelper {
  /**
   * Collect account summary tag values to map of account ids and
   * AccountSummary models.
   */
  static colllectAccountSummaryTagValues(
    accountId: string,
    tagValues: IB.AccountSummaryTagValues,
    baseCurrency: string,
    all: MapExt<string, AccountSummary>,
  ): void {
    const accountSummary = all.getOrAdd(
      accountId,
      () => new AccountSummary({account: accountId}),
    );
    tagValues.forEach((summaryValues, key) => {
      if (ACCOUNT_SUMMARY_TAGS.find(v => v === key)) {
        let value = summaryValues.get(baseCurrency);
        if (!value) {
          value = summaryValues.get("");
        }
        let val: number | string | undefined = Number(value?.value);
        if (isNaN(val)) {
          val = value?.value;
        }
        if (val !== undefined) {
          ((<unknown>accountSummary) as Record<string, unknown>)[
            key[0].toLowerCase() + key.substr(1)
          ] = val;
        }
      }
    });
    if (Object.keys(accountSummary).length === 1) {
      all.delete(accountId);
    }
  }

  /** Convert IB.MarketDataTicks to MarketData model.  */
  static marketDataTicksToModel(data: IB.MarketDataTicks): MarketData {
    const result: Record<string, number | undefined> = {};
    data.forEach((value, type) => {
      if (!value.value) {
        return;
      }
      let propName =
        type > IB.IBApiNextTickType.API_NEXT_FIRST_TICK_ID
          ? IB.IBApiNextTickType[type]
          : IB.IBApiTickType[type];
      if (propName?.startsWith("DELAYED_")) {
        propName = propName.substr("DELAYED_".length);
      }
      if (propName) {
        result[propName] = value.value;
      }
    });
    return result;
  }

  /** Format a possition id. */
  static formatPositionId(accountId: string, conId?: number): string {
    return `${accountId}:${conId}`;
  }
}
