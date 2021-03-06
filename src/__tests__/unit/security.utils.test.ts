import {HttpError, HttpStatus, MicroserviceRequest} from "@waytrade/microservice-core";
import Cookie from "cookie";
import {SecurityUtils} from "../../utils/security.utils";

describe("Test SecurityUtils", () => {
  test("Test ensureAuthorization (authorization header)", () => {
    const jwt = SecurityUtils.createJWT();

    const headers = new Map();
    headers.set("authorization", `Bearer ${jwt}`);

    SecurityUtils.ensureAuthorization(<MicroserviceRequest>{
      headers,
    });
  });

  test("Test ensureAuthorization (cookie header)", () => {
    const jwt = SecurityUtils.createJWT();

    const headers = new Map();
    headers.set("cookie", Cookie.serialize("authorization", `Bearer ${jwt}`));

    SecurityUtils.ensureAuthorization(<MicroserviceRequest>{
      headers,
    });
  });

  test("Test ensureAuthorization (no authorization header)", () => {
    const headers = new Map();

    let hasThrown = false;
    try {
      SecurityUtils.ensureAuthorization(<MicroserviceRequest>{
        headers,
      });
    } catch (e) {
      expect((<HttpError>e).code).toEqual(HttpStatus.UNAUTHORIZED);
      expect((<HttpError>e).message).toEqual("Missing authorization header");
      hasThrown = true;
    }

    expect(hasThrown).toBeTruthy();
  });

  test("Test ensureAuthorization (invalid Bearer token)", () => {
    const headers = new Map();
    headers.set("authorization", `thisIsNoValidBearer`);

    let hasThrown = false;
    try {
      SecurityUtils.ensureAuthorization(<MicroserviceRequest>{
        headers,
      });
    } catch (e) {
      expect((<HttpError>e).code).toEqual(HttpStatus.UNAUTHORIZED);
      expect((<HttpError>e).message).toEqual(
        "Invalid bearer token",
      );
      hasThrown = true;
    }

    expect(hasThrown).toBeTruthy();
  });

  test("Test ensureAuthorization (invalid JWT token)", () => {
    const headers = new Map();
    headers.set("authorization", `Bearer thisIsNoValidJWT`);

    let hasThrown = false;
    try {
      SecurityUtils.ensureAuthorization(<MicroserviceRequest>{
        headers,
      });
    } catch (e) {
      expect((<HttpError>e).code).toEqual(HttpStatus.UNAUTHORIZED);
      expect((<HttpError>e).message).toEqual("Invalid bearer token");
      hasThrown = true;
    }

    expect(hasThrown).toBeTruthy();
  });
});
