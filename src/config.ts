import {MicroserviceConfig} from "@waytrade/microservice-core";

/**
 * Configuration of a Saurons AI microservice.
 */
export interface IBApiServiceConfig extends MicroserviceConfig {
  /** Port of the IB Gateway. */
  IB_GATEWAY_PORT?: number;

  /** Host of the IB Gateway. */
  IB_GATEWAY_HOST?: string;

  /**
   * Number of re-connect tries when connection to IB Gateway drops,
   * before the App will shutdown.
   */
  IB_GATEWAY_RECONNECT_TRIES?: number;

  /** The username for login on the REST API. */
  REST_API_USERNAME?: string;

  /** The password for login on the REST API. */
  REST_API_PASSWORD?: string;

  /**
   * Base currency of the IB account(s).
   * Multiple linked accounts with different base currency are not supported (yet?).
   */
  BASE_CURRENCY?: string;
}
