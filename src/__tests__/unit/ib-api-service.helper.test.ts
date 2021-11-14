import {
  AccountSummaryValue,
  AccountSummaryValues,
  IBApiNextTickType,
} from "@stoqey/ib";
import TickType from "@stoqey/ib/dist/api/market/tickType";
import {MapExt} from "@waytrade/microservice-core";
import {AccountSummary} from "../../models/account-summary.model";
import {IBApiServiceHelper} from "../../services/ib-api.service.helper";

describe("Test IBApiServiceHelper", () => {
  test("Test formatPositionId", () => {
    const account = "TestAccount" + Math.random();
    const conId = Math.random();

    expect(IBApiServiceHelper.formatPositionId(account, conId)).toEqual(
      `${account}:${conId}`,
    );
  });

  test("Test marketDataTicksToModel", () => {
    let testVal = Math.random();
    expect(
      IBApiServiceHelper.marketDataTicksToModel(
        new Map([
          [
            TickType.ASK,
            {
              value: testVal,
              ingressTm: Math.random(),
            },
          ],
        ]),
      ),
    ).toEqual({ASK: testVal});

    testVal = Math.random();
    expect(
      IBApiServiceHelper.marketDataTicksToModel(
        new Map([
          [
            TickType.DELAYED_ASK,
            {
              value: testVal,
              ingressTm: Math.random(),
            },
          ],
        ]),
      ),
    ).toEqual({ASK: testVal});

    testVal = Math.random();
    expect(
      IBApiServiceHelper.marketDataTicksToModel(
        new Map([
          [
            IBApiNextTickType.ASK_OPTION_DELTA,
            {
              value: testVal,
              ingressTm: Math.random(),
            },
          ],
        ]),
      ),
    ).toEqual({ASK_OPTION_DELTA: testVal});

    testVal = Math.random();
    expect(
      IBApiServiceHelper.marketDataTicksToModel(
        new Map([
          [
            IBApiNextTickType.DELAYED_ASK_OPTION_DELTA,
            {
              value: testVal,
              ingressTm: Math.random(),
            },
          ],
        ]),
      ),
    ).toEqual({ASK_OPTION_DELTA: testVal});

    expect(
      IBApiServiceHelper.marketDataTicksToModel(
        new Map([
          [
            999999999,
            {
              ingressTm: Math.random(),
            },
          ],
        ]),
      ),
    ).toEqual({});

    testVal = Math.random();
    expect(
      IBApiServiceHelper.marketDataTicksToModel(
        new Map([
          [
            999999999,
            {
              value: testVal,
              ingressTm: Math.random(),
            },
          ],
        ]),
      ),
    ).toEqual({});
  });

  test("Test colllectAccountSummaryTagValues", () => {
    const account = "TestAccount" + Math.random();
    const currency = "USD";
    const value = Math.random();
    let tagValues = new Map<string, AccountSummaryValues>([
      [
        "NetLiquidation",
        new Map<string, AccountSummaryValue>([
          [
            currency,
            {
              value: "" + value,
              ingressTm: Math.random(),
            },
          ],
        ]),
      ],
    ]);
    let all = new MapExt<string, AccountSummary>();
    IBApiServiceHelper.colllectAccountSummaryTagValues(
      account,
      tagValues,
      currency,
      all,
    );

    expect(all.get(account)?.account).toEqual(account);
    expect(all.get(account)?.netLiquidation).toEqual(value);

    tagValues = new Map<string, AccountSummaryValues>([
      [
        "invalidTag",
        new Map<string, AccountSummaryValue>([
          [
            currency,
            {
              value: "" + value,
              ingressTm: Math.random(),
            },
          ],
        ]),
      ],
    ]);
    all = new MapExt<string, AccountSummary>();
    IBApiServiceHelper.colllectAccountSummaryTagValues(
      account,
      tagValues,
      currency,
      all,
    );

    expect(all.size).toEqual(0);

    tagValues = new Map<string, AccountSummaryValues>([
      [
        "NetLiquidation",
        new Map<string, AccountSummaryValue>([
          [
            "OtherCurrency",
            {
              value: "" + value,
              ingressTm: Math.random(),
            },
          ],
        ]),
      ],
    ]);
    all = new MapExt<string, AccountSummary>();
    IBApiServiceHelper.colllectAccountSummaryTagValues(
      account,
      tagValues,
      currency,
      all,
    );

    expect(all.size).toEqual(0);
  });
});
