import {Bar, ContractDescription, ContractDetails, OptionType, SecType} from "@stoqey/ib";
import {HttpStatus} from "@waytrade/microservice-core";
import axios, {AxiosError} from "axios";
import {ContractDescriptionList} from '../../models/contract-description.model';
import {ContractDetailsList} from "../../models/contract-details.model";
import {BarSize, HistoricDataRequestArguments, WhatToShow} from '../../models/historic-data-request.model';
import {OHLCBars} from '../../models/ohlc-bar.model';
import {IBApiApp} from "../ib-api-test-app";

describe("Test Contracts Controller", () => {
  const app = new IBApiApp();
  let authToken = "";
  let baseUrl = "";

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

  const REF_CONTRACT_DESC: ContractDescription = {
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
    derivativeSecTypes: [SecType.STK, SecType.OPT]
  }

  const REF_BARS: Bar[] = [{
      time: "Time" + Math.random(),
      open: Math.random(),
      high: Math.random(),
      low: Math.random(),
      close: Math.random(),
      volume: Math.random(),
      WAP: Math.random(),
      count: Math.random(),
    }, {
      time: "Time" + Math.random(),
      open: Math.random(),
      high: Math.random(),
      low: Math.random(),
      close: Math.random(),
      volume: Math.random(),
      WAP: Math.random(),
      count: Math.random(),
    }, {
      time: "Time" + Math.random(),
      open: Math.random(),
      high: Math.random(),
      low: Math.random(),
      close: Math.random(),
      volume: Math.random(),
      WAP: Math.random(),
      count: Math.random(),
    }
  ]
  app.ibApiMock.historicalData.set(REF_CONTRACT_DETAILS.contract.conId??0, REF_BARS);

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

  test("POST /search", async () => {
    app.ibApiMock.searchContractsResult.next(
      [REF_CONTRACT_DESC]
    )

    const res = await axios.get<ContractDescriptionList>(
      baseUrl + "/search?pattern=Apple",
      {
        headers: {
          authorization: authToken,
        },
      },
    );

    expect(res.status).toEqual(HttpStatus.OK);
    expect(res.data.descs?.length).toEqual(1);
    expect(res.data.descs).toEqual([REF_CONTRACT_DESC]);
  });

  test("GET /search (no authorization)", async () => {
    try {
      await axios.get<ContractDescriptionList>(
        baseUrl + "/search?pattern=Apple",
        {},
      );
      throw "This must fail";
    } catch (e) {
      expect((<AxiosError>e).response?.status).toEqual(HttpStatus.UNAUTHORIZED);
    }
  });

  test("GET /search (empty result)", async () => {
    app.ibApiMock.searchContractsResult.next(
      []
    )
    const res = await axios.get<ContractDescriptionList>(
      baseUrl +  "/search?pattern=Apple",
      {
        headers: {
          authorization: authToken,
        },
      },
    );

    expect(res.status).toEqual(HttpStatus.OK);
    expect(res.data.descs).toEqual([]);
  });

  test("GET /search (no pattern)", async () => {
    try {
      await axios.get<ContractDescriptionList>(
        baseUrl + `/search`,
        {
          headers: {
            authorization: authToken,
          },
        },
      );
      throw "This must fail";
    } catch (e) {
      expect((<AxiosError>e).response?.status).toEqual(HttpStatus.BAD_REQUEST);
      expect((<AxiosError>e).response?.data?.message).toEqual("Missing pattern parameter on query");
    }
  });

  test("GET /search (IBApiNext error)", async () => {
    app.ibApiMock.searchContractssError = {
      reqId: -1,
      code: 0,
      error: Error("TEST ERROR")
    }
    try {
      await axios.get<ContractDescriptionList>(
        baseUrl + `/search?pattern=Apple`,
        {
          headers: {
            authorization: authToken,
          },
        },
      );
      throw "This must fail";
    } catch (e) {
      expect((<AxiosError>e).response?.status).toEqual(HttpStatus.INTERNAL_SERVER_ERROR);
      expect((<AxiosError>e).response?.data?.message).toEqual("TEST ERROR");
    }
  });

  test("GET /detailsById", async () => {
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
      baseUrl + `/detailsById?conId=${REF_CONID}`,
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
      baseUrl + `/detailsById?conId=${REF_CONID}`,
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

  test("GET /detailsById (no authorization)", async () => {
    try {
      await axios.get<ContractDetailsList>(
        baseUrl + `/detailsById?conId=9999999`,
        {},
      );
      throw "This must fail";
    } catch (e) {
      expect((<AxiosError>e).response?.status).toEqual(HttpStatus.UNAUTHORIZED);
    }
  });

  test("GET /detailsById (empty result)", async () => {
    const res = await axios.get<ContractDetailsList>(
      baseUrl + `/detailsById?conId=9999999`,
      {
        headers: {
          authorization: authToken,
        },
      },
    );

    expect(res.status).toEqual(HttpStatus.OK);
    expect(res.data.details).toEqual([]);
  });

  test("GET /detailsById (invalid conId format)", async () => {
    try {
      await axios.get<ContractDetailsList>(
        baseUrl + `/detailsById?conId=thisIsNoConID`,
        {
          headers: {
            authorization: authToken,
          },
        },
      );
      throw "This must fail";
    } catch (e) {
      expect((<AxiosError>e).response?.status).toEqual(HttpStatus.BAD_REQUEST);
    }
  });

  test("GET /detailsById (IBApiNext error)", async () => {
    app.ibApiMock.getContractDetailsError = {
      reqId: -1,
      code: 0,
      error: Error("TEST ERROR")
    }
    try {
      await axios.get<ContractDetailsList>(
        baseUrl + `/detailsById?conId=9999999`,
        {
          headers: {
            authorization: authToken,
          },
        },
      );
      throw "This must fail";
    } catch (e) {
      expect((<AxiosError>e).response?.status).toEqual(HttpStatus.INTERNAL_SERVER_ERROR);
      expect((<AxiosError>e).response?.data?.message).toEqual("TEST ERROR");
    }
  });

  test("POST /details", async () => {
    app.ibApiMock.getContractDetailsError = undefined;
    const res = await axios.post<ContractDetailsList>(
      baseUrl + "/details",
      {
        conId: REF_CONTRACT_DETAILS.contract.conId
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

  test("GET /details (no authorization)", async () => {
    try {
      await axios.post<ContractDetailsList>(
        baseUrl + `/details`,
        {
          conId: REF_CONTRACT_DETAILS.contract.conId
        },
        {},
      );
      throw "This must fail";
    } catch (e) {
      expect((<AxiosError>e).response?.status).toEqual(HttpStatus.UNAUTHORIZED);
    }
  });

  test("POST /details (empty result)", async () => {
    const res = await axios.post<ContractDetailsList>(
      baseUrl + "/details",
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

  test("GET /details (IBApiNext error)", async () => {
    app.ibApiMock.getContractDetailsError = {
      reqId: -1,
      code: 0,
      error: Error("TEST ERROR")
    }
    try {
      await axios.post<ContractDetailsList>(
        baseUrl + `/details`,
        {
          symbol: "" + Math.random(),
        },
        {
          headers: {
            authorization: authToken,
          },
        },
      );
      throw "This must fail";
    } catch (e) {
      expect((<AxiosError>e).response?.status).toEqual(HttpStatus.BAD_REQUEST);
      expect((<AxiosError>e).response?.data?.message).toEqual("TEST ERROR");
    }
  });

  test("POST /historicData", async () => {
    app.ibApiMock.getContractDetailsError = undefined;
    const res = await axios.post<OHLCBars>(
      baseUrl + "/historicData",
      {
        conId: REF_CONTRACT_DETAILS.contract.conId,
        duration: "52 W",
        barSize: BarSize.MINUTES_FIVE,
        whatToShow: WhatToShow.TRADES
      } as HistoricDataRequestArguments,
      {
        headers: {
          authorization: authToken,
        },
      },
    );

    expect(res.status).toEqual(HttpStatus.OK);
    expect(res.data.bars).toEqual(REF_BARS);
  });

  test("POST /historicData (no authorization)", async () => {
    try {
      await axios.post<ContractDetailsList>(
        baseUrl + `/historicData`,
        {
          conId: REF_CONTRACT_DETAILS.contract.conId,
          duration: "52 W",
          barSize: BarSize.MINUTES_FIVE,
          whatToShow: WhatToShow.TRADES
        } as HistoricDataRequestArguments,
        {},
      );
      throw "This must fail";
    } catch (e) {
      expect((<AxiosError>e).response?.status).toEqual(HttpStatus.UNAUTHORIZED);
    }
  });


  test("POST /historicData (invalid conId)", async () => {
    try {
      await axios.post<ContractDetailsList>(
        baseUrl + "/historicData",
        {
          conId: 0,
        } as HistoricDataRequestArguments,
        {
          headers: {
            authorization: authToken,
          },
        },
      );
      throw "This must fail";
    } catch (e) {
      expect((<AxiosError>e).response?.status).toEqual(HttpStatus.BAD_REQUEST);
    }
  });

  test("POST /historicData (no conId)", async () => {
    try {
      await axios.post<ContractDetailsList>(
        baseUrl + "/historicData",
        {},
        {
          headers: {
            authorization: authToken,
          },
        },
      );
      throw "This must fail";
    } catch (e) {
      expect((<AxiosError>e).response?.status).toEqual(HttpStatus.BAD_REQUEST);
    }
  });
});
