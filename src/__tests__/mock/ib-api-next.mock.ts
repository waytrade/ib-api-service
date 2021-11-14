import {
  AccountPositionsUpdate,
  AccountSummariesUpdate,
  ConnectionState,
  Contract,
  ContractDetails,
  ContractDetailsUpdate,
  IBApiNextCreationOptions,
  Logger,
  MarketDataType,
  MarketDataUpdate,
  PnL,
  PnLSingle,
} from "@stoqey/ib";
import {BehaviorSubject, Observable, ReplaySubject, Subject} from "rxjs";

/**
 * Mock implementation for @stoqey/ib's IBApiNext that will
 * return pre-configurd values.
 *
 * It is used by testing code to avoid the need of having a read IB account
 * and connection TWS for running the test codes.
 */
export class IBApiNextMock {
  constructor(private options?: IBApiNextCreationOptions) {}

  get logger(): Logger | undefined {
    return this.options?.logger;
  }

  private _connectionState = new BehaviorSubject<ConnectionState>(
    ConnectionState.Disconnected,
  );

  get connectionState(): Observable<ConnectionState> {
    return this._connectionState;
  }

  connect(clientId?: number): IBApiNextMock {
    this._connectionState.next(ConnectionState.Connecting);
    this._connectionState.next(ConnectionState.Connected);
    return this;
  }

  disconnect(): IBApiNextMock {
    if (this._connectionState.value !== ConnectionState.Disconnected) {
      this._connectionState.next(ConnectionState.Disconnected);
    }
    return this;
  }

  readonly contractDb = new Map<number, ContractDetails>();
  readonly getContractDetailsCalled = new Subject<Contract>();

  getContractDetails(contract: Contract): Observable<ContractDetailsUpdate> {
    return new Observable<ContractDetailsUpdate>(sub => {
      this.getContractDetailsCalled.next(contract);
      const details = this.contractDb.get(contract.conId ?? 0);
      const update: ContractDetailsUpdate = {
        all: [],
      };
      if (details) {
        update.all.push(details);
        update.added?.push(details);
      }
      sub.next(update);
      sub.complete();
    });
  }

  readonly managedAccounts = new Set<string>();

  async getManagedAccounts(): Promise<string[]> {
    return Array.from(this.managedAccounts);
  }

  readonly accountSummaryUpdate = new ReplaySubject<AccountSummariesUpdate>(1);

  getAccountSummary(
    group: string,
    tags: string,
  ): Observable<AccountSummariesUpdate> {
    return this.accountSummaryUpdate;
  }

  readonly currentPnL = new BehaviorSubject<PnL>({});

  getPnL(account: string, model?: string): Observable<PnL> {
    return new Observable<PnL>(res => {
      this.currentPnL.subscribe({
        next: v => res.next(v),
      });
    });
  }

  readonly currentPositionsUpdate = new ReplaySubject<AccountPositionsUpdate>(
    1,
  );

  getPositions(): Observable<AccountPositionsUpdate> {
    return this.currentPositionsUpdate;
  }

  readonly currentPnLSingle = new ReplaySubject<PnLSingle>(1);

  getPnLSingle(
    account: string,
    modelCode: string,
    conId: number,
  ): Observable<PnLSingle> {
    return this.currentPnLSingle;
  }

  readonly setMarketDataTypeCalled = new ReplaySubject<MarketDataType>(1);

  setMarketDataType(type: MarketDataType): void {
    this.setMarketDataTypeCalled.next(type);
  }

  readonly marketDataUpdate = new ReplaySubject<MarketDataUpdate>(1);

  getMarketData(
    contract: Contract,
    genericTickList: string,
    snapshot: boolean,
    regulatorySnapshot: boolean,
  ): Observable<MarketDataUpdate> {
    return this.marketDataUpdate;
  }
}
