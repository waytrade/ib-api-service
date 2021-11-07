import {HttpStatus} from "@waytrade/microservice-core";
import axios from "axios";
import {AccountList} from "../../models/account-list.model";
import {PnL} from "../../models/pnl.model";
import {IBApiApp} from "../ib-api-test-app";

describe("Test Account Controller", () => {
  const TEST_USERNAME = "User" + Math.random();
  const TEST_PASSWORD = "Password" + Math.random();
  const TEST_ACCOUNT_ID = "Account" + Math.random();

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

    authToken = (
      await axios.post<void>(
        `http://127.0.0.1:${app.apiServerPort}/auth/password`,
        {
          username: TEST_USERNAME,
          password: TEST_PASSWORD,
        },
      )
    ).headers["authorization"] as string;
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

  test("GET /pnl", async () => {
    const REF_PNL: PnL = {
      dailyPnL: Math.random(),
      unrealizedPnL: Math.random(),
      realizedPnL: Math.random(),
    };
    app.ibApiMock.currentPnL.next(REF_PNL);

    const res = await axios.get<PnL>(
      baseUrl + `/pnl?account=${TEST_ACCOUNT_ID}`,
      {
        headers: {
          authorization: authToken,
        },
      },
    );
    expect(res.status).toEqual(HttpStatus.OK);
    expect(res.data).toEqual(REF_PNL);
  });

  test("GET /pnl (no authorization)", async () => {
    try {
      await axios.get<AccountList>(
        baseUrl + `/pnl?account=${TEST_ACCOUNT_ID}`,
        {},
      );
      throw "This must fail";
    } catch (e) {
      expect(e.response.status).toEqual(HttpStatus.UNAUTHORIZED);
    }
  });

  test("GET /pnl (no account argument)", async () => {
    try {
      await axios.get<AccountList>(baseUrl + "/pnl", {
        headers: {
          authorization: authToken,
        },
      });
      throw "This must fail";
    } catch (e) {
      expect(e.response.status).toEqual(HttpStatus.BAD_REQUEST);
    }
  });
});
