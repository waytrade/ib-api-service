import {HttpStatus} from "@waytrade/microservice-core";
import axios from "axios";
import {ContractDetailsList} from "../../models/contract-details.model";
import {IBApiApp} from "../ib-api-test-app";

/**
 * Broker API test code.
 */
describe("Test Broker API", () => {
  const TEST_USERNAME = "User" + Math.random();
  const TEST_PASSWORD = "Password" + Math.random();

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

  test("Get contractDetails (no authorization)", async () => {
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

  test("Get contractDetails (no contract details)", async () => {
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

  test("Get contractDetails (invalid conId format)", async () => {
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
});
