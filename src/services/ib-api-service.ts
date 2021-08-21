import * as IB from "@stoqey/ib";
import {DiffTools, inject, MapExt, service} from "@waytrade/microservice-core";
import LruCache from "lru-cache";
import {exit} from "process";
import {
  auditTime,
  firstValueFrom,
  map,
  Observable,
  Subject,
  Subscription,
  takeUntil,
} from "rxjs";
import {IBApiApp} from "../app";
import {AccountSummary} from "../models/account-summary.model";
import {MarketData, MarketDataUpdate} from "../models/market-data.model";
import {Position, PositionsUpdate} from "../models/position.model";
import {IBApiLoggerProxy} from "../utils/ib-api-logger-proxy";
import {IBApiServiceHelper as Helper} from "./ib-api-service.helper";

/** Debounce time on market data ticks. */
const MARKET_DATA_TICK_DEBOUNCE_TIME_MS = 10;

/**
 * Account summary tag values, make suer this is in sync with
 * AccountSummary model.
 *
 * Ecented AccountSummary model if you extend this!!
 */
export const ACCOUNT_SUMMARY_TAGS = [
  "NetLiquidation",
  "TotalCashValue",
  "SettledCash",
  "BuyingPower",
  "GrossPositionValue",
  "InitMarginReq",
  "MaintMarginReq",
  "FullInitMarginReq",
  "FullMaintMarginReq",
  "FullAvailableFunds",
  "FullExcessLiquidity",
];

/**
 * The Interactive Brokers TWS API Service
 */
@service()
export class IBApiService {
  @inject("IBApiApp")
  private app!: IBApiApp;

  /** The [[IBApiNext]] instance. */
  private api!: IB.IBApiNext;

  /** Subscription on connection date. */
  private connectionState$?: Subscription;

  /** Cache of a requested contract details, with conId as key. */
  private readonly contractDetailsCache = new LruCache<
    number,
    IB.ContractDetails
  >({
    max: 128,
  });

  /** Start the service. */
  start(): void {
    // init IBApiNext

    if (!this.app.config.IB_GATEWAY_PORT) {
      throw new Error("IB_GATEWAY_PORT not configured.");
    }

    if (!this.app.config.IB_GATEWAY_HOST) {
      throw new Error("IB_GATEWAY_HOST not configured.");
    }

    this.api = new IB.IBApiNext({
      port: this.app.config.IB_GATEWAY_PORT,
      host: this.app.config.IB_GATEWAY_HOST,
      logger: new IBApiLoggerProxy(this.app),
      connectionWatchdogInterval: 30,
      reconnectInterval: 5000,
    });

    switch (this.app.config.LOG_LEVEL) {
      case "debug":
        this.api.logLevel = IB.LogLevel.DETAIL;
        break;
      case "info":
        this.api.logLevel = IB.LogLevel.INFO;
        break;
      case "warn":
        this.api.logLevel = IB.LogLevel.WARN;
        break;
      case "error":
        this.api.logLevel = IB.LogLevel.ERROR;
        break;
    }

    // exit on connection loss

    const mayReconnectTries = 5;
    let connectionTries = 0;

    this.connectionState$ = this.api.connectionState.subscribe({
      next: state => {
        switch (state) {
          case IB.ConnectionState.Connecting:
            connectionTries++;
            break;
          case IB.ConnectionState.Disconnected:
            if (connectionTries > mayReconnectTries) {
              this.app.error("Lost connection to IB Gateway, rebooting...");
              this.app.stop();
              exit(1);
            }
            break;
        }
      },
    });

    // connect to IB Gateway

    this.api.connect(0);
  }

  /** Stop the service. */
  stop(): void {
    this.connectionState$?.unsubscribe();
    delete this.connectionState$;
    this.api?.disconnect();
  }

  /** Observe the account summaries. */
  get accountSummaries(): Observable<AccountSummary[]> {
    return new Observable<AccountSummary[]>(res => {
      let tags = "";
      ACCOUNT_SUMMARY_TAGS.forEach(tag => {
        tags = tags + tag + ",";
      });
      tags += `$LEDGER:${this.app.config.BASE_CURRENCY}`;

      const cancel = new Subject();
      const subscribedPnlAccounts = new Set<string>();

      let firstEvent = true;

      this.api
        ?.getAccountSummary("All", tags)
        .pipe(takeUntil(cancel))
        .subscribe({
          error: (error: IB.IBApiNextError) => {
            this.app.error(
              "IBApiNext.getAccountSummary: " + error.error.message,
            );
          },
          next: update => {
            // collect updated

            const updated = new Map([
              ...(update.changed?.entries() ?? []),
              ...(update.added?.entries() ?? []),
            ]);

            const changed = new MapExt<string, AccountSummary>();
            updated.forEach((tagValues, accountId) => {
              Helper.colllectAccountSummaryTagValues(
                accountId,
                tagValues,
                this.app.config.BASE_CURRENCY ?? "",
                changed,
              );
            });

            // add baseCurrency to first event

            const changedArray = Array.from(changed.values());
            if (firstEvent) {
              changedArray.forEach(
                v => (v.baseCurrency = this.app.config.BASE_CURRENCY),
              );
              firstEvent = false;
            }

            // emit update event

            if (changedArray.length) {
              res.next(changedArray);
            }

            // subscribe on account PnLs

            updated.forEach((_tagValues, accountId) => {
              if (subscribedPnlAccounts.has(accountId)) {
                return;
              }
              subscribedPnlAccounts.add(accountId);

              this.api
                ?.getPnL(accountId)
                .pipe(takeUntil(cancel))
                .subscribe({
                  error: (error: IB.IBApiNextError) => {
                    this.app.error(
                      `getPnL(${accountId}): ${error.error.message}`,
                    );
                    subscribedPnlAccounts.delete(accountId);
                  },
                  next: pnl => {
                    const changedSummary: AccountSummary = {
                      account: accountId,
                      dailyPnL: pnl.dailyPnL,
                      realizedPnL: pnl.realizedPnL,
                      unrealizedPnL: pnl.unrealizedPnL,
                    };
                    res.next([changedSummary]);
                  },
                });
            });
          },
        });

      return (): void => {
        cancel.next(true);
        cancel.complete();
      };
    });
  }

  /** Observe the account positions. */
  get positions(): Observable<PositionsUpdate> {
    return new Observable<PositionsUpdate>(res => {
      const cancel = new Subject();

      const pnlSubscriptions = new Map<string, Subscription>();

      this.api
        ?.getPositions()
        .pipe(takeUntil(cancel))
        .subscribe({
          error: (error: IB.IBApiNextError) => {
            this.app.error("IBApiNext.getPositions: " + error.error.message);
          },
          next: update => {
            const changed = new MapExt<string, Position>();

            // collect updated

            const updated = new Map([
              ...(update.changed?.entries() ?? []),
              ...(update.added?.entries() ?? []),
            ]);

            updated.forEach((positions, accountId) => {
              positions.forEach(ibPosition => {
                const posId = Helper.formatPositionId(
                  accountId,
                  ibPosition.contract.conId,
                );
                const position = new Position({
                  id: posId,
                  conid: "" + ibPosition.contract.conId,
                  pos: ibPosition.pos,
                });

                if (ibPosition.avgCost) {
                  position.avgCost = ibPosition.avgCost;
                }

                changed.set(posId, position);
              });
            });

            // collect closed

            const removedIds: string[] = [];
            update.removed?.forEach((positions, account) => {
              positions.forEach(pos => {
                removedIds.push(
                  Helper.formatPositionId(account, pos.contract.conId),
                );
              });
            });

            // emit update event

            if (changed.size || removedIds.length) {
              res.next({
                changed: changed.size
                  ? Array.from(changed.values())
                  : undefined,
                closed: removedIds.length ? removedIds : undefined,
              });
            }

            // subscribe on PnL

            updated.forEach((positions, accountId) => {
              positions.forEach(ibPosition => {
                const posId = Helper.formatPositionId(
                  accountId,
                  ibPosition.contract.conId,
                );

                if (pnlSubscriptions.has(posId)) {
                  return;
                }

                const sub = this.api
                  ?.getPnLSingle(
                    ibPosition.account,
                    "",
                    ibPosition.contract.conId ?? 0,
                  )
                  .pipe(takeUntil(cancel))
                  .subscribe({
                    error: (error: IB.IBApiNextError) => {
                      pnlSubscriptions.delete(posId);
                      this.app.error(
                        `getPnLSingle(${ibPosition.contract.symbol}): ${error.error.message}`,
                      );
                    },
                    next: pnl => {
                      res.next({
                        changed: [
                          {
                            id: posId,
                            dailyPnL: pnl.dailyPnL,
                            marketValue: pnl.marketValue,
                            pos: pnl.position,
                            realizedPnL: pnl.realizedPnL,
                            unrealizedPnL: pnl.unrealizedPnL,
                          },
                        ],
                      });
                    },
                  });

                pnlSubscriptions.set(posId, sub);
              });
            });

            removedIds.forEach(id => {
              pnlSubscriptions.get(id)?.unsubscribe();
            });
          },
        });

      return (): void => {
        cancel.next(true);
        cancel.complete();
      };
    });
  }

  /** Get the contract details for a ficen conid */
  getContractDetails(conId: number): Promise<IB.ContractDetails> {
    const details = this.contractDetailsCache.get(conId);
    if (details) {
      return new Promise<IB.ContractDetails>(resolve => resolve(details));
    }

    return firstValueFrom(
      this.api?.getContractDetails({conId}).pipe(
        map((v: IB.ContractDetailsUpdate) => {
          this.contractDetailsCache.set(conId, v.all[0]);
          return v.all[0];
        }),
      ),
    );
  }

  /** Get market data updates for the given conId.  */
  getMarketData(conId: number): Observable<MarketDataUpdate> {
    return new Observable<MarketDataUpdate>(subscriber => {
      const cancel = new Subject();
      const sendInterval: NodeJS.Timeout | undefined = undefined;

      // lookup contract details from conId

      this.getContractDetails(conId)
        .then(details => {
          this.api.setMarketDataType(IB.MarketDataType.FROZEN);

          // subscribe on market data

          const lastMarketData: MarketData = {};

          this.api
            .getMarketData(
              details.contract,
              "104,105,106,165,411",
              false,
              false,
            )
            .pipe(
              takeUntil(cancel),
              auditTime(MARKET_DATA_TICK_DEBOUNCE_TIME_MS),
            )
            // eslint-disable-next-line rxjs/no-ignored-subscription
            .subscribe({
              next: update => {
                const currentMarketData = Helper.marketDataTicksToModel(
                  update.all,
                );
                const changedMarketData = DiffTools.diff(
                  lastMarketData,
                  currentMarketData,
                ).changed;

                Object.assign(lastMarketData, currentMarketData);

                if (changedMarketData) {
                  subscriber.next({
                    conId: details.contract.conId,
                    data: changedMarketData,
                  });
                }
              },
              error: (error: IB.IBApiNextError) => {
                this.app.error(
                  `getMarketData(${details.contract.symbol}) failed with ${error.error.message}`,
                );
                subscriber.error(new Error(error.error.message));
              },
            });
        })
        .catch(e => {
          this.app.error(
            `getContractDetails(${conId}) failed with: ${e.error.message}`,
          );
          subscriber.error(new Error(e.error.message));
        });

      return (): void => {
        cancel.next(true);
        cancel.complete();
        if (sendInterval) {
          clearInterval(sendInterval);
        }
      };
    });
  }
}
