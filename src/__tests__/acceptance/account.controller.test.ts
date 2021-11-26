import {AccountSummaryTagValues, AccountSummaryValue, AccountSummaryValues} from '@stoqey/ib';
import {HttpStatus} from "@waytrade/microservice-core";
import axios from "axios";
import {AccountList} from "../../models/account-list.model";
import {
  AccountSummary,
  AccountSummaryList
} from "../../models/account-summary.model";
import {delay} from "../helper/test.helper";
import {IBApiApp} from "../ib-api-test-app";

describe("Test Account Controller", () => {
  const TEST_USERNAME = "User" + Math.random();
  const TEST_PASSWORD = "Password" + Math.random();
  const TEST_ACCOUNT_ID = "Account" + Math.random();
  const TEST_TOTAL_CASH = Math.random();

  const app = new IBApiApp();

  let authToken = "";
  let baseUrl = "";

  beforeAll(async () => {
    await app.start({
      SERVER_PORT: undefined,
      REST_API_USERNAME: TEST_USERNAME,
      REST_API_PASSWORD: TEST_PASSWORD,
    });

    app.ibApiMock.managedAccounts.add(TEST_ACCOUNT_ID);
    baseUrl = `http://127.0.0.1:${app.apiServerPort}/account`;

    const values = new Map<string, AccountSummaryValues>([
      [
        "TotalCashValue",
        new Map<string, AccountSummaryValue>([
          [
            app.config.BASE_CURRENCY ?? "",
            {
              value: "" + TEST_TOTAL_CASH,
              ingressTm: Math.random(),
            },
          ],
        ]),
      ],
    ]);

    app.ibApiMock.accountSummaryUpdate.next({
      all: new Map<string, AccountSummaryTagValues>([
        [TEST_ACCOUNT_ID, values],
      ]),
      changed: new Map<string, AccountSummaryTagValues>([
        [TEST_ACCOUNT_ID, values],
      ]),
    });

    authToken = (
      await axios.post<void>(
        `http://127.0.0.1:${app.apiServerPort}/auth/password`,
        {
          username: TEST_USERNAME,
          password: TEST_PASSWORD,
        },
      )
    ).headers["authorization"] as string;

    await delay(100);
  });

  afterAll(async () => {
    app.stop();
  });

  test("GET /managedAccounts", async () => {
    const res = await axios.get<AccountList>(baseUrl + "/managedAccounts", {
      headers: {
        authorization: authToken,
      },
    });
    expect(res.status).toEqual(HttpStatus.OK);
    expect(res.data.accounts).toEqual([TEST_ACCOUNT_ID]);
  });

  test("GET /managedAccounts (no authorization)", async () => {
    try {
      await axios.get<AccountList>(baseUrl + "/managedAccounts", {});
      throw "This must fail";
    } catch (e) {
      expect(e.response.status).toEqual(HttpStatus.UNAUTHORIZED);
    }
  });

  test("GET /accountSummaries", async () => {
    const res = await axios.get<AccountSummaryList>(
      baseUrl + "/accountSummaries",
      {
        headers: {
          authorization: authToken,
        },
      },
    );
    expect(res.status).toEqual(HttpStatus.OK);
    expect(res.data.summaries?.length).toEqual(1);
    if (res.data.summaries) {
      expect(res.data.summaries[0]?.account).toEqual(TEST_ACCOUNT_ID);
      expect(res.data.summaries[0]?.baseCurrency).toEqual(app.config.BASE_CURRENCY);
      expect(res.data.summaries[0]?.totalCashValue).toEqual(TEST_TOTAL_CASH);
    }
  });

  test("GET /accountSummaries (no authorization)", async () => {
    try {
      await axios.get<AccountList>(baseUrl + "/accountSummaries", {});
      throw "This must fail";
    } catch (e) {
      expect(e.response.status).toEqual(HttpStatus.UNAUTHORIZED);
    }
  });

  test("GET /accountSummary/account", async () => {
    const res = await axios.get<AccountSummary>(
      baseUrl + "/accountSummary/" + TEST_ACCOUNT_ID,
      {
        headers: {
          authorization: authToken,
        },
      },
    );
    expect(res.status).toEqual(HttpStatus.OK);
    expect(res.data.account).toEqual(TEST_ACCOUNT_ID);
    expect(res.data.baseCurrency).toEqual(app.config.BASE_CURRENCY);
    expect(res.data.totalCashValue).toEqual(TEST_TOTAL_CASH);
  });

  test("GET /accountSummary/account (no account)", async () => {
    try {
      await axios.get<AccountList>(
        baseUrl + "/accountSummary/",
        {
          headers: {
            authorization: authToken,
          },
        },
      );
      throw "This must fail";
    } catch (e) {
      expect(e.response.status).toEqual(HttpStatus.NOT_FOUND);
    }
  });

  test("GET /accountSummary/account (no authorization)", async () => {
    try {
      await axios.get<AccountList>(
        baseUrl + "/accountSummary/" + TEST_ACCOUNT_ID,
        {},
      );
      throw "This must fail";
    } catch (e) {
      expect(e.response.status).toEqual(HttpStatus.UNAUTHORIZED);
    }
  });
});
