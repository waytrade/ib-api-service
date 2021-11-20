import {inject, service} from "@waytrade/microservice-core";
import {IBApiApp} from "../app";
import {SecurityUtils} from "../utils/security.utils";

/**
 * The user authentication service.
 */
@service()
export class AuthenticationService {
  @inject("IBApiApp")
  private app!: IBApiApp;

  /** Start the service. */
  start(): void {
    if (!this.app.config.REST_API_USERNAME) {
      throw new Error("REST_API_USERNAME not configured.");
    }
    if (!this.app.config.REST_API_PASSWORD) {
      throw new Error("REST_API_PASSWORD not configured.");
    }
  }

  /**
   * Login with username and password.
   *
   * @returns the JWT token.
   */
  async loginUserPassword(username: string, password: string): Promise<string> {
    // verify username/password
    if (
      username !== this.app.config.REST_API_USERNAME ||
      password !== this.app.config.REST_API_PASSWORD
    ) {
      throw new Error("Wrong username or password");
    }

    return SecurityUtils.createJWT();
  }
}
