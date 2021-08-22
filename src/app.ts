import {MicroserviceApp} from "@waytrade/microservice-core";
import path from "path";
import {IBApiServiceConfig} from "./config";
import {IBApiController} from "./controllers/ib-api.controller";
import {IBApiService} from "./services/ib-api.service";

/**
 * The Interactive Brokers TWS API service App.
 */
export class IBApiApp extends MicroserviceApp<IBApiServiceConfig> {
  constructor() {
    super(path.resolve(__dirname, ".."), {
      apiControllers: [IBApiController],
      services: [IBApiService],
    });
  }

  /** Called when the app shall boot up. */
  protected async boot(): Promise<void> {
    // overwrite port if TRADING_MODE is specified
    if (this.config.TRADING_MODE === "live") {
      this.config.IB_GATEWAY_PORT = 4001;
    } else if (this.config.TRADING_MODE === "paper") {
      this.config.IB_GATEWAY_PORT = 4002;
    }

    this.info(`Booting ib-api-service at port ${this.config.SERVER_PORT}`);
    this.info(`IB Gateway host: ${this.config.IB_GATEWAY_HOST}`);
    this.info(`IB Gateway port: ${this.config.IB_GATEWAY_PORT}`);
  }

  /** Called when the microservice has been started. */
  onStarted(): void {
    this.info(`ib-api-service is running at port ${this.config.SERVER_PORT}`);
  }
}
