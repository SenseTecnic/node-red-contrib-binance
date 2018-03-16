# node-red-contrib-binance

A Node-RED node wrapper to make API calls to the Binance exchange. The back-end node library used to communicate with the Binance exchange is one of the winner of the Binance API Competition (https://support.binance.com/hc/en-us/articles/115002103732-First-Winner-of-Binance-API-Competition).

https://github.com/binance-exchange/node-binance-api
https://www.npmjs.com/package/node-binance-api

## Supported Functions

Nodes supported are a subset of the available functions in the API

### getPrice

Getting latest price of a symbol.

Input:

- tickerPair - *required*

Output:

- current price


### getAllPrices

Getting latest price of all symbols.

Input:

- none

Output:

- {object} map of all available ticker pair and their current prices

### getBookTicker

Getting bid/ask prices for a symbol.

Input:

- tickerPair - *required*

Output:

- {object} info on latest book price

### getDayStats

Get 24hr ticker price change statistics for a symbol.

Input:

- tickerPair - *required*

Output:

- {object} info latest 24 hour stats

### getCandlesticks

Get Kline/candlestick data for a symbol.

Input:

- tickerPair - *required*
- time interval
- start time
- end time

Output:

- {array} candlesticks/kline data specified by parameters

i.e. 

```
[
  [
    1499040000000,      // Open time
    "0.01634790",       // Open
    "0.80000000",       // High
    "0.01575800",       // Low
    "0.01577100",       // Close
    "148976.11427815",  // Volume
    1499644799999,      // Close time
    "2434.19055334",    // Quote asset volume
    308,                // Number of trades
    "1756.87402397",    // Taker buy base asset volume
    "28.46694368",      // Taker buy quote asset volume
    "17928899.62484339" // Ignore
  ]
]
```

### getOrders

Get open orders for a symbol.

Input:

- API credentials - *required*
- tickerPair - *required*

Output:

- {Array} list of current orders

### getBalance

Get list of current balances.

Input:

- API credentials - *required*
- tickerPair - *required*

Output:

- {object} map of ticker symbols and quantity on the account

### cancelOrders

Cancel all open orders of a ticker pair.

Input:

- API credentials - *required*
- tickerPair - *required*

Output:

- {object} binance API response

### getTradeHistory

Get trade history of a ticker pair.

Input:

- API credentials - *required*
- tickerPair - *required*

Output:

- {array} list of previous orders

### buy

Create a limit or market buy order.

Input:

- API credentials - *required*
- tickerPair - *required*
- order type (limit/market) - *required*
- quantity - *required*
- price - *required*

Output:

- {object} binance API response

### sell

Create a limit or market sell order.

Input:

- API credentials - *required*
- tickerPair - *required*
- order type (limit/market) - *required*
- quantity - *required*
- price - *required*

Output:

- {object} binance API response


## Response and error handling

Responses are directly passed through from the API to the output payload. Errors are directed to the nodes status message as well as the debug console. 

For more details on the responses please see the official Binance REST API documentation at:
https://github.com/binance-exchange/binance-official-api-docs/blob/master/rest-api.md