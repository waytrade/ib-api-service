import {
  AccountPositionsUpdate,
  AccountSummariesUpdate, Bar, BarSizeSetting,
  ConnectionState,
  Contract,
  ContractDescription,
  ContractDetails, IBApiNextCreationOptions,
  IBApiNextError,
  Logger,
  MarketDataType,
  MarketDataUpdate,
  PnL,
  PnLSingle
} from "@stoqey/ib";
import {BehaviorSubject, firstValueFrom, Observable, ReplaySubject, Subject} from "rxjs";

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

  readonly searchContractsResult = new ReplaySubject<ContractDescription[]>(1);
  searchContractssError?: IBApiNextError;

  searchContracts(pattern: string): Promise<ContractDescription[]> {
    if (this.searchContractssError) {
      throw this.searchContractssError
    }
    return firstValueFrom(this.searchContractsResult);
  }

  readonly contractDb = new Map<number, ContractDetails>();
  readonly getContractDetailsCalled = new Subject<Contract>();
  getContractDetailsError?: IBApiNextError;

  async getContractDetails(contract: Contract): Promise<ContractDetails[]> {
    if (this.getContractDetailsError) {
      throw this.getContractDetailsError
    }

    this.getContractDetailsCalled.next(contract);
    const details = this.contractDb.get(contract.conId ?? 0);
    return details ? [details] : [];
  }

  readonly managedAccounts = new Set<string>();

  async getManagedAccounts(): Promise<string[]> {
    return Array.from(this.managedAccounts);
  }

  accountSummaryUpdate = new ReplaySubject<AccountSummariesUpdate>(1);

  getAccountSummary(
    group: string,
    tags: string,
  ): Observable<AccountSummariesUpdate> {
    return this.accountSummaryUpdate;
  }

  currentPnL = new BehaviorSubject<PnL>({});

  getPnL(account: string, model?: string): Observable<PnL> {
    return this.currentPnL;
  }

  currentPositionsUpdate = new ReplaySubject<AccountPositionsUpdate>(1);

  getPositions(): Observable<AccountPositionsUpdate> {
    return this.currentPositionsUpdate;
  }

  currentPnLSingle = new Map<number, Subject<PnLSingle>>();

  getPnLSingle(
    account: string,
    modelCode: string,
    conId: number,
  ): Observable<PnLSingle> {
    return this.currentPnLSingle.get(conId) ?? new ReplaySubject<PnLSingle>(1)
  }

  readonly setMarketDataTypeCalled = new ReplaySubject<MarketDataType>(1);

  setMarketDataType(type: MarketDataType): void {
    this.setMarketDataTypeCalled.next(type);
  }

  marketDataUpdate = new ReplaySubject<MarketDataUpdate>(1);

  getMarketData(
    contract: Contract,
    genericTickList: string,
    snapshot: boolean,
    regulatorySnapshot: boolean,
  ): Observable<MarketDataUpdate> {
    return this.marketDataUpdate;
  }

  readonly historicalData = new Map<number, Bar[]>()

  async getHistoricalData(
    contract: Contract,
    endDateTime: string | undefined,
    durationStr: string,
    barSizeSetting: BarSizeSetting,
    whatToShow: string,
    useRTH: number,
    formatDate: number
  ): Promise<Bar[]> {
    const res = this.historicalData.get(contract.conId??0)
    if (!res) {
      throw {
        error: new Error("conId not found")
      }
    }
    return res;
  }
}
