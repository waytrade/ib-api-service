import {
  HttpError,
  HttpStatus,
  MicroserviceRequest,
} from "@waytrade/microservice-core";
import Cookie from "cookie";
import jwt from "jsonwebtoken";

/** Secret used signing JWT tokens. */
//const JWT_SECRET = crypto.randomBytes(64).toString("hex");
const JWT_SECRET = "123455678";

/** Lifetime of a JWT Bearer token in seconds. */
const JWT_TOKEN_LIFETIME = 60 * 60 * 24; // 60s * 60m * 24h = 1day

/**
 * Collection of security-related helper functions.
 */
export class SecurityUtils {
  /** Create a JWT token. */
  static createJWT(): string {
    return jwt.sign(
      {
        exp: Math.floor(Date.now() / 1000) + JWT_TOKEN_LIFETIME,
      },
      JWT_SECRET,
    );
  }

  /**
   * Verify that authorization headers contains a valid JWT token, signed
   * by this service instance.
   *
   * @throws a HttpError if failed.
   */
  static ensureAuthorization(request: MicroserviceRequest): void {
    // get the bearer token from request headers

    let bearerToken = request.headers.get("authorization");
    if (!bearerToken) {
      const cookie = request.headers.get("cookie");
      if (cookie) {
        bearerToken = Cookie.parse(cookie).authorization;
      }
    }

    if (!bearerToken) {
      throw new HttpError(
        HttpStatus.UNAUTHORIZED,
        "Missing authorization header",
      );
    }

    if (!bearerToken.startsWith("Bearer ")) {
      throw new HttpError(
        HttpStatus.UNAUTHORIZED,
        "Invalid authorization header value (must be a Bearer token)",
      );
    }

    // verify the JWT

    try {
      jwt.verify(bearerToken.substr("Bearer ".length), JWT_SECRET);
    } catch (e) {
      throw new HttpError(HttpStatus.UNAUTHORIZED, (<Error>e).message);
    }
  }
}
