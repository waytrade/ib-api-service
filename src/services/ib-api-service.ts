import * as IB from "@stoqey/ib";
import {MapExt, service} from "@waytrade/microservice-core";
import LruCache from "lru-cache";
import {Observable, Subject, Subscription} from "rxjs";
import {debounceTime, map, take} from "rxjs/operators";
import {IBApiApp} from "..";
import {
  AccountSummariesUpdate,
  AccountSummary,
} from "../models/account-summary.model";
import {Contract} from "../models/contract.model";
import {MarketData, MarketDataUpdate} from "../models/market-data.model";
import {Position, PositionsUpdate} from "../models/position.model";
import {IBApiLoggerProxy} from "../utils/ib-api-logger-proxy";

/** A position ID. */
type PositionID = string;

/** Debounce time on market data ticks. */
const MARKET_DATA_TICK_DEBOUNCE_TIME_MS = 100;

/**
 * The Interactive Brokers TWS API Service
 */
@service()
export class IBApiService {
  /** The [[IBApiNext]] instance. */
  private static api?: IB.IBApiNext;

  /** Map of all current account summaries, with account id as key. */
  private static readonly accountSummaries = new MapExt<
    IB.AccountId,
    AccountSummary
  >();

  /**
   * List of all currently active subscription.
   * Will be unsubscribed during service shutdown.
   */
  private static readonly subscriptions = new Set<Subscription>();

  /** Subject to signal updates on the account summaries. */
  private static readonly accountSummaryUpdates = new Subject<AccountSummariesUpdate>();

  /** Map of all current positions, with positions id as key. */
  private static readonly positions = new MapExt<PositionID, Position>();

  /** Subject to signal updates on the positions. */
  private static readonly positionUpdates = new Subject<PositionsUpdate>();

  /** All account id that already have a PnL subscription. */
  private static readonly accountPnLSubscriptions = new Set<string>();

  /** All position market data subscriptions, with positions id sa key. */
  private static readonly positionsMarketDataSubscriptions = new Map<
    string,
    Subscription
  >();

  /** All position PnL subscriptions, with positions id sa key. */
  private static readonly positionsPnLSubscriptions = new Map<
    string,
    Subscription
  >();

  /** Cache of a requested contract details, with conid as key. */
  private static readonly contractDetails = new LruCache<
    number,
    IB.ContractDetails
  >({
    max: 128,
  });

  /** Start the service. */
  static async boot(): Promise<void> {
    // init IBApiNext

    this.shutdown();

    if (!IBApiApp.config.IB_GATEWAY_PORT) {
      throw new Error("IB_GATEWAY_PORT not configured.");
    }

    if (!IBApiApp.config.IB_GATEWAY_HOST) {
      throw new Error("IB_GATEWAY_HOST not configured.");
    }

    this.api = new IB.IBApiNext({
      port: IBApiApp.config.IB_GATEWAY_PORT,
      host: IBApiApp.config.IB_GATEWAY_HOST,
      logger: new IBApiLoggerProxy(IBApiApp.context),
      reconnectInterval: 15000,
    });

    switch (IBApiApp.config.LOG_LEVEL) {
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

    // connect to IB Gateway

    this.api.connect();

    // subscribe on positions

    this.subscribePositions();
    this.subscribeAccountSummaries();
    this.subscribePnL();
  }

  /** Get an observable to watch the connection state to IB Gateway */
  static get connectionState(): Observable<IB.ConnectionState> {
    if (!this.api) {
      throw new Error("IBApiNext not initialized.");
    }
    return this.api.connectionState;
  }

  /** Shutdown the service. */
  static shutdown(): void {
    // unsubscribe

    this.subscriptions.forEach(sub => sub.unsubscribe());

    this.subscriptions.clear();
    this.accountPnLSubscriptions.clear();
    this.positionsMarketDataSubscriptions.clear();

    // disconnect

    if (this.api) {
      this.api.disconnect();
      delete this.api;
    }
  }

  /**  Get account summaries updates. */
  static getAccountSummaries(): Observable<AccountSummariesUpdate> {
    return new Observable(subscriber => {
      // replay current account summaries

      subscriber.next({
        all: Array.from(this.accountSummaries.values()),
      });

      // subscribe on account summary updates

      const sub$ = this.accountSummaryUpdates.subscribe({
        next: update => {
          subscriber.next(update);
        },
      });

      return (): void => {
        sub$?.unsubscribe();
      };
    });
  }

  /**  Get position updates. */
  static getPositions(): Observable<PositionsUpdate> {
    return new Observable<PositionsUpdate>(subscriber => {
      // replay current positions

      subscriber.next({
        all: Array.from(this.positions.values()),
      });

      // subscribe on position updates

      const sub$ = this.positionUpdates.subscribe({
        next: update => subscriber.next(update),
      });

      return (): void => {
        sub$?.unsubscribe();
      };
    });
  }

  /**  Get details about a contract. */
  static getContractDetails(conId: number): Promise<IB.ContractDetails> {
    if (!this.api) {
      throw new Error("Service not initialized.");
    }
    const details = this.contractDetails.get(conId);
    if (details) {
      return new Promise<IB.ContractDetails>(resolve => resolve(details));
    }

    return this.api
      ?.getContractDetails({conId})
      .pipe(
        take(1),
        map((v: IB.ContractDetailsUpdate) => {
          this.contractDetails.set(conId, v.all[0]);
          return v.all[0];
        }),
      )
      .toPromise();
  }

  /** Get an Observable to receive market data of a contract. */
  static getMarketData(conId: number): Observable<MarketDataUpdate> {
    return new Observable<MarketDataUpdate>(subscriber => {
      const api = this.api;
      if (!api) {
        subscriber.error("Service not initialized.");
        return;
      }

      let sub$: Subscription | undefined = undefined;
      let unsubscribed = false;

      this.getContractDetails(conId)
        .then(details => {
          if (unsubscribed) {
            return;
          }
          api.setMarketDataType(IB.MarketDataType.FROZEN);
          const latest: MarketData = {};
          sub$ = api
            .getMarketData(details.contract, "104,105,411", false, false)
            .pipe(debounceTime(MARKET_DATA_TICK_DEBOUNCE_TIME_MS))
            .subscribe({
              next: update => {
                const changed: MarketData = {};
                this.updateMarketData(latest, update.all, changed);
                subscriber.next({
                  conId: details.contract.conId,
                  marketData: changed,
                });
              },
              error: (error: IB.IBApiNextError) => {
                IBApiApp.error("getMarketData: " + error.error.message);
              },
            });
        })
        .catch(e => {
          IBApiApp.error(
            `getContractDetails(${conId}) failed with: ${e.error.message}`,
          );
          subscriber.error(e);
        });

      return (): void => {
        unsubscribed = true;
        sub$?.unsubscribe();
      };
    });
  }

  /** Get an Observable to receive FX spot-market data. */
  static getFxMarketData(
    baseCurrency: string,
    fxCurrency: string,
  ): Observable<MarketDataUpdate> {
    return new Observable<MarketDataUpdate>(subscriber => {
      const api = this.api;
      if (!api) {
        subscriber.error("Service not initialized.");
        return;
      }

      api.setMarketDataType(IB.MarketDataType.FROZEN);
      const latest: MarketData = {};
      const sub$ = api
        .getMarketData(
          {
            symbol: baseCurrency,
            currency: fxCurrency,
            exchange: "IDEALPRO",
            secType: IB.SecType.CASH,
          },
          "",
          false,
          false,
        )
        .pipe(debounceTime(MARKET_DATA_TICK_DEBOUNCE_TIME_MS))
        .subscribe({
          next: update => {
            const changed: MarketData = {};
            this.updateMarketData(latest, update.all, changed);
            subscriber.next({
              fxPair: baseCurrency + fxCurrency,
              marketData: changed,
            });
          },
          error: (error: IB.IBApiNextError) => {
            IBApiApp.error("getMarketData: " + error.error.message);
          },
        });

      return (): void => {
        sub$?.unsubscribe();
      };
    });
  }

  /** Subscribe on account summaries. */
  private static subscribeAccountSummaries(): void {
    let TAGS =
      "NetLiquidation,TotalCashValue,SettledCash,BuyingPower," +
      "GrossPositionValue,InitMarginReq,MaintMarginReq,FullInitMarginReq," +
      "FullMaintMarginReq,FullAvailableFunds,FullExcessLiquidity";
    TAGS = TAGS + `,$LEDGER:${IBApiApp.config.BASE_CURRENCY}`;
    const sub$ = this.api?.getAccountSummary("All", TAGS).subscribe({
      error: (error: IB.IBApiNextError) => {
        IBApiApp.error("getAccountSummary: " + error.error.message);
      },
      next: update => {
        // update account summaries list

        this.accountSummaries.clear();
        this.updateAccountSummaries(this.accountSummaries, update.all);

        // send changed to subscribers

        const changed = new MapExt<string, AccountSummary>();
        this.updateAccountSummaries(changed, update.changed);
        this.updateAccountSummaries(changed, update.added);

        this.accountSummaryUpdates.next({
          changed: Array.from(changed.values()),
        });
      },
    });
    if (sub$) {
      this.subscriptions.add(sub$);
    }
  }

  /** Subscribe on account summaries. */
  private static subscribePnL(): void {
    const sub$ = this.accountSummaryUpdates.subscribe({
      next: update => {
        update.changed?.forEach(accountSummary => {
          const account = accountSummary.account;
          if (!account) {
            return;
          }
          if (!this.accountPnLSubscriptions.has(account)) {
            const pnlSub$ = this.api?.getPnL(account).subscribe({
              error: (error: IB.IBApiNextError) => {
                IBApiApp.error("getPnL: " + error.error.message);
              },
              next: pnl => {
                const summary = this.accountSummaries.get(account);
                if (summary) {
                  Object.assign(summary, pnl);
                  this.accountSummaryUpdates.next({
                    changed: [summary],
                  });
                }
              },
            });
            if (pnlSub$) {
              this.subscriptions.add(pnlSub$);
              this.accountPnLSubscriptions.add(account);
            }
          }
        });
      },
    });
    if (sub$) {
      this.subscriptions.add(sub$);
    }
  }

  /** Subscribe on positions. */
  private static subscribePositions(): void {
    const sub$ = this.api?.getPositions().subscribe({
      error: (error: IB.IBApiNextError) => {
        IBApiApp.error("getPositions: " + error.error.message);
      },
      next: update => {
        // remove closed positions

        const closed: string[] = [];
        update.removed?.forEach(positions => {
          positions.forEach(pos => {
            const id = `${pos.account}:${pos.contract.conId}`;
            closed.push(id);

            this.positions.delete(id);

            const marketDataSub = this.positionsMarketDataSubscriptions.get(id);
            if (marketDataSub) {
              this.subscriptions.delete(marketDataSub);
              this.positionsMarketDataSubscriptions.delete(id);
              marketDataSub.unsubscribe();
            }

            const pnlSub = this.positionsPnLSubscriptions.get(id);
            if (pnlSub) {
              this.subscriptions.delete(pnlSub);
              this.positionsPnLSubscriptions.delete(id);
              pnlSub.unsubscribe();
            }
          });
        });

        this.updatePositions(this.positions, update.all);

        // request details and market data on newly added positions

        update.added?.forEach(positions => {
          positions.forEach(pos => {
            if (!pos.contract.conId) {
              return;
            }
            const id = `${pos.account}:${pos.contract.conId}`;
            const currentPosition = this.positions.get(id);
            if (!currentPosition) {
              return;
            }

            // request PnL

            if (!this.positionsPnLSubscriptions.has(id)) {
              const pnl$ = this.api
                ?.getPnLSingle(pos.account, "", pos.contract.conId)
                .subscribe({
                  error: (error: IB.IBApiNextError) => {
                    IBApiApp.error("getPnLSingle: " + error.error.message);
                  },
                  next: pnl => {
                    const changed: Position = {id: id};
                    changed.marketValue = pnl.marketValue;
                    changed.pos = pnl.position;
                    changed.dailyPnL = pnl.dailyPnL;
                    changed.unrealizedPnL = pnl.unrealizedPnL;
                    changed.realizedPnL = pnl.realizedPnL;
                    Object.assign(currentPosition, changed);
                    this.positionUpdates.next({
                      changed: [changed],
                    });
                  },
                });
              if (pnl$) {
                this.positionsPnLSubscriptions.set(id, pnl$);
                this.subscriptions.add(pnl$);
              }
            }

            // request details

            this.getContractDetails(pos.contract.conId)
              .then(details => {
                currentPosition.details = {};
                Object.assign(currentPosition.details, details);

                // request market data

                if (
                  this.positionsMarketDataSubscriptions.has(id) ||
                  !this.api
                ) {
                  return;
                }

                this.api.setMarketDataType(IB.MarketDataType.FROZEN);

                const latest: MarketData = {};
                const marketData$ = this.api
                  ?.getMarketData(details.contract, "104,105,411", false, false)
                  .pipe(debounceTime(MARKET_DATA_TICK_DEBOUNCE_TIME_MS))
                  .subscribe({
                    error: (error: IB.IBApiNextError) => {
                      IBApiApp.error("getPnLSingle: " + error.error.message);
                    },
                    next: update => {
                      const changed: MarketData = {};
                      this.updateMarketData(latest, update.all, changed);

                      currentPosition.marketData =
                        currentPosition.marketData ?? {};
                      Object.assign(currentPosition.marketData, latest);

                      this.positionUpdates.next({
                        changed: [
                          {
                            id: id,
                            marketData: changed,
                          },
                        ],
                      });
                    },
                  });

                this.positionsMarketDataSubscriptions.set(id, marketData$);
                this.subscriptions.add(marketData$);
              })
              .catch(e => {
                IBApiApp.error(
                  `getContractDetails(${pos.contract.conId}) failed with: ${e.error.message}`,
                );
              });
          });
        });

        // send changed to subscribers

        const changed = new MapExt<PositionID, Position>();
        this.updatePositions(changed, update.added);
        this.updatePositions(changed, update.changed);

        this.positionUpdates.next({
          changed: Array.from(changed.values()),
          closed,
        });
      },
    });
    if (sub$) {
      this.subscriptions.add(sub$);
    }
  }

  /** Update a map of account summaries with values as received from IBApi. */
  private static updateAccountSummaries(
    all: Map<string, AccountSummary>,
    update?: IB.AccountSummaries,
  ): void {
    update?.forEach((tagValues, account) => {
      const current = all.get(account) ?? {};
      const updated: AccountSummary = {
        account,
        baseCurrency: IBApiApp.config.BASE_CURRENCY,
      };

      tagValues.forEach((values, tag) => {
        const firstEntry = values.entries().next();
        if (firstEntry.done) {
          // we only handle first currency on list
          return;
        }

        const propName = tag[0].toLowerCase() + tag.substr(1);
        const value = (<IB.AccountSummaryValue>firstEntry.value[1]).value;

        (<Record<string, number>>updated)[propName] = Number(value);
      });

      Object.assign(current, updated);
      all.set(account, current);
    });
  }

  /** Update a map of positions with values as received from IBApi. */
  private static updatePositions(
    all: Map<string, Position>,
    update?: IB.AccountPositions,
  ): void {
    update?.forEach((ibPositions, accountId) => {
      ibPositions.forEach(ibPosition => {
        const id = `${accountId}:${ibPosition.contract.conId}`;
        const current = all.get(id) ?? new Position();
        const updated: Position = {
          id: id,
          pos: ibPosition.pos,
          avgCost: ibPosition.avgCost,
          contract: new Contract(ibPosition.contract),
        };
        Object.assign(current, updated);
        all.set(id, current);
      });
    });
  }

  /** Update a MarketData model with values as received from IBApi. */
  private static updateMarketData(
    all: MarketData,
    update: IB.MarketDataTicks,
    diff?: MarketData,
  ): void {
    const allRecord = <Record<string, number>>all;
    const diffRecord = <Record<string, number>>diff;

    update.forEach((value, type) => {
      let propName =
        type > IB.IBApiNextTickType.API_NEXT_FIRST_TICK_ID
          ? IB.IBApiNextTickType[type]
          : IB.IBApiTickType[type];
      if (propName.startsWith("DELAYED_")) {
        propName = propName.substr("DELAYED_".length);
      }
      if (allRecord[propName] !== value.value) {
        allRecord[propName] = value.value;
        if (diff) {
          diffRecord[propName] = value.value;
        }
      }
    });
  }
}
