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
   * Base currency of the IB account(s).
   * Multiple linked accounts with different base currency are not supported (yet?).
   */
  BASE_CURRENCY?: string;

  /** The trading mode. Used on docker to switch port when in paper trading mode. */
  DOCKER_TRADING_MODE?: string;
}
