import {
  HttpError,
  HttpStatus,
  MicroserviceRequest,
} from "@waytrade/microservice-core";
import * as bcrypt from "bcrypt";
import Cookie from "cookie";
import crypto from "crypto";
import jwt from "jsonwebtoken";

/** Secret used signing JWT tokens. */
const JWT_SECRET = crypto.randomBytes(48).toString("hex");

/** Lifetime of a JWT Bearer token in seconds. */
const JWT_TOKEN_LIFETIME = 60 * 60 * 24; // 60s * 60m * 24h = 1day

/**
 * Collection of security-related helper functions.
 */
export class SecurityUtils {
  /** Hash a cleartext string. */
  static async hash(text: string): Promise<string> {
    return await bcrypt.hash(text, 10);
  }

  /** Create a JWT token. */
  static createJWT(permissionGrants: string[]): string {
    return jwt.sign(
      {
        data: {
          permissionGrants,
        },
        exp: Math.floor(Date.now() / 1000) + JWT_TOKEN_LIFETIME,
      },
      JWT_SECRET,
    );
  }

  /**
   * Verify that authorization headers contains a valid JWT token and the
   * required permission is granted.
   *
   * @throws a HttpError if failed.
   */
  static ensurePermission(
    requiredPermission: string,
    request: MicroserviceRequest,
  ): void {
    // get the bearer token from request headers

    if (!request.headers) {
      throw new HttpError(HttpStatus.UNAUTHORIZED, "No authorization header");
    }

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

    if (!bearerToken || !bearerToken.startsWith("Bearer ")) {
      throw new HttpError(
        HttpStatus.UNAUTHORIZED,
        "Invalid authorization header value (must be a Bearer token)",
      );
    }

    // decode the JWT

    const jwtToken = bearerToken.substr("Bearer ".length);

    try {
      const jwtData = jwt.verify(jwtToken, JWT_SECRET);

      // verify permissoin grants

      const permissionGrants = (<Record<string, string[]>>jwtData)
        .permissionGrants;

      const hasPermission =
        permissionGrants.find(v => v === "*" || v === requiredPermission) !==
        undefined;

      if (!hasPermission) {
        throw new HttpError(HttpStatus.FORBIDDEN, "Missing permisson");
      }
    } catch (e) {
      throw e;
    }
  }
}
