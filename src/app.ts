import {DefaultMicroserviceComponentFactory, MicroserviceApp, MicroserviceComponentFactory} from "@waytrade/microservice-core";
import path from "path";
import {IBApiServiceConfig} from "./config";
import {AccountController} from "./controllers/account.controller";
import {AuthenticatonController} from "./controllers/authentication.controller";
import {ContractsController} from "./controllers/contracts.controller";
import {RealtimeDataController} from "./controllers/realtime-data.controller";
import {AuthenticationService} from "./services/authentication.service";
import {IBApiFactoryService} from "./services/ib-api-factory.service";
import {IBApiService} from "./services/ib-api.service";
import {SecurityUtils} from "./utils/security.utils";

/**
 * The Interactive Brokers TWS API service App.
 */
export class IBApiApp extends MicroserviceApp<IBApiServiceConfig> {
  constructor(componentFactory: MicroserviceComponentFactory =
      new DefaultMicroserviceComponentFactory()) {
    super(path.resolve(__dirname, ".."), {
      apiControllers: [
        AuthenticatonController,
        ContractsController,
        AccountController,
        RealtimeDataController,
      ],
      services: [AuthenticationService, IBApiService, IBApiFactoryService],
    }, componentFactory);
  }

  /** Called when the app shall boot up. */
  protected async boot(): Promise<void> {
    this.info(`Booting ib-api-service at port ${this.config.SERVER_PORT}`);
    this.info(`IB Gateway host: ${this.config.IB_GATEWAY_HOST}`);
    this.info(`IB Gateway port: ${this.config.IB_GATEWAY_PORT}`);
  }

  /** Called when the microservice has been started. */
  onStarted(): void {
    this.info(`ib-api-service is running at port ${this.config.SERVER_PORT}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected onVerifyBearerAuth = (token: string, scopes: string[]): boolean => {
    return SecurityUtils.vefiyBearer(token);
  };
}
