import {AccountSummaryTagValues, AccountSummaryValue, AccountSummaryValues, PnLSingle, Position} from '@stoqey/ib';
import {HttpStatus} from "@waytrade/microservice-core";
import axios, {AxiosError} from "axios";
import {BehaviorSubject} from 'rxjs';
import {AccountList} from "../../models/account-list.model";
import {
  AccountSummary,
  AccountSummaryList
} from "../../models/account-summary.model";
import {PositionList} from '../../models/position-list.model';
import {wait_ms} from "../helper/test.helper";
import {IBApiApp} from "../ib-api-test-app";

describe("Test Account Controller", () => {
  const TEST_USERNAME = "User" + Math.random();
  const TEST_PASSWORD = "Password" + Math.random();
  const TEST_ACCOUNT_ID = "Account" + Math.random();
  const TEST_TOTAL_CASH = Math.random();

  const app = new IBApiApp();

  let authToken = "";
  let baseUrl = "";

  app.ibApiMock.managedAccounts.add(TEST_ACCOUNT_ID);

  const POSITION0: Position = {
    account: TEST_ACCOUNT_ID,
    pos: Math.random(),
    avgCost: Math.random(),
    contract: {
      conId: Math.random(),
    },
  };
  const POSITION0_ID = POSITION0.account + ":" + POSITION0.contract.conId;

  const POSITION1: Position = {
    account: TEST_ACCOUNT_ID,
    pos: Math.random() + 10,
    avgCost: Math.random() + 10,
    contract: {
      conId: Math.random(),
    },
  };
  const POSITION1_ID = POSITION1.account + ":" + POSITION1.contract.conId;

  const POSITIONS: Position[] = [
    POSITION0,
    POSITION1
  ];

  const positionsMap = new Map<string, Position[]>();
  positionsMap.set(TEST_ACCOUNT_ID, POSITIONS);
  app.ibApiMock.currentPositionsUpdate.next({
    all: positionsMap,
    added: positionsMap,
  });

  let PNL0: PnLSingle = {
    position: POSITION0.pos,
    marketValue: Math.random(),
    dailyPnL: Math.random(),
    unrealizedPnL: Math.random(),
    realizedPnL: Math.random(),
  };
  let PNL1: PnLSingle = {
    position: POSITION1.pos,
    marketValue: Math.random(),
    dailyPnL: Math.random(),
    unrealizedPnL: Math.random(),
    realizedPnL: Math.random(),
  };

  app.ibApiMock.currentPnLSingle.set(
    POSITION0.contract.conId??0,
    new BehaviorSubject<PnLSingle>(PNL0)
  );
  app.ibApiMock.currentPnLSingle.set(
    POSITION1.contract.conId??0,
    new BehaviorSubject<PnLSingle>(PNL1)
  );

  beforeAll(async () => {
    await app.start({
      SERVER_PORT: undefined,
      REST_API_USERNAME: TEST_USERNAME,
      REST_API_PASSWORD: TEST_PASSWORD,
    });

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

    await wait_ms(100);
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
      expect((<AxiosError>e).response?.status).toEqual(HttpStatus.UNAUTHORIZED);
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
      expect((<AxiosError>e).response?.status).toEqual(HttpStatus.UNAUTHORIZED);
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
      expect((<AxiosError>e).response?.status).toEqual(HttpStatus.NOT_FOUND);
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
      expect((<AxiosError>e).response?.status).toEqual(HttpStatus.UNAUTHORIZED);
    }
  });

  test("GET /positions", async () => {
    const res = await axios.get<PositionList>(
      baseUrl + "/positions",
      {
        headers: {
          authorization: authToken,
        },
      },
    );
    expect(res.status).toEqual(HttpStatus.OK);
    expect(res.data.positions?.length).toEqual(2);
    if (res.data.positions) {
      expect(res.data.positions[0]?.id).toEqual(POSITION0_ID);
      expect(res.data.positions[0]?.account).toEqual(TEST_ACCOUNT_ID);
      expect(res.data.positions[0]?.conId).toEqual(POSITION0.contract.conId);
      expect(res.data.positions[0]?.pos).toEqual(POSITION0.pos);
      expect(res.data.positions[0]?.dailyPnL).toEqual(PNL0.dailyPnL);
      expect(res.data.positions[0]?.unrealizedPnL).toEqual(PNL0.unrealizedPnL);
      expect(res.data.positions[0]?.realizedPnL).toEqual(PNL0.realizedPnL);
      expect(res.data.positions[0]?.avgCost).toEqual(POSITION0.avgCost);
      expect(res.data.positions[0]?.marketValue).toEqual(PNL0.marketValue);
      expect(res.data.positions[1]?.id).toEqual(POSITION1_ID);
      expect(res.data.positions[1]?.account).toEqual(TEST_ACCOUNT_ID);
      expect(res.data.positions[1]?.conId).toEqual(POSITION1.contract.conId);
      expect(res.data.positions[1]?.pos).toEqual(POSITION1.pos);
      expect(res.data.positions[1]?.dailyPnL).toEqual(PNL1.dailyPnL);
      expect(res.data.positions[1]?.unrealizedPnL).toEqual(PNL1.unrealizedPnL);
      expect(res.data.positions[1]?.realizedPnL).toEqual(PNL1.realizedPnL);
      expect(res.data.positions[1]?.avgCost).toEqual(POSITION1.avgCost);
      expect(res.data.positions[1]?.marketValue).toEqual(PNL1.marketValue);
    }
  });
});
