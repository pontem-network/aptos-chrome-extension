const extend = require('xtend')
const createRandomId = require('json-rpc-random-id')()

module.exports = PontemQuery

function PontemQuery(provider) {
  const self = this
  self.currentProvider = provider
}

//
// base queries
//

// Aptos
PontemQuery.prototype.getTransactions = generateFnFor('transactions', 'get')
PontemQuery.prototype.submitTransaction = generateFnFor('transactions', 'post', ['data'])
PontemQuery.prototype.getTransaction = generateFnFor('transactions/:tx', 'get', ['tx'])
PontemQuery.prototype.createSignMessage = generateFnFor('transactions/signing_message', 'post', ['data'])
PontemQuery.prototype.getAccountTransactions = generateFnFor('accounts/:address/transactions', 'get', ['address'])
PontemQuery.prototype.getAccount = generateFnFor('accounts/:address', 'get', ['address'])
PontemQuery.prototype.getAccountResources = generateFnFor('accounts/:address/resources', 'get', ['address'])
PontemQuery.prototype.getAccountResource = generateFnFor('accounts/:address/resource/:resource', 'get', ['address', 'resource'])
PontemQuery.prototype.getAccountModules = generateFnFor('accounts/:address/modules', 'get', ['address'])
PontemQuery.prototype.requestTokensFromFaucet = generateFnFor('faucet/mint', 'post', ['publicKey'])

// Eth capability
// default block
PontemQuery.prototype.getBalance =                          legacyGenerateFnWithDefaultBlockFor(2, 'eth_getBalance')
PontemQuery.prototype.getCode =                             legacyGenerateFnWithDefaultBlockFor(2, 'eth_getCode')
PontemQuery.prototype.getTransactionCount =                 legacyGenerateFnWithDefaultBlockFor(2, 'eth_getTransactionCount')
PontemQuery.prototype.getStorageAt =                        legacyGenerateFnWithDefaultBlockFor(3, 'eth_getStorageAt')
PontemQuery.prototype.call =                                legacyGenerateFnWithDefaultBlockFor(2, 'eth_call')
// standard
PontemQuery.prototype.protocolVersion =                     legacyGenerateFnFor('eth_protocolVersion')
PontemQuery.prototype.syncing =                             legacyGenerateFnFor('eth_syncing')
PontemQuery.prototype.coinbase =                            legacyGenerateFnFor('eth_coinbase')
PontemQuery.prototype.mining =                              legacyGenerateFnFor('eth_mining')
PontemQuery.prototype.hashrate =                            legacyGenerateFnFor('eth_hashrate')
PontemQuery.prototype.gasPrice =                            legacyGenerateFnFor('eth_gasPrice')
PontemQuery.prototype.accounts =                            legacyGenerateFnFor('eth_accounts')
PontemQuery.prototype.blockNumber =                         legacyGenerateFnFor('eth_blockNumber')
PontemQuery.prototype.getBlockTransactionCountByHash =      legacyGenerateFnFor('eth_getBlockTransactionCountByHash')
PontemQuery.prototype.getBlockTransactionCountByNumber =    legacyGenerateFnFor('eth_getBlockTransactionCountByNumber')
PontemQuery.prototype.getUncleCountByBlockHash =            legacyGenerateFnFor('eth_getUncleCountByBlockHash')
PontemQuery.prototype.getUncleCountByBlockNumber =          legacyGenerateFnFor('eth_getUncleCountByBlockNumber')
PontemQuery.prototype.sign =                                legacyGenerateFnFor('eth_sign')
PontemQuery.prototype.sendTransaction =                     legacyGenerateFnFor('eth_sendTransaction')
PontemQuery.prototype.sendRawTransaction =                  legacyGenerateFnFor('eth_sendRawTransaction')
PontemQuery.prototype.estimateGas =                         legacyGenerateFnFor('eth_estimateGas')
PontemQuery.prototype.getBlockByHash =                      legacyGenerateFnFor('eth_getBlockByHash')
PontemQuery.prototype.getBlockByNumber =                    legacyGenerateFnFor('eth_getBlockByNumber')
PontemQuery.prototype.getTransactionByHash =                legacyGenerateFnFor('eth_getTransactionByHash')
PontemQuery.prototype.getTransactionByBlockHashAndIndex =   legacyGenerateFnFor('eth_getTransactionByBlockHashAndIndex')
PontemQuery.prototype.getTransactionByBlockNumberAndIndex = legacyGenerateFnFor('eth_getTransactionByBlockNumberAndIndex')
PontemQuery.prototype.getTransactionReceipt =               legacyGenerateFnFor('eth_getTransactionReceipt')
PontemQuery.prototype.getUncleByBlockHashAndIndex =         legacyGenerateFnFor('eth_getUncleByBlockHashAndIndex')
PontemQuery.prototype.getUncleByBlockNumberAndIndex =       legacyGenerateFnFor('eth_getUncleByBlockNumberAndIndex')
PontemQuery.prototype.getCompilers =                        legacyGenerateFnFor('eth_getCompilers')
PontemQuery.prototype.compileLLL =                          legacyGenerateFnFor('eth_compileLLL')
PontemQuery.prototype.compileSolidity =                     legacyGenerateFnFor('eth_compileSolidity')
PontemQuery.prototype.compileSerpent =                      legacyGenerateFnFor('eth_compileSerpent')
PontemQuery.prototype.newFilter =                           legacyGenerateFnFor('eth_newFilter')
PontemQuery.prototype.newBlockFilter =                      legacyGenerateFnFor('eth_newBlockFilter')
PontemQuery.prototype.newPendingTransactionFilter =         legacyGenerateFnFor('eth_newPendingTransactionFilter')
PontemQuery.prototype.uninstallFilter =                     legacyGenerateFnFor('eth_uninstallFilter')
PontemQuery.prototype.getFilterChanges =                    legacyGenerateFnFor('eth_getFilterChanges')
PontemQuery.prototype.getFilterLogs =                       legacyGenerateFnFor('eth_getFilterLogs')
PontemQuery.prototype.getLogs =                             legacyGenerateFnFor('eth_getLogs')
PontemQuery.prototype.getWork =                             legacyGenerateFnFor('eth_getWork')
PontemQuery.prototype.submitWork =                          legacyGenerateFnFor('eth_submitWork')
PontemQuery.prototype.submitHashrate =                      legacyGenerateFnFor('eth_submitHashrate')

// network level

PontemQuery.prototype.sendAsync = function (opts, cb) {
  const self = this
  const payload = createPayload(opts);
  const isEthRequest = payload.method.startsWith('eth_')

  self.currentProvider.sendAsync(createPayload(opts, isEthRequest), function (err, response) {
    if (cb && typeof cb === 'function') {
      if (!err && response.error) err = new Error('PontemQuery - RPC Error - ' + response.error.message)
      if (err) return cb(err)
      cb(null, response.result)
    }
  })
}

// util
function generateFnFor(methodName, httpMethodType = 'get', argsMapping = []) {
  return function () {
    const self = this
    let args = [].slice.call(arguments)
    let cb = args.pop()
    let method = methodName;

    const templatedArgs = methodName.matchAll(/:([A-z0-9_-]+)(\/)?/gi)

    const namedArgs = argsMapping.reduce((acc, c, i) => {
      acc[c] = args[i] || undefined;
      return acc;
    }, {})

    for(const param of templatedArgs) {
      method = method.replace(`:${param[1]}`, namedArgs[param[1]]);
      delete namedArgs[param[1]];
    }

    self.sendAsync({
      httpMethod: httpMethodType,
      method,
      params: namedArgs,
    }, cb)
  }
}

function generateFnWithDefaultBlockFor(argCount, methodName){
  return function(){
    const self = this
    var args = [].slice.call(arguments)
    var cb = args.pop()
    // set optional default block param
    if (args.length < argCount) args.push('latest')
    self.sendAsync({
      method: methodName,
      params: args,
    }, cb)
  }
}

function legacyGenerateFnWithDefaultBlockFor(argCount, methodName){
  return function(){
    const self = this
    var args = [].slice.call(arguments)
    var cb = args.pop()
    // set optional default block param
    if (args.length < argCount) args.push('latest')
    self.sendAsync({
      method: methodName,
      params: args,
    }, () => {
      console.log('[Pontem] Legacy response for request to Ethereum chain');
      cb(undefined, {})
    })
  }
}

function legacyGenerateFnFor(methodName) {
  return function () {
    const self = this
    var args = [].slice.call(arguments)
    var cb = args.pop()

    try {
      throw Error('[Pontem] for stacktrace')
    } catch (e) {
      console.log(e);
    }

    console.trace();

    self.sendAsync({
      method: methodName,
      params: args,
    }, () => {
      console.log('[Pontem] Legacy response for request to Ethereum chain');
      cb(undefined, {})
    })
  }
}

function createPayload(data, isEthRequest = false) {
  const extendable = {
    // defaults
    id: createRandomId(),
    httpMethod: 'get',
    jsonrpc: '2.0',
    params: [],
    // user-specified
  }

  if(isEthRequest) {
    delete extendable.httpMethod
  }

  return extend(extendable, data)
}
