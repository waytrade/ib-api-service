import * as IB from "@stoqey/ib";
import {MapExt} from "@waytrade/microservice-core";
import {AccountSummary} from "../models/account-summary.model";
import {MarketData} from "../models/market-data.model";
import {ACCOUNT_SUMMARY_TAGS} from "./ib-api-service";

/**
 * Collection of helper functions used by IBApiService.
 */
export class IBApiServiceHelper {
  /** Convert a [YEAR][MONTH][DAY] string as used by IB to a UNIX timestamp. */
  static toDateTime(ibkrDateString?: string): number | undefined {
    if (!ibkrDateString) {
      return undefined;
    }
    const year = Number(ibkrDateString.substr(0, 4));
    const month = Number(ibkrDateString.substr(4, 2));
    const day = Number(ibkrDateString.substr(4, 2));
    const hour = Number(ibkrDateString.substr(10, 2));
    const min = Number(ibkrDateString.substr(13, 2));
    const sec = Number(ibkrDateString.substr(16, 2));
    if (!isNaN(sec)) {
      return new Date(year, month - 1, day, hour, min, sec).getTime();
    } else {
      return new Date(year, month - 1, day).getTime();
    }
  }

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
      () => new AccountSummary(accountId),
    );
    tagValues.forEach((summaryValues, key) => {
      if (ACCOUNT_SUMMARY_TAGS.find(v => v === key)) {
        const baseCurrencyValue = summaryValues.get(baseCurrency);
        ((<unknown>accountSummary) as Record<string, number>)[
          key[0].toLowerCase() + key.substr(1)
        ] = Number(baseCurrencyValue?.value);
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
      if (propName.startsWith("DELAYED_")) {
        propName = propName.substr("DELAYED_".length);
      }
      result[propName] = value.value;
    });
    return result;
  }

  /** Format a possition id. */
  static formatPositionId(accountId: string, conId?: number): string {
    return `${accountId}:${conId}`;
  }
}
