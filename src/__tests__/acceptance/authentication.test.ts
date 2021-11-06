import {HttpStatus} from "@waytrade/microservice-core";
import axios from "axios";
import {IBApiApp} from "../ib-api-test-app";

/**
 * User authentication test code.
 */
describe("Test User Authentication", () => {
  const TEST_USERNAME = "User" + Math.random();
  const TEST_PASSWORD = "Password" + Math.random();
  const app = new IBApiApp();
  beforeAll(async () => {
    await app.start({
      SERVER_PORT: undefined,
      REST_API_USERNAME: TEST_USERNAME,
      REST_API_PASSWORD: TEST_PASSWORD,
    });
  });

  afterAll(async () => {
    app.stop();
  });

  test("Login with username and password", async () => {
    const auth = (
      await axios.post<void>(
        `http://127.0.0.1:${app.apiServerPort}/auth/password`,
        {
          username: TEST_USERNAME,
          password: TEST_PASSWORD,
        },
      )
    ).headers["authorization"] as string;

    expect(auth.startsWith("Bearer ")).toBeTruthy();
  });

  test("Login with username and password (wrong credentials)", async () => {
    try {
      await axios.post<void>(
        `http://127.0.0.1:${app.apiServerPort}/auth/password`,
        {
          username: TEST_USERNAME,
          password: "wrong password",
        },
      );
      throw "This must fail";
    } catch (e) {
      expect(e.response.status).toEqual(HttpStatus.UNAUTHORIZED);
      expect(e.response.data).toEqual({message: "Wrong username or password"});
    }
  });

  test("Login with username and password (no credentials)", async () => {
    try {
      await axios.post<void>(
        `http://127.0.0.1:${app.apiServerPort}/auth/password`,
        {},
      );
      throw "This must fail";
    } catch (e) {
      expect(e.response.status).toEqual(HttpStatus.BAD_REQUEST);
    }
  });
});
