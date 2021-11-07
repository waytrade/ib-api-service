import {ContractDetails, OptionType, SecType} from "@stoqey/ib";
import {HttpStatus} from "@waytrade/microservice-core";
import axios from "axios";
import {ContractDetailsList} from "../../models/contract-details.model";
import {IBApiApp} from "../ib-api-test-app";

describe("Test Contracts Controller", () => {
  const TEST_USERNAME = "User" + Math.random();
  const TEST_PASSWORD = "Password" + Math.random();

  const REF_CONID = 42;
  const REF_CONTRACT_DETAILS: ContractDetails = {
    contract: {
      conId: REF_CONID,
      symbol: "" + Math.random(),
      secType: SecType.FUT,
      lastTradeDateOrContractMonth: "20211217",
      strike: Math.random(),
      right: OptionType.Call,
      multiplier: Math.random(),
      exchange: "" + Math.random(),
      currency: "" + Math.random(),
      localSymbol: "" + Math.random(),
      primaryExch: "" + Math.random(),
      tradingClass: "" + Math.random(),
      includeExpired: true,
      secIdType: "" + Math.random(),
      secId: "" + Math.random(),
      comboLegsDescription: "" + Math.random(),
    },
    marketName: "marketName" + Math.random(),
    minTick: Math.random(),
    priceMagnifier: Math.random(),
    orderTypes: "" + Math.random(),
    validExchanges: "" + Math.random(),
    underConId: Math.random(),
    longName: "longName" + Math.random(),
    contractMonth: "20211217 08:30 CST",
    industry: "" + Math.random(),
    category: "" + Math.random(),
    subcategory: "" + Math.random(),
    timeZoneId: "CST",
    tradingHours: "" + Math.random(),
    liquidHours: "" + Math.random(),
    evRule: "" + Math.random(),
    evMultiplier: Math.random(),
    mdSizeMultiplier: Math.random(),
    aggGroup: Math.random(),
    underSymbol: "" + Math.random(),
    underSecType: SecType.FUT,
    marketRuleIds: "" + Math.random(),
    realExpirationDate: "" + Math.random(),
    lastTradeTime: "20211217 08:30 CST",
    stockType: "" + Math.random(),
    cusip: "" + Math.random(),
    ratings: "" + Math.random(),
    descAppend: "" + Math.random(),
    bondType: "" + Math.random(),
    couponType: "" + Math.random(),
    callable: true,
    putable: true,
    coupon: Math.random(),
    convertible: true,
    maturity: "20311217",
  };

  const app = new IBApiApp();
  let authToken = "";
  let baseUrl = "";

  beforeAll(async () => {
    await app.start({
      SERVER_PORT: undefined,
      REST_API_USERNAME: TEST_USERNAME,
      REST_API_PASSWORD: TEST_PASSWORD,
    });

    baseUrl = `http://127.0.0.1:${app.apiServerPort}/contracts`;

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

  test("GET /details", async () => {
    // set on IBApiNext mock
    app.ibApiMock.contractDb.set(REF_CONID, REF_CONTRACT_DETAILS);

    var getContractDetailsCalledCount = 0;
    app.ibApiMock.getContractDetailsCalled.subscribe({
      next: () => {
        getContractDetailsCalledCount++;
      },
    });

    // query (getContractDetailsCalledCount will increment)
    const res = await axios.get<ContractDetailsList>(
      baseUrl + `/details?conId=${REF_CONID}`,
      {
        headers: {
          authorization: authToken,
        },
      },
    );
    expect(res.status).toEqual(HttpStatus.OK);
    expect(res.data.details).toEqual([REF_CONTRACT_DETAILS]);

    // query again from cache  (getContractDetailsCalledCount won't increment)
    const cachedRes = await axios.get<ContractDetailsList>(
      baseUrl + `/details?conId=${REF_CONID}`,
      {
        headers: {
          authorization: authToken,
        },
      },
    );

    expect(cachedRes.status).toEqual(HttpStatus.OK);
    expect(cachedRes.data.details).toEqual([REF_CONTRACT_DETAILS]);

    expect(getContractDetailsCalledCount).toEqual(1);
  });

  test("GET /details (no authorization)", async () => {
    try {
      await axios.get<ContractDetailsList>(
        baseUrl + `/details?conId=9999999`,
        {},
      );
      throw "This must fail";
    } catch (e) {
      expect(e.response.status).toEqual(HttpStatus.UNAUTHORIZED);
    }
  });

  test("GET /details (empty result)", async () => {
    const res = await axios.get<ContractDetailsList>(
      baseUrl + `/details?conId=9999999`,
      {
        headers: {
          authorization: authToken,
        },
      },
    );

    expect(res.status).toEqual(HttpStatus.OK);
    expect(res.data.details).toEqual([]);
  });

  test("GET /details (invalid conId format)", async () => {
    try {
      await axios.get<ContractDetailsList>(
        baseUrl + `/details?conId=thisIsNoConID`,
        {
          headers: {
            authorization: authToken,
          },
        },
      );
      throw "This must fail";
    } catch (e) {
      expect(e.response.status).toEqual(HttpStatus.BAD_REQUEST);
    }
  });

  test("POST /search", async () => {
    const res = await axios.post<ContractDetailsList>(
      baseUrl + "/search",
      {
        conId: REF_CONTRACT_DETAILS.contract.conId,
      },
      {
        headers: {
          authorization: authToken,
        },
      },
    );

    expect(res.status).toEqual(HttpStatus.OK);
    expect(res.data.details?.length).toEqual(1);
    expect(res.data.details).toEqual([REF_CONTRACT_DETAILS]);
  });

  test("POST /search (empty result)", async () => {
    const res = await axios.post<ContractDetailsList>(
      baseUrl + "/search",
      {
        symbol: "" + Math.random(),
      },
      {
        headers: {
          authorization: authToken,
        },
      },
    );

    expect(res.status).toEqual(HttpStatus.OK);
    expect(res.data.details?.length).toEqual(0);
  });
});
