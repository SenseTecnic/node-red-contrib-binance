
var ORDER_TYPES = { // currently supported order types
  limit: "LIMIT",
  market: "MARKET"
};

function parseApiError(err) {
  if (err.body) {
    try {
      var resp = JSON.parse(err.body);
      return resp.msg;
    } catch (err) {/* pass thru */}
  }
  return "Unknown error. Status code: "+err.statsCode;
}

// Filter out balance items that are zero
function filterNonZeroBalance(balances) {
  var filteredSymbols = Object.keys(balances).filter(function (symbol) {
    return balances[symbol].available !== "0.00000000"
      || balances[symbol].onOrder !== "0.00000000";
  });
  var filteredMap = {};
  filteredSymbols.forEach(function (symbol) {
    filteredMap[symbol] = {
      available: balances[symbol].available,
      onOrder: balances[symbol].onOrder
    };
  });
  return filteredMap;
}

function validateOrderFields(RED, node, tickerPair, orderType, quantity, price) {
  if (!tickerPair) {
    node.error(RED._("binance.errors.missing-ticker"));
    node.status({fill: "red", shape: "ring", text: RED._("binance.errors.missing-ticker-status")});
    return false;
  }

  if (!quantity) {
    node.error(RED._("binance.errors.missing-quantity"));
    node.status({fill: "red", shape: "ring", text: RED._("binance.errors.missing-quantity")});
    return false;
  }

  if (!price && orderType !== ORDER_TYPES.market) {
    node.error(RED._("binance.errors.missing-price"));
    node.status({fill: "red", shape: "ring", text: RED._("binance.errors.missing-price")});
    return false;
  }

  if (isNaN(quantity)) {
    node.error(RED._("binance.errors.quantity-not-a-number"));
    node.status({fill: "red", shape: "ring", text: RED._("binance.errors.quantity-not-a-number")});
    return false;
  }

  if (isNaN(price) && orderType !== ORDER_TYPES.market) {
    node.error(RED._("binance.errors.price-not-a-number"));
    node.status({fill: "red", shape: "ring", text: RED._("binance.errors.price-not-a-number")});
    return false;
  }

  if (orderType !== ORDER_TYPES.limit && orderType !== ORDER_TYPES.market) {
    node.error(RED._("binance.errors.invalid-order-type"));
    node.status({fill: "red", shape: "ring", text: RED._("binance.errors.invalid-order-type-status")});
    return false;
  }

  return true;
}

module.exports = function (RED) {

  function BinanceNode(n) {
    RED.nodes.createNode(this,n);
    var node = this;
    node.binance = require('node-binance-api');;

    if (node.credentials &&
        node.credentials.apiKey && node.credentials.apiSecret) {
      try {
        console.log('init binance')
        node.binance.options({
          APIKEY: node.credentials.apiKey,
          APISECRET: node.credentials.apiSecret,
          useServerTime: true,
          test: false
        });
      } catch (err) {
        if (err.message === "apiRequest: Invalid API Key") {
          node.error(RED._("binance.errors.invalid-api-cred"));
        } else {
          throw err;
        }
      }
    } else {
      console.log("API credentials not loaded");
      node.error(RED._("binance.errors.missing-conf"));
    }
  }

  function getPriceNode(n) {
    RED.nodes.createNode(this,n);
    var node = this;
    node.binance = require('node-binance-api');
    node.ticker = n.ticker;

    node.on('input', function (msg) {
      // supply ticker pair either through input form or msg topic
      if (!msg.topic && !node.ticker) {
        node.error(RED._("binance.errors.missing-ticker"));
        node.status({fill: "red", shape: "ring", text: RED._("binance.errors.missing-ticker-status")});
        return;
      }
      var tickerPair = node.ticker || msg.topic;
      tickerPair = tickerPair.toUpperCase();

      node.binance.prices(tickerPair, function (err, ticker) {
        if (err) {
          var errorMsg = parseApiError(err);
          node.error(errorMsg);
          node.status({fill: "red", shape: "ring", text: errorMsg});
          return;
        }
        node.status({}); //clear status message
        msg.payload = ticker[tickerPair];
        node.send(msg);
      });
    });
  }

  function getAllPricesNode(n) {
    RED.nodes.createNode(this,n);
    var node = this;
    node.binance = require('node-binance-api');

    node.on('input', function (msg) {
      node.binance.prices(function (err, tickers) {
        if (err) {
          var errorMsg = parseApiError(err);
          node.error(errorMsg);
          node.status({fill: "red", shape: "ring", text: errorMsg});
          return;
        }
        node.status({}); //clear status message
        msg.payload = tickers;
        node.send(msg);
      });
    });
  }

  function getBookTickerNode(n) {
    RED.nodes.createNode(this,n);
    var node = this;
    node.binance = require('node-binance-api');
    node.ticker = n.ticker;

    node.on('input', function (msg) {
      // supply ticker pair either through input form or msg topic
      if (!msg.topic && !node.ticker) {
        node.error(RED._("binance.errors.missing-ticker"));
        node.status({fill: "red", shape: "ring", text: RED._("binance.errors.missing-ticker-status")});
        return;
      }
      var tickerPair = node.ticker || msg.topic;
      tickerPair = tickerPair.toUpperCase();

      node.binance.bookTickers(tickerPair, function (err, ticker) {
        if (err) {
          var errorMsg = parseApiError(err);
          node.error(errorMsg);
          node.status({fill: "red", shape: "ring", text: errorMsg});
          return;
        }
        node.status({}); //clear status message
        msg.payload = ticker;
        node.send(msg);
      });
    });
  }

  function getDayStatsNode(n) {
    RED.nodes.createNode(this,n);
    var node = this;
    node.binance = require('node-binance-api');
    node.ticker = n.ticker;

    node.on('input', function (msg) {

      var tickerPair = node.ticker || msg.topic;
      tickerPair = tickerPair ? tickerPair.toUpperCase(): false;

      node.binance.prevDay(tickerPair, function (err, ticker) {
        if (err) {
          var errorMsg = parseApiError(err);
          node.error(errorMsg);
          node.status({fill: "red", shape: "ring", text: errorMsg});
          return;
        }
        node.status({}); //clear status message
        msg.payload = ticker;
        node.send(msg);
      });
    });
  }

  function getCandleSticksNode(n) {
    RED.nodes.createNode(this,n);
    var node = this;
    node.binance = require('node-binance-api');
    node.ticker = n.ticker;
    node.interval = n.interval;
    node.limit = n.limit;
    node.startTime = n.startTime;
    node.endTime = n.endTime;

    node.on('input', function (msg) {

      // supply ticker pair either through input form or msg topic
      if (!msg.topic && !node.ticker) {
        node.error(RED._("binance.errors.missing-ticker"));
        node.status({fill: "red", shape: "ring", text: RED._("binance.errors.missing-ticker-status")});
        return;
      }

      if (!node.interval) {
        node.error(RED._("binance.errors.missing-interval"));
        node.status({fill: "red", shape: "ring", text: RED._("binance.errors.missing-interval")});
      }

      var tickerPair = node.ticker || msg.topic;
      tickerPair = tickerPair.toUpperCase();

      var options = {};
      options.startTime = node.startTime ? (new Date(node.startTime)).getTime(): undefined;
      options.endTime = node.endTime ? (new Date(node.endTime)).getTime(): undefined;
      options.limit = node.limit ? node.limit: undefined;

      node.binance.candlesticks(tickerPair, node.interval, function (err, ticker) {
        if (err) {
          var errorMsg = parseApiError(err);
          node.error(errorMsg);
          node.status({fill: "red", shape: "ring", text: errorMsg});
          return;
        }
        node.status({}); //clear status message
        msg.payload = ticker;
        node.send(msg);
      }, options);

    });
  }

  function getBalanceNode(n) {
    RED.nodes.createNode(this,n);
    var node = this;
    node.binance = RED.nodes.getNode(n.binance);
    node.binance = node.binance ? node.binance.binance: null;

    node.on('input', function (msg) {
      if (!node.binance) {
        node.error(RED._("binance.errors.missing-conf"));
        return;
      }
      binance.balance(function (err, balances) {
        if (err) {
          var errorMsg = parseApiError(err);
          node.error(errorMsg);
          node.status({fill: "red", shape: "ring", text: errorMsg});
          return;
        }
        node.status({}); //clear status message
        msg.payload = filterNonZeroBalance(balances);
        node.send(msg);
      });
    });
  }

  function getOrdersNode(n) {
    RED.nodes.createNode(this,n);
    var node = this;
    node.binance = RED.nodes.getNode(n.binance);
    node.binance = node.binance ? node.binance.binance: null;
    node.ticker = n.ticker;

    node.on('input', function (msg) {

      if (!node.binance) {
        node.error(RED._("binance.errors.missing-conf"));
        return;
      }

      var tickerPair = node.ticker || msg.topic;
      tickerPair = tickerPair ? tickerPair.toUpperCase(): false;

      console.log(node.binance.options())

      node.binance.openOrders(tickerPair, function (err, openOrders) {
        if (err) {
          var errorMsg = parseApiError(err);
          node.error(errorMsg);
          node.status({fill: "red", shape: "ring", text: errorMsg});
          return;
        }
        node.status({}); //clear status message
        msg.payload = openOrders;
        node.send(msg);
      });
    });
  }

  function cancelOrdersNode(n) {
    RED.nodes.createNode(this,n);
    var node = this;
    node.binance = RED.nodes.getNode(n.binance);
    node.ticker = n.ticker;

    node.on('input', function (msg) {
      if (!node.binance) {
        node.error(RED._("binance.errors.missing-conf"));
        return;
      }
      if (!msg.topic && !node.ticker) {
        node.error(RED._("binance.errors.missing-ticker"));
        node.status({fill: "red", shape: "ring", text: RED._("binance.errors.missing-ticker-status")});
        return;
      }
      var tickerPair = node.ticker || msg.topic;
      tickerPair = tickerPair.toUpperCase();

      binance.cancelOrders(tickerPair, function (err, resp) {
        if (err) {
          var errorMsg = parseApiError(err);
          node.error(errorMsg);
          node.status({fill: "red", shape: "ring", text: errorMsg});
          return;
        }
        node.status({}); //clear status message
        msg.payload = resp;
        node.send(msg);
      });
    });
  }

  function getTradeHistoryNode(n) {
    RED.nodes.createNode(this,n);
    var node = this;
    node.binance = RED.nodes.getNode(n.binance);
    node.ticker = n.ticker;

    node.on('input', function (msg) {
      if (!node.binance) {
        node.error(RED._("binance.errors.missing-conf"));
        return;
      }
      if (!msg.topic && !node.ticker) {
        node.error(RED._("binance.errors.missing-ticker"));
        node.status({fill: "red", shape: "ring", text: RED._("binance.errors.missing-ticker-status")});
        return;
      }
      var tickerPair = node.ticker || msg.topic;
      tickerPair = tickerPair.toUpperCase();

      binance.trades(tickerPair, function (err, resp) {
        if (err) {
          var errorMsg = parseApiError(err);
          node.error(errorMsg);
          node.status({fill: "red", shape: "ring", text: errorMsg});
          return;
        }
        node.status({}); //clear status message
        msg.payload = resp;
        node.send(msg);
      });
    });
  }

  function buyNode(n) {
    RED.nodes.createNode(this,n);
    var node = this;
    node.binance = RED.nodes.getNode(n.binance);
    node.ticker = n.ticker;
    node.quantity = n.quantity;
    node.price = n.price;
    node.orderType = n.orderType;

    node.on('input', function (msg) {
      if (!node.binance) {
        node.error(RED._("binance.errors.missing-conf"));
        return;
      }
      var tickerPair = node.ticker || msg.topic;
      var quantity = node.quantity || msg.payload.quantity;
      var price = node.price || msg.payload.price;
      var orderType = node.orderType;

      if (validateOrderFields(RED, node, tickerPair, orderType, quantity, price) !== true) {
        return;
      }

      tickerPair = tickerPair.toUpperCase();
      price = parseFloat(price); // parseFloat will round to nearest 8th decimal place
      quantity = parseFloat(quantity);

      binance.buy(tickerPair, quantity, price, {
        type: orderType // LIMIT, MARKET
      }, function (err, resp) {
        if (err) {
          var errorMsg = parseApiError(err);
          node.error(errorMsg);
          node.status({fill: "red", shape: "ring", text: errorMsg});
          return;
        }
        node.status({}); //clear status message
        msg.payload = resp;
        node.send(msg);
      });
    });
  }

  function sellNode(n) {
    RED.nodes.createNode(this,n);
    var node = this;
    node.binance = RED.nodes.getNode(n.binance);
    node.ticker = n.ticker;
    node.quantity = n.quantity;
    node.price = n.price;
    node.orderType = n.orderType;

    node.on('input', function (msg) {
      if (!node.binance) {
        node.error(RED._("binance.errors.missing-conf"));
        return;
      }
      var tickerPair = node.ticker || msg.topic;
      var quantity = node.quantity || msg.payload.quantity;
      var price = node.price || msg.payload.price;
      var orderType = node.orderType;

      if (validateOrderFields(RED, node, tickerPair, orderType, quantity, price) !== true) {
        return;
      }

      tickerPair = tickerPair.toUpperCase();
      price = parseFloat(price); // parseFloat will round to nearest 8th decimal place
      quantity = parseFloat(quantity);

      binance.sell(tickerPair, quantity, price, {
        type: orderType // LIMIT, MARKET
      }, function (err, resp) {
        if (err) {
          var errorMsg = parseApiError(err);
          node.error(errorMsg);
          node.status({fill: "red", shape: "ring", text: errorMsg});
          return;
        }
        node.status({}); //clear status message
        msg.payload = resp;
        node.send(msg);
      });
    });
  }

  RED.nodes.registerType("binance-credentials", BinanceNode, {
    credentials: {
      apiKey: {type: "password"},
      apiSecret: {type: "password"}
    }
  });

  // Public APIs

  RED.nodes.registerType("binance-get-price", getPriceNode);
  RED.nodes.registerType("binance-get-all-prices", getAllPricesNode);
  RED.nodes.registerType("binance-get-book-ticker", getBookTickerNode);
  RED.nodes.registerType("binance-get-day-stats", getDayStatsNode);
  RED.nodes.registerType("binance-get-candlesticks", getCandleSticksNode);

  // Account APIs (require credentials)

  RED.nodes.registerType("binance-get-balance", getBalanceNode);
  RED.nodes.registerType("binance-get-orders", getOrdersNode);
  RED.nodes.registerType("binance-cancel-orders", cancelOrdersNode);
  RED.nodes.registerType("binance-get-trade-history", getTradeHistoryNode);
  RED.nodes.registerType("binance-buy", buyNode);
  RED.nodes.registerType("binance-sell", sellNode);

};