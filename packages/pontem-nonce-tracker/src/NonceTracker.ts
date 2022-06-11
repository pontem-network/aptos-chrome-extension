import assert from 'assert';
import { Mutex } from 'async-mutex';

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const PontemQuery = require('@pontem/pontem-query');
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const BlockTracker = require('eth-block-tracker');

/**
 *  @property opts.provider - An ethereum provider
 *  @property opts.blockTracker - An instance of eth-block-tracker
 *  @property opts.getPendingTransactions - A function that returns an array of txMeta
 *  whose status is `submitted`
 *  @property opts.getConfirmedTransactions - A function that returns an array of txMeta
 *  whose status is `confirmed`
 */
export interface NonceTrackerOptions {
  provider: Record<string, unknown>;
  blockTracker: typeof BlockTracker;
  getPendingTransactions: (address: string) => Transaction[];
  getConfirmedTransactions: (address: string) => Transaction[];
}

/**
 * @property highestLocallyConfirmed - A hex string of the highest nonce on a confirmed transaction.
 * @property nextNetworkNonce - The next nonce suggested by the eth_getTransactionCount method.
 * @property highestSuggested - The maximum between the other two, the number returned.
 * @property local - Nonce details derived from pending transactions and highestSuggested
 * @property network - Nonce details from the eth_getTransactionCount method
 */
export interface NonceDetails {
  params: {
    highestLocallyConfirmed: number;
    nextNetworkNonce: number;
    highestSuggested: number;
  };
  local: HighestContinuousFrom;
  network: NetworkNextNonce;
}

/**
 * @property nextNonce - The highest of the nonce values derived based on confirmed and pending transactions and eth_getTransactionCount method
 * @property nonceDetails - details of nonce value derivation.
 * @property releaseLock
 */
export interface NonceLock {
  nextNonce: number;
  nonceDetails: NonceDetails;
  releaseLock: VoidFunction;
}

/**
 * @property name - The name for how the nonce was calculated based on the data used
 * @property nonce - The next nonce value suggested by the eth_getTransactionCount method.
 * @property blockNumber - The latest block from the network
 * @property baseCount - Transaction count from the network suggested by eth_getTransactionCount method
 */
export interface NetworkNextNonce {
  name: string;
  nonce: number;
  details: {
    blockNumber: string;
    baseCount: number;
  };
}

/**
 * @property name - The name for how the nonce was calculated based on the data used
 * @property nonce - The next suggested nonce
 * @property details{startPoint, highest} - the provided starting nonce that was used and highest derived from it (for debugging)
 */
export interface HighestContinuousFrom {
  name: string;
  nonce: number;
  details: {
    startPoint: number;
    highest: number;
  };
}

export interface Transaction {
  status: string;
  history: [Record<string, unknown>];
  txParams: {
    from: string;
    gas: string;
    value: string;
    nonce: string;
  };
}

export class NonceTracker {
  private provider: Record<string, unknown>;

  private blockTracker: typeof BlockTracker;

  private pontemQuery: typeof PontemQuery;

  private getPendingTransactions: (address: string) => Transaction[];

  private getConfirmedTransactions: (address: string) => Transaction[];

  private lockMap: Record<string, Mutex>;

  constructor(opts: NonceTrackerOptions) {
    this.provider = opts.provider;
    this.blockTracker = opts.blockTracker;
    this.pontemQuery = new PontemQuery(opts.provider);
    this.getPendingTransactions = opts.getPendingTransactions;
    this.getConfirmedTransactions = opts.getConfirmedTransactions;
    this.lockMap = {};
  }

  /**
   * @returns Promise<{ releaseLock: VoidFunction }> with the key releaseLock (the global mutex)
   */
  async getGlobalLock(): Promise<{ releaseLock: VoidFunction }> {
    const globalMutex: Mutex = this._lookupMutex('global');
    // await global mutex free
    const releaseLock: VoidFunction = await globalMutex.acquire();
    return { releaseLock };
  }

  /**
   * this will return an object with the `nextNonce` `nonceDetails`, and the releaseLock
   * Note: releaseLock must be called after adding a signed tx to pending transactions (or discarding).
   *
   * @param address the hex string for the address whose nonce we are calculating
   * @returns {Promise<NonceLock>}
   */
  async getNonceLock(address: string): Promise<NonceLock> {
    // await global mutex free
    await this._globalMutexFree();
    // await lock free, then take lock
    const releaseLock: VoidFunction = await this._takeMutex(address);
    try {
      // evaluate multiple nextNonce strategies
      const networkNonceResult: NetworkNextNonce =
        await this._getNetworkNextNonce(address);
      const highestLocallyConfirmed: number =
        this._getHighestLocallyConfirmed(address);
      const nextNetworkNonce: number = networkNonceResult.nonce;
      const highestSuggested: number = Math.max(
        nextNetworkNonce,
        highestLocallyConfirmed,
      );

      const pendingTxs: Transaction[] = this.getPendingTransactions(address);
      const localNonceResult: HighestContinuousFrom =
        this._getHighestContinuousFrom(pendingTxs, highestSuggested);

      const nonceDetails: NonceDetails = {
        params: {
          highestLocallyConfirmed,
          nextNetworkNonce,
          highestSuggested,
        },
        local: localNonceResult,
        network: networkNonceResult,
      };

      // const nextNonce: number = Math.max(
      //   networkNonceResult.nonce,
      //   localNonceResult.nonce,
      // );
      const nextNonce: number = networkNonceResult.nonce;

      assert(
        Number.isInteger(nextNonce),
        `nonce-tracker - nextNonce is not an integer - got: (${typeof nextNonce}) "${nextNonce}"`,
      );

      // return nonce and release cb
      return { nextNonce, nonceDetails, releaseLock };
    } catch (err) {
      // release lock if we encounter an error
      releaseLock();
      throw err;
    }
  }

  async _globalMutexFree(): Promise<void> {
    const globalMutex: Mutex = this._lookupMutex('global');
    const releaseLock: VoidFunction = await globalMutex.acquire();
    releaseLock();
  }

  async _takeMutex(lockId: string): Promise<VoidFunction> {
    const mutex: Mutex = this._lookupMutex(lockId);
    const releaseLock: VoidFunction = await mutex.acquire();
    return releaseLock;
  }

  _lookupMutex(lockId: string): Mutex {
    let mutex: Mutex = this.lockMap[lockId];
    if (!mutex) {
      mutex = new Mutex();
      this.lockMap[lockId] = mutex;
    }
    return mutex;
  }

  /**
   * Function returns the nonce details from teh network based on the latest block
   * and eth_getTransactionCount method
   *
   * @param address the hex string for the address whose nonce we are calculating
   * @returns {Promise<NetworkNextNonce>}
   */
  async _getNetworkNextNonce(address: string): Promise<NetworkNextNonce> {
    // calculate next nonce
    // we need to make sure our base count
    // and pending count are from the same block
    const blockNumber: string = await this.blockTracker.getLatestBlock();
    const account: { sequence_number: string } = await (new Promise((resolve, reject) => {
      this.pontemQuery.getAccount(address, (err: any, result: any) => {
        if(err) {
          // if error - set nonce is 0
          resolve({
            sequence_number: '0',
          })
          return;
        }

        resolve(result)
      })
    }))

    const baseCount: number = +account.sequence_number;
    assert(
      Number.isInteger(baseCount),
      `nonce-tracker - baseCount is not an integer - got: (${typeof baseCount}) "${baseCount}"`,
    );
    return {
      name: 'network',
      nonce: baseCount,
      details: { blockNumber, baseCount },
    };
  }

  /**
   * Function returns the highest of the confirmed transaction from the address.
   * @param address the hex string for the address whose nonce we are calculating
   */
  _getHighestLocallyConfirmed(address: string): number {
    const confirmedTransactions: Transaction[] =
      this.getConfirmedTransactions(address);
    const highest: number = this._getHighestNonce(confirmedTransactions);
    return Number.isInteger(highest) ? highest + 1 : 0;
  }

  /**
   * Function returns highest nonce value from the transcation list provided
   * @param txList list of transactions
   */
  _getHighestNonce(txList: Transaction[]): number {
    const nonces: number[] = txList.map((txMeta) => {
      const { nonce } = txMeta.txParams;
      assert(typeof nonce === 'string', 'nonces should be hex strings');
      return parseInt(nonce, 16);
    });
    const highestNonce: number = Math.max.apply(null, nonces);
    return highestNonce;
  }

  /**
   * Function return the nonce value higher than the highest nonce value from the transaction list
   * starting from startPoint
   * @param txList {array} - list of txMeta's
   * @param startPoint {number} - the highest known locally confirmed nonce
   */
  _getHighestContinuousFrom(
    txList: Transaction[],
    startPoint: number,
  ): HighestContinuousFrom {
    const nonces: number[] = txList.map((txMeta) => {
      const { nonce } = txMeta.txParams;
      assert(typeof nonce === 'string', 'nonces should be hex strings');
      return parseInt(nonce, 16);
    });

    let highest: number = startPoint;
    while (nonces.includes(highest)) {
      highest += 1;
    }

    return { name: 'local', nonce: highest, details: { startPoint, highest } };
  }
}
