import * as IB from "@stoqey/ib";
import {
  DiffTools,
  inject,
  MapExt,
  service,
  subscribeUntil
} from "@waytrade/microservice-core";
import LruCache from "lru-cache";
import {
  delay,
  firstValueFrom, Observable,
  retryWhen,
  Subject,
  Subscription,
  takeUntil,
  tap
} from "rxjs";
import {IBApiApp} from "../app";
import {AccountSummary} from "../models/account-summary.model";
import {MarketData} from "../models/market-data.model";
import {PnL} from "../models/pnl.model";
import {Position} from "../models/position.model";
import {IBApiServiceHelper as Helper} from "../utils/ib.helper";

/**
 * Send interval on market data ticks in milliseconds.
 * TWS sends market data value changes one-by-one which can cause a lot of
 * overhead donwstream. Use this setting to reduce update frequency.
 */
const MARKET_DATA_SEND_INTERVAL_MS = 10;

/**
 * Account summary tag values, make suer this is in sync with
 * AccountSummary model.
 *
 * Ecented AccountSummary model if you extend this!!
 */
export const ACCOUNT_SUMMARY_TAGS = [
  "AccountType",
  "NetLiquidation",
  "TotalCashValue",
  "SettledCash",
  "AccruedCash",
  "BuyingPower",
  "EquityWithLoanValue",
  "PreviousEquityWithLoanValue",
  "GrossPositionValue",
  "RegTEquity",
  "RegTMargin",
  "InitMarginReq",
  "SMA",
  "InitMarginReq",
  "MaintMarginReq",
  "AvailableFunds",
  "ExcessLiquidity",
  "Cushion",
  "FullInitMarginReq",
  "FullMaintMarginReq",
  "FullAvailableFunds",
  "FullExcessLiquidity",
  "LookAheadNextChange",
  "LookAheadInitMarginReq",
  "LookAheadMaintMarginReq",
  "LookAheadAvailableFunds",
  "LookAheadExcessLiquidity",
  "HighestSeverity",
  "DayTradesRemaining",
  "Leverage",
];

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

  /** The [[IBApiNext]] instance. */
  private api!: IB.IBApiNext;

  /** Cache of a requested contract details, with conId as key. */
  private readonly contractDetailsCache = new LruCache<
    number,
    IB.ContractDetails[]
  >({
    max: 128,
  });

  /** Start the service. */
  start(): void {
    this.api = this.app.ibApi;
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

    const details = await this.api?.getContractDetails(contract);
    if (contract.conId && details.length) {
      this.contractDetailsCache.set(contract.conId, details);
    }

    return details;
  }

  /** Get the accounts to which the logged user has access to. */
  getManagedAccounts(): Promise<string[]> {
    return this.api.getManagedAccounts();
  }

  /** Get real time daily PnL and unrealized PnL updates. */
  getPnL(account: string): Observable<PnL> {
    return this.api.getPnL(account) as Observable<PnL>;
  }

  /** Observe the account summaries. */
  get accountSummaries(): Observable<AccountSummary[]> {
    return new Observable<AccountSummary[]>(res => {
      let accountSummaryTags = "";
      ACCOUNT_SUMMARY_TAGS.forEach(tag => {
        accountSummaryTags = accountSummaryTags + tag + ",";
      });
      accountSummaryTags += `$LEDGER:${this.app.config.BASE_CURRENCY}`;

      const cancel = new Subject<boolean>();
      const firstEventSend = new Set<string>();

      subscribeUntil(
        cancel,
        this.api.getAccountSummary("All", accountSummaryTags),
        {
          error: (error: IB.IBApiNextError) => {
            this.app.error("getAccountSummary: " + error.error.message);
            res.error(new Error(error.error.message));
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

              // add baseCurrency to first event
              if (!firstEventSend.has(accountId)) {
                changed.forEach(
                  v => (v.baseCurrency = this.app.config.BASE_CURRENCY),
                );
                firstEventSend.add(accountId);
              }
            });

            // emit update event

            if (changed.size) {
              res.next(Array.from(changed.values()));
            }
          },
          complete: () => {
            res.complete();
          },
        },
      );

      this.getManagedAccounts().then(managedAccount => {
        managedAccount?.forEach(accountId => {
          subscribeUntil(
            cancel,
            this.api
              .getPnL(accountId)
              // retry once a minute on error
              .pipe(
                retryWhen(errors =>
                  errors.pipe(
                    tap(err => {
                      this.app.error(`${err.error.message}`);
                    }),
                    // re-try in 10min maybe IB has recovered
                    delay(10000),
                  ),
                ),
              ),
            {
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
                  res.next([changedSummary]);
                }
              },
            },
          );
        });
      });

      return (): void => {
        cancel.next(true);
        cancel.complete();
      };
    });
  }

  /** Observe the inventory positions. */
  get positions(): Observable<PositionsUpdate> {
    return new Observable<PositionsUpdate>(res => {
      const cancel = new Subject();

      const pnlSubscriptions = new Map<string, Subscription>();
      const previosPositions = new MapExt<string, Position>();

      this.api
        ?.getPositions()
        .pipe(takeUntil(cancel))
        .subscribe({
          error: (error: IB.IBApiNextError) => {
            this.app.error("getPositions(): " + error.error.message);
            res.error(new Error("getPositions(): " + error.error.message));
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
                  if (previosPositions.has(posId)) {
                    zeroSizedIds.push(posId);
                  }
                  return;
                }

                let newPosition = false;
                const prevPositions = previosPositions.getOrAdd(posId, () => {
                  newPosition = true;
                  return new Position({
                    id: posId,
                    avgCost: ibPosition.avgCost,
                    account: accountId,
                    conId: ibPosition.contract.conId,
                    pos: ibPosition.pos,
                  });
                });

                const changedPos: Position = {
                  id: posId,
                  avgCost:
                    prevPositions.avgCost !== ibPosition.avgCost
                      ? ibPosition.avgCost
                      : undefined,
                  pos:
                    prevPositions.pos !== ibPosition.pos
                      ? ibPosition.pos
                      : undefined,
                };

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

            // emit update event

            if (changed.size || removedIds.size) {
              const closedPositions: Position[] = [];
              removedIds.forEach(id => {
                previosPositions.delete(id);
                closedPositions.push(new Position({id}));
              });

              res.next({
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
                      let prePos = previosPositions.get(posId);

                      if (
                        prePos &&
                        pnl.position !== undefined &&
                        !pnl.position
                      ) {
                        previosPositions.delete(posId);
                        res.next({
                          closed: [new Position({id: posId})],
                        });
                        return;
                      }

                      const changedPos: Position = {id: posId};
                      if (prePos?.account !== accountId) {
                        changedPos.account = accountId;
                      }
                      if (prePos?.dailyPnL !== pnl.dailyPnL) {
                        changedPos.dailyPnL = pnl.dailyPnL;
                      }
                      if (prePos?.marketValue !== pnl.marketValue) {
                        changedPos.marketValue = pnl.marketValue;
                      }
                      if (prePos?.pos !== pnl.position) {
                        changedPos.pos = pnl.position;
                      }
                      if (prePos?.realizedPnL !== pnl.realizedPnL) {
                        changedPos.realizedPnL = pnl.realizedPnL;
                      }
                      if (prePos?.unrealizedPnL !== pnl.unrealizedPnL) {
                        changedPos.unrealizedPnL = pnl.unrealizedPnL;
                      }

                      if (!prePos) {
                        prePos = {
                          id: posId,
                        };
                        Object.assign(prePos, changedPos);
                        previosPositions.set(posId, prePos);
                      } else {
                        Object.assign(prePos, changedPos);
                      }

                      if (Object.keys(changedPos).length > 1) {
                        res.next({
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
          },
        });

      return (): void => {
        cancel.next(true);
        cancel.complete();
      };
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
            `getContractDetails(${conId}) failed with: ${e.error.message}`,
          );
          subscriber.error(new Error(e.error.message));
        });

      return (): void => {
        cancel.next(true);
        cancel.complete();
      };
    });
  }
}
