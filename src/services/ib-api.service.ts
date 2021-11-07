import * as IB from "@stoqey/ib";
import {inject, MapExt, service} from "@waytrade/microservice-core";
import LruCache from "lru-cache";
import {
  lastValueFrom,
  Observable,
  Subject,
  Subscription,
  takeUntil,
} from "rxjs";
import {IBApiApp} from "../app";
import {AccountSummary} from "../models/account-summary.model";
import {PnL} from "../models/pnl.model";
import {Position, PositionsUpdate} from "../models/position.model";
import {IBApiServiceHelper as Helper} from "./ib-api.service.helper";

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

    const details = await lastValueFrom(
      this.api?.getContractDetails(contract),
      {
        defaultValue: {all: []} as IB.ContractDetailsUpdate,
      },
    );

    if (contract.conId && details.all.length) {
      this.contractDetailsCache.set(contract.conId, details.all);
    }

    return details.all;
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
          complete: () => {
            res.complete();
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
      const previosPositions = new MapExt<string, Position>();

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

                let hasChanged = false;
                const prevPositions = previosPositions.getOrAdd(posId, () => {
                  hasChanged = true;
                  return new Position({
                    id: posId,
                    account: accountId,
                    conId: ibPosition.contract.conId,
                    pos: ibPosition.pos,
                  });
                });

                if (prevPositions.avgCost !== ibPosition.avgCost) {
                  prevPositions.avgCost = ibPosition.avgCost;
                  hasChanged = true;
                }

                if (hasChanged) {
                  changed.set(posId, prevPositions);
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

            removedIds.forEach(id => {
              previosPositions.delete(id);
            });

            // emit update event

            if (changed.size || removedIds.size) {
              res.next({
                changed: changed.size
                  ? Array.from(changed.values())
                  : undefined,
                closed: removedIds.size ? Array.from(removedIds) : undefined,
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

                      if (pnl.position !== undefined && !pnl.position) {
                        previosPositions.delete(posId);
                        res.next({
                          closed: [posId],
                        });
                        return;
                      }

                      const changedPos: Position = {id: posId};
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

  /** Get market data updates for the given conId.
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
  }*/
}
