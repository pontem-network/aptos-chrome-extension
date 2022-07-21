const createAsyncMiddleware = require('json-rpc-engine/src/createAsyncMiddleware');
const { ethErrors } = require('eth-rpc-errors');
const fetch = require('node-fetch');

const RETRIABLE_ERRORS = [
  // ignore server overload errors
  'Gateway timeout',
  'ETIMEDOUT',
  'ECONNRESET',
  // ignore server sent html error pages
  // or truncated json responses
  'SyntaxError',
];

module.exports = createFetchMiddleware;
module.exports.fetchConfigFromReq = fetchConfigFromReq;

function createFetchMiddleware(opts = {}) {
  const maxAttempts = opts.maxAttempts || 5;
  const { rpcUrl, headers = {} } = opts;

  // validate options
  if (!rpcUrl || typeof rpcUrl !== 'string') {
    throw new Error(`Invalid value for 'rpcUrl': "${rpcUrl}"`);
  }
  if (!headers || typeof headers !== 'object') {
    throw new Error(`Invalid value for 'headers': "${headers}"`);
  }
  if (!maxAttempts) {
    throw new Error(
      `Invalid value for 'maxAttempts': "${maxAttempts}" (${typeof maxAttempts})`,
    );
  }

  return createAsyncMiddleware(async (req, res) => {
    // retry MAX_ATTEMPTS times, if error matches filter
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // attempt request
        await performFetch(rpcUrl, headers, req, res);
        // request was successful
        break;
      } catch (err) {
        // an error was caught while performing the request
        // if not retriable, resolve with the encountered error
        if (!isRetriableError(err)) {
          // abort with error
          throw err;
        }
        // if no more attempts remaining, throw an error
        const remainingAttempts = maxAttempts - attempt;
        if (!remainingAttempts) {
          const errMsg = `RestProvider - cannot complete request. All retries exhausted.\nOriginal Error:\n${err.toString()}\n\n`;
          throw new Error(errMsg);
        }
        // otherwise, ignore error and retry again after timeout
        await timeout(1000);
      }
    }
    // request was handled correctly, end
  });
}

function timeout(length) {
  return new Promise((resolve) => {
    setTimeout(resolve, length);
  });
}

function isRetriableError(err) {
  const errMessage = err.toString();
  return RETRIABLE_ERRORS.some((phrase) => errMessage.includes(phrase));
}

async function performFetch(rpcUrl, extraHeaders, req, res) {
  // Check for ETH request
  if (req.method.startsWith('eth_')) {
    console.log(
      `[Pontem] Intercept ETH request "${req.method}". Sending mock success result.`,
    );
    res.result = {};
    return;
  }

  const { fetchUrl, fetchParams } = fetchConfigFromReq({
    rpcUrl,
    extraHeaders,
    req,
  });

  const response = await fetch(fetchUrl, fetchParams);
  const rawData = await response.text();
  // handle errors
  if (!response.ok) {
    switch (response.status) {
      case 404: {
        res.result = null;
        return;
      }
      case 405:
        throw ethErrors.rpc.methodNotFound();

      case 429:
        throw createRatelimitError();

      case 503:
      case 504:
        throw createTimeoutError();

      default:
        throw createInternalError(rawData);
    }
  }

  // special case for now
  if (req.method === 'eth_getBlockByNumber' && rawData === 'Not Found') {
    res.result = null;
    return;
  }

  // parse JSON
  const data = JSON.parse(rawData);
  // finally return result
  res.result = data;
  res.error = data.error;
}

function fetchConfigFromReq({ rpcUrl, extraHeaders, req }) {
  const parsedUrl = new URL(rpcUrl);
  const normalizedUrl = normalizeUrlFromParsed(parsedUrl);

  // console.log('[Pontem] fetchConfigFromReq', { rpcUrl, extraHeaders, req });
  const headers = {
    ...extraHeaders,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  const httpMethod = req.httpMethod ? req.httpMethod.toUpperCase() : 'GET';
  // let fetchUrl = `https://fullnode.devnet.aptoslabs.com/${req.method}`
  let fetchUrl = `${normalizedUrl}${req.method}`;
  const fetchParams = {
    method: httpMethod,
    headers,
  };

  if (['POST'].includes(httpMethod)) {
    fetchParams.body = JSON.stringify(req.params.data);
  }

  if (req.method === 'faucet/mint') {
    fetchUrl = `https://faucet.devnet.aptoslabs.com/mint?amount=10000000&pub_key=${req.params.publicKey}`;
    // fetchUrl = `http://167.172.156.30:8000/mint?amount=10000000&pub_key=${req.params.publicKey}`;
    fetchParams.body = undefined;
  }

  return {
    fetchUrl,
    fetchParams,
  };
}

// strips out extra keys that could be rejected by strict nodes like parity
function normalizeReq(req) {
  return {
    id: req.id,
    jsonrpc: req.jsonrpc,
    method: req.method,
    params: req.params,
  };
}

function normalizeUrlFromParsed(parsedUrl) {
  let result = '';
  result += parsedUrl.protocol;
  result += `//${parsedUrl.hostname}`;
  if (parsedUrl.port) {
    result += `:${parsedUrl.port}`;
  }
  result += `${parsedUrl.pathname}`;
  result += `${parsedUrl.search}`;
  return result;
}

function createRatelimitError() {
  const msg = `Request is being rate limited.`;
  return createInternalError(msg);
}

function createTimeoutError() {
  let msg = `Gateway timeout. The request took too long to process. `;
  msg += `This can happen when querying logs over too wide a block range.`;
  return createInternalError(msg);
}

function createInternalError(msg) {
  return ethErrors.rpc.internal(msg);
}
