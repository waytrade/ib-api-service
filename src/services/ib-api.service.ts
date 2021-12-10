import * as IB from "@stoqey/ib";
import {IBApiNextError} from "@stoqey/ib";
import {
  DiffTools,
  inject,
  MapExt,
  service,
  subscribeUntil
} from "@waytrade/microservice-core";
import LruCache from "lru-cache";
import {
  firstValueFrom, map,
  Observable, Subject,
  Subscription,
  takeUntil
} from "rxjs";
import {IBApiApp} from "../app";
import {AccountSummary} from "../models/account-summary.model";
import {BarSize} from "../models/historic-data-request.model";
import {MarketData} from "../models/market-data.model";
import {OHLCBars} from "../models/ohlc-bar.model";
import {Position} from "../models/position.model";
import {
  ACCOUNT_SUMMARY_TAGS,
  IBApiServiceHelper as Helper
} from "../utils/ib.helper";
import {IBApiFactoryService} from "./ib-api-factory.service";

/**
 * Send interval on market data ticks in milliseconds.
 * TWS sends market data value changes one-by-one which can cause a lot of
 * overhead donwstream. Use this setting to reduce update frequency.
 */
const MARKET_DATA_SEND_INTERVAL_MS = 10;

/** Re-try intervall when an IB function has reported an error */
const IB_ERROR_RETRY_INTERVAL = 1000 * 30; // 30sec

/** Re-try intervall when an IB function has reported an error for tests */
const IB_ERROR_RETRY_INTERVAL_TEST = 1000; // 1sec


/** An update the positions.  */
export class PositionsUpdate {
  /** List of positions added or changed since last update. */
  changed?: Position[];

  /** List of positions closed since last update. */
  closed?: Position[];
}

/**
 * The Interactive Brokers TWS API Service
 */
@service()
export class IBApiService {
  @inject("IBApiApp")
  private app!: IBApiApp;

  /** The [[IBApiNext]] factory instance. */
  @inject("IBApiFactoryService")
  private factory!: IBApiFactoryService;

  /** The [[IBApiNext]] instance. */
  private api!: IB.IBApiNext;

  /** Subscription on IBApiNext connection date. */
  private connectionState$?: Subscription;

  /** The service shutdown signal. */
  private shutdownSignal = new Subject<void>();

  /** Cache of a requested contract details, with conId as key. */
  private readonly contractDetailsCache = new LruCache<
    number,
    IB.ContractDetails[]
  >({
    max: 128,
  });

  /** All current account summary values. */
  private readonly currentAccountSummaries = new MapExt<
    string,
    AccountSummary
  >();

  /** Account summary change subject. */
  private readonly accountSummariesChange = new Subject<AccountSummary[]>();

  /** All current positions. */
  private readonly currentPositions = new MapExt<
    string,
    Position
  >();

  /** Position change subject. */
  private readonly positionsChange = new Subject<PositionsUpdate>();

  /** Start the service. */
  async start(): Promise<void> {
    this.factory.api.then(api => {
      this.api = api;
      this.subscribeAccountSummaries();
      this.subscribeAccountPnL();
      this.subscribePositions();

      // exit on connection loss

      let connectionTries = 0;
      let connectedTimer: NodeJS.Timeout;

      this.connectionState$ = api.connectionState.subscribe({
        next: state => {
          switch (state) {
            case IB.ConnectionState.Connecting:
              connectionTries++;
              break;
            case IB.ConnectionState.Connected:
              if (connectedTimer) {
                clearTimeout(connectedTimer);
              }
              connectedTimer = global.setTimeout(() => {
                connectionTries = 0;
              }, 2000); // wait 2s to ensure a stable connection before resetting connectionTries
              break;
            case IB.ConnectionState.Disconnected:
              if (connectedTimer) {
                clearTimeout(connectedTimer);
              }
              if (
                connectionTries >= (this.app.config.IB_GATEWAY_RECONNECT_TRIES ?? 0)
              ) {
                this.app.error("Lost connection to IB Gateway, shutown app...");
                api.disconnect();
                this.app.stop();
              }
              break;
          }
        },
      });
    });
  }

  /** Stop the service. */
  stop(): void {
    this.connectionState$?.unsubscribe();
    this.shutdownSignal.next();
  }

  /** Search contracts where name or symbol matches the given text pattern. */
  async searchContracts(pattern: string): Promise<IB.ContractDescription[]> {
    try {
      return await this.api.searchContracts(pattern);
    } catch(e) {
      throw (<IBApiNextError>e).error;
    }
  }

  /** Get the contract details for contract that match the given criteria. */
  async getContractDetails(
    contract: IB.Contract,
  ): Promise<IB.ContractDetails[]> {
    if (contract.conId) {
      const cache = this.contractDetailsCache.get(contract.conId);
      if (cache) {
        return cache;
      }
    }

    try {
      const details = await this.api?.getContractDetails(contract);
      if (contract.conId && details.length) {
        this.contractDetailsCache.set(contract.conId, details);
      }
      return details;
    } catch(e) {
      throw (<IBApiNextError>e).error;
    }
  }

  /** Get historic OHLC data of a contract of a given contract ID. */
  async getHistoricData(
    conId: number,
    end: string | undefined,
    duration: string,
    barSize: BarSize,
    whatToShow: string): Promise<OHLCBars> {
    const contractDetails = (await this.getContractDetails({conId}));
    if (!contractDetails.length) {
      throw Error("Contract to found.");
    }
    try {
      return {
        bars: await this.api.getHistoricalData(
          contractDetails[0].contract, end, duration,
          <unknown>barSize as IB.BarSizeSetting, whatToShow, 1, 1)
      };
    } catch(e) {
      throw (<IBApiNextError>e).error;
    }
  }

  /** Get the accounts to which the logged user has access to. */
  get managedAccounts(): Promise<string[]> {
    return this.api.getManagedAccounts();
  }

  /** Get the account summary of the given account */
  getAccountSummary(account: string): Observable<AccountSummary> {
    return new Observable(res => {
      // initial event
      const current = this.currentAccountSummaries.get(account);
      const firstEvent: AccountSummary = {account};
      let baseCurrencySent = false;
      if (current) {
        Object.assign(firstEvent, current);
        firstEvent.baseCurrency = this.app.config.BASE_CURRENCY;
        baseCurrencySent = true;
      }
      res.next(firstEvent);

      // dispatch changes
      const sub$ = this.accountSummariesChange
        .pipe(map(v => v.find(v => v.account === account)))
        .subscribe({
          next: update => {
            const current: AccountSummary = {account};
            Object.assign(current, update);
            if (!baseCurrencySent) {
              current.baseCurrency = this.app.config.BASE_CURRENCY;
            }
            res.next(update);
          }
        });

      return (): void => sub$.unsubscribe();
    });
  }

  /** Get the account summaries of all accounts */
  get accountSummaries(): Observable<AccountSummary[]> {
    return new Observable(res => {
      const baseCurrencytSent = new Set<string>();
      const current = Array.from(this.currentAccountSummaries.values());
      current.forEach(v => {
        v.baseCurrency = this.app.config.BASE_CURRENCY;
        baseCurrencytSent.add(v.account);
      });
      res.next(current);
      const sub$ = this.accountSummariesChange.subscribe({
        next: update => {
          update.forEach(v => {
            if (!baseCurrencytSent.has(v.account)) {
              baseCurrencytSent.add(v.account);
              v.baseCurrency = this.app.config.BASE_CURRENCY;
            }
          });
          res.next(update);
        }
      });
      return (): void => sub$.unsubscribe();
    });
  }

  get positions(): Observable<PositionsUpdate> {
    return new Observable(res => {
      res.next({
        changed: Array.from(this.currentPositions.values())
      });
      const sub$ = this.positionsChange.subscribe({
        next: update => {
          res.next(update);
        }
      });
      return (): void => sub$.unsubscribe();
    });
  }

  /** Get market data updates for the given conId.*/
  getMarketData(conId: number): Observable<MarketData> {
    return new Observable<MarketData>(subscriber => {
      const cancel = new Subject();

      // lookup contract details from conId

      this.getContractDetails({conId})
        .then(details => {
          const contract = details.find(
            v => v.contract.conId === conId,
          )?.contract;
          if (!contract) {
            subscriber.error(new Error("conId not found"));
            return;
          }

          const lastSentMarketData: MarketData = {};
          let currentMarketData: MarketData = {};

          // donwstream send timer

          const sendTimer = setInterval(() => {
            const changedMarketData = DiffTools.diff(
              lastSentMarketData,
              currentMarketData,
            ).changed;

            if (changedMarketData) {
              Object.assign(currentMarketData, changedMarketData);
              Object.assign(lastSentMarketData, currentMarketData);
              subscriber.next(changedMarketData);
            }
          }, MARKET_DATA_SEND_INTERVAL_MS);

          // do not display delayed market data at all:
          this.api.setMarketDataType(IB.MarketDataType.FROZEN);

          // subscribe on market data

          const sub$ = this.api
            .getMarketData(contract, "104,105,106,165,411", false, false)
            .subscribe({
              next: update => {
                currentMarketData = Helper.marketDataTicksToModel(update.all);
              },
              error: (error: IB.IBApiNextError) => {
                this.app.error(
                  `getMarketData(${conId} / ${contract.symbol}) failed with ${error.error.message}`,
                );
                subscriber.error(new Error(error.error.message));
                clearInterval(sendTimer);
              },
            });

          // handle cancel signal

          firstValueFrom(cancel).then(() => {
            clearInterval(sendTimer);
            sub$.unsubscribe();
          });
        })
        .catch(e => {
          this.app.error(
            `getContractDetails(${conId}) failed with: ${e.message}`,
          );
          subscriber.error(e);
        });

      return (): void => {
        cancel.next(true);
        cancel.complete();
      };
    });
  }

  /** Subscribe on account summaries */
  private subscribeAccountSummaries(): void {
    subscribeUntil(
      this.shutdownSignal,
      this.api
        .getAccountSummary(
          "All",
          ACCOUNT_SUMMARY_TAGS.join(",") +
            `$LEDGER:${this.app.config.BASE_CURRENCY}`,
        ),
      {
        error: err => {
          setTimeout(() => {
            this.app.error("getAccountSummary: " + err.error.message);
            this.subscribeAccountSummaries();
          }, this.app.config.isTest ?
            IB_ERROR_RETRY_INTERVAL_TEST : IB_ERROR_RETRY_INTERVAL
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

          changed.forEach(changedSummary => {
            const currentSummary = this.currentAccountSummaries.getOrAdd(
              changedSummary.account,
              () => new AccountSummary({account: changedSummary.account}),
            );
            Object.assign(currentSummary, changedSummary);
          });

          // emit update event

          if (changed.size) {
            this.accountSummariesChange.next(Array.from(changed.values()));
          }
        },
      },
    );
  }

  /** Subscribe on account PnLs */
  private subscribeAccountPnL(): void {
    this.managedAccounts.then(managedAccount => {
      managedAccount?.forEach(accountId => {
        subscribeUntil(
          this.shutdownSignal,
          this.api.getPnL(accountId),
          {
            error: (err: IB.IBApiNextError) => {
              this.app.error(`getPnL(${accountId}): ${err.error.message}`);
              setTimeout(() => {
                this.subscribeAccountPnL();
              }, this.app.config.isTest ?
                IB_ERROR_RETRY_INTERVAL_TEST : IB_ERROR_RETRY_INTERVAL
              );
            },
            next: pnl => {
              if (
                pnl.dailyPnL !== undefined ||
                pnl.realizedPnL !== undefined ||
                pnl.unrealizedPnL !== undefined
              ) {
                const changedSummary: AccountSummary = {
                  account: accountId,
                  dailyPnL: pnl.dailyPnL,
                  realizedPnL: pnl.realizedPnL,
                  unrealizedPnL: pnl.unrealizedPnL,
                };

                const currentSummary = this.currentAccountSummaries.getOrAdd(
                  changedSummary.account,
                  () => new AccountSummary({account: changedSummary.account}),
                );
                Object.assign(currentSummary, changedSummary);

                this.accountSummariesChange.next([changedSummary]);
              }
            },
          },
        );
      });
    });
  }

  /** Subscribe on all account positions. */
  private subscribePositions(): void {
    const pnlSubscriptions = new Map<string, Subscription>();
    firstValueFrom(this.shutdownSignal).then(() => {
      pnlSubscriptions.forEach(p => p.unsubscribe());
      pnlSubscriptions.clear();
    });

    subscribeUntil(
      this.shutdownSignal,
      this.api.getPositions(), {
        error: (error: IB.IBApiNextError) => {
          pnlSubscriptions.forEach(p => p.unsubscribe());
          pnlSubscriptions.clear();
          this.app.error("getPositions(): " + error.error.message);
          setTimeout(() => {
            this.subscribePositions();
          }, this.app.config.isTest ?
            IB_ERROR_RETRY_INTERVAL_TEST : IB_ERROR_RETRY_INTERVAL
          );
        },
        next: update => {
          const changed = new MapExt<string, Position>();

          // collect updated

          const updated = new Map([
            ...(update.changed?.entries() ?? []),
            ...(update.added?.entries() ?? []),
          ]);

          const zeroSizedIds: string[] = [];

          updated.forEach((positions, accountId) => {
            positions.forEach(ibPosition => {
              const posId = Helper.formatPositionId(
                accountId,
                ibPosition.contract.conId,
              );

              if (!ibPosition.pos) {
                if (this.currentPositions.has(posId)) {
                  zeroSizedIds.push(posId);
                }
                return;
              }

              let newPosition = false;
              const prevPositions = this.currentPositions.getOrAdd(posId, () => {
                newPosition = true;
                return new Position({
                  id: posId,
                  avgCost: ibPosition.avgCost,
                  account: accountId,
                  conId: ibPosition.contract.conId,
                  pos: ibPosition.pos,
                });
              });

              const changedPos: Position = {id: posId};
              if (ibPosition.avgCost != undefined &&
                prevPositions.avgCost !== ibPosition.avgCost) {
                  changedPos.avgCost = ibPosition.avgCost;
              }
              if (ibPosition.pos != undefined &&
                prevPositions.pos !== ibPosition.pos) {
                  changedPos.pos = ibPosition.pos;
              }

              if (newPosition) {
                changed.set(posId, prevPositions);
              } else if (Object.keys(changedPos).length > 1) {
                changed.set(posId, changedPos);
              }
            });
          });

          // collect closed

          const removedIds = new Set(zeroSizedIds);
          update.removed?.forEach((positions, account) => {
            positions.forEach(pos => {
              const id = Helper.formatPositionId(account, pos.contract.conId);
              removedIds.add(id);
            });
          });

          // update

          if (changed.size || removedIds.size) {
            const closedPositions: Position[] = [];
            removedIds.forEach(id => {
              this.currentPositions.delete(id);
              closedPositions.push(new Position({id}));
            });

            this.positionsChange.next({
              changed: changed.size
                ? Array.from(changed.values())
                : undefined,
              closed: closedPositions,
            });
          }

          // subscribe on PnL

          updated.forEach((positions, accountId) => {
            positions.forEach(ibPosition => {
              if (!ibPosition.pos) {
                return;
              }

              const posId = Helper.formatPositionId(
                accountId,
                ibPosition.contract.conId,
              );

              if (pnlSubscriptions.has(posId)) {
                return;
              }

              const sub = this.api.getPnLSingle(
                  ibPosition.account,
                  "",
                  ibPosition.contract.conId ?? 0,
                )
                .pipe(takeUntil(this.shutdownSignal))
                .subscribe({
                  error: (error: IB.IBApiNextError) => {
                    pnlSubscriptions.delete(posId);
                    this.app.error(
                      `getPnLSingle(${ibPosition.contract.symbol}): ${error.error.message}`,
                    );
                  },
                  next: pnl => {
                    let prePos = this.currentPositions.get(posId);

                    if (
                      prePos &&
                      pnl.position !== undefined &&
                      !pnl.position
                    ) {
                      this.currentPositions.delete(posId);
                      this.positionsChange.next({
                        closed: [new Position({id: posId})],
                      });
                      return;
                    }

                    const changedPos: Position = {id: posId};
                    if (prePos?.account !== accountId) {
                      changedPos.account = accountId;
                    }
                    if (pnl.dailyPnL != undefined &&
                      prePos?.dailyPnL !== pnl.dailyPnL) {
                      changedPos.dailyPnL = pnl.dailyPnL;
                    }
                    if (pnl.marketValue != undefined &&
                      prePos?.marketValue !== pnl.marketValue) {
                      changedPos.marketValue = pnl.marketValue;
                    }
                    if (pnl.position != undefined &&
                      prePos?.pos !== pnl.position) {
                      changedPos.pos = pnl.position;
                    }
                    if (pnl.realizedPnL != undefined &&
                      prePos?.realizedPnL !== pnl.realizedPnL) {
                      changedPos.realizedPnL = pnl.realizedPnL;
                    }
                    if (pnl.unrealizedPnL != undefined &&
                      prePos?.unrealizedPnL !== pnl.unrealizedPnL) {
                      changedPos.unrealizedPnL = pnl.unrealizedPnL;
                    }

                    if (!prePos) {
                      prePos = {id: posId};
                      Object.assign(prePos, changedPos);
                      this.currentPositions.set(posId, prePos);
                    } else {
                      Object.assign(prePos, changedPos);
                    }

                    if (Object.keys(changedPos).length > 1) {
                      this.positionsChange.next({
                        changed: [changedPos],
                      });
                    }
                  },
                });

              pnlSubscriptions.set(posId, sub);
            });
          });

          removedIds.forEach(id => {
            pnlSubscriptions.get(id)?.unsubscribe();
          });
        }
      }
    );
  }
}
