import {MicroserviceApp} from "@waytrade/microservice-core";
import path from "path";
import {IBApiServiceConfig} from "./config";
import {IBApiController} from "./controllers";
import {IBApiService} from "./services/ib-api-service";

/** List of controllers on the endpoint */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const CONTROLLERS = [IBApiService];

/** List of services on the app */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const SERVICES = [IBApiController];

/**
 * The Interactive Brokers TWS API service App.
 */
export class IBApiApp extends MicroserviceApp {
  constructor() {
    super(path.resolve(__dirname, ".."));
  }

  /** Get the service config */
  static get config(): IBApiServiceConfig {
    return <IBApiServiceConfig>IBApiApp.context.config;
  }

  /** Called when the context has booted, before the API service is started. */
  async onBoot(): Promise<void> {
    return;
  }

  /** Called when the microservice has been started. */
  onStarted(): void {
    IBApiApp.info(
      `Server is running at port ${IBApiApp.context.config.SERVER_PORT}`,
    );
  }
}
