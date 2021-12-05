import {
  HttpError,
  HttpStatus,
  MicroserviceRequest
} from "@waytrade/microservice-core";
import Cookie from "cookie";
import crypto from "crypto";
import jwt from "jsonwebtoken";

/** Secret used signing JWT tokens. */
const JWT_SECRET = crypto.randomBytes(64).toString("hex");

/** Lifetime of a JWT Bearer token in seconds. */
const JWT_TOKEN_LIFETIME = 60 * 60 * 48; // 48h

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

  /*
   * Verify that authorization headers contains a valid JWT token, signed
   * by this service instance.
   */
  static vefiyBearer(token: string): boolean {
    try {
      jwt.verify(token.substr("Bearer ".length), JWT_SECRET);
    } catch (e) {
      return false;
    }
    return true;
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

    if (!this.vefiyBearer(bearerToken)) {
      throw new HttpError(
        HttpStatus.UNAUTHORIZED,
        "Invalid bearer token",
      );
    }
  }
}
