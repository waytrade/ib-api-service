import {
  controller,
  description,
  HttpError,
  HttpStatus,
  inject,
  MicroserviceRequest,
  post,
  requestBody,
  response,
  summary,
} from "@waytrade/microservice-core";
import {UsernamePassword} from "../models/username-password.model";
import {AuthenticationService} from "../services/authentication.service";

/**
 * The user authentication controller.
 */
@controller("User Authentication", "/auth")
export class AuthenticatonController {
  @inject("AuthenticationService")
  private authService!: AuthenticationService;

  @post("/password")
  @summary("Login with username and password.")
  @description(
    "Login with username and password and return the Bearer token on authorization header.",
  )
  @requestBody(UsernamePassword)
  @response(
    HttpStatus.UNAUTHORIZED,
    "Unauthorized: wrong username or password.",
  )
  async loginPassword(
    request: MicroserviceRequest,
    params: UsernamePassword,
  ): Promise<void> {
    // verify input

    if (!params.password || !params.username) {
      throw new HttpError(HttpStatus.BAD_REQUEST);
    }

    // login with password

    try {
      const jwt = await this.authService.loginUserPassword(
        params.username,
        params.password,
      );

      // set response headers

      request.writeResponseHeader(
        "access-control-expose-headers",
        "authorization",
      );
      request.writeResponseHeader("authorization", `Bearer ${jwt}`);
    } catch (err: unknown) {
      throw new HttpError(HttpStatus.UNAUTHORIZED, (<Error>err).message);
    }
  }
}
