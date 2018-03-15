var binance = require('node-binance-api');


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
    }
  });
  return filteredMap;
} 

module.exports = function (RED) {

  function BinanceNode(n) {
    RED.nodes.createNode(this,n);
    var node = this;

    if (node.credentials && 
        node.credentials.apiKey && node.credentials.apiSecret) {

      try {
        binance.options({
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
    node.binance = RED.nodes.getNode(n.binance);

    node.on('input', function (msg) {

      if (!msg.topic) {
        node.error(RED._("binance.errors.missing-ticker"));
        node.status({fill: "red", shape: "ring", text: RED._("binance.errors.missing-ticker-status")});
        return;
      }

      console.debug("Getting price for "+msg.topic);
      binance.prices(msg.topic, function (err, ticker) {
        if (err) {
          var errorMsg = parseApiError(err);
          node.error(errorMsg);
          node.status({fill: "red", shape: "ring", text: errorMsg});
          return;
        }
        node.status({});//clear
        msg.payload = ticker[msg.topic];
        node.send(msg);
      });
    });
  }

  function getAllPriceNode(n) {
    RED.nodes.createNode(this,n);
    var node = this;
    node.binance = RED.nodes.getNode(n.binance);

    node.on('input', function (msg) {
      console.debug("Getting all prices");
      binance.prices(function (err, tickers) {
        if (err) {
          var errorMsg = parseApiError(err);
          node.error(errorMsg);
          node.status({fill: "red", shape: "ring", text: errorMsg});
          return;
        }
        node.status({});//clear
        msg.payload = tickers;
        node.send(msg);
      });
    });
  }

  function getBalanceNode(n) {
    RED.nodes.createNode(this,n);
    var node = this;
    node.binance = RED.nodes.getNode(n.binance);

    node.on('input', function (msg) {

      if (!node.binance) {
        node.error(RED._("binance.errors.missing-conf"));
        return
      }

      console.debug("Getting balance");
      binance.balance(function (err, balances) {
        if (err) {
          var errorMsg = parseApiError(err);
          node.error(errorMsg);
          node.status({fill: "red", shape: "ring", text: errorMsg});
          return;
        }
        node.status({});//clear
        msg.payload = filterNonZeroBalance(balances);
        node.send(msg);
      });
    });
  }

  function getBookTickerNode(n) {
    RED.nodes.createNode(this,n);
    var node = this;
    node.binance = RED.nodes.getNode(n.binance);

    node.on('input', function (msg) {

      if (!msg.topic) {
        node.error(RED._("binance.errors.missing-ticker"));
        node.status({fill: "red", shape: "ring", text: RED._("binance.errors.missing-ticker-status")});
        return;
      }

      console.debug("Getting book ticker for "+msg.topic);
      binance.bookTickers(msg.topic, function (err, ticker) {
        if (err) {
          var errorMsg = parseApiError(err);
          node.error(errorMsg);
          node.status({fill: "red", shape: "ring", text: errorMsg});
          return;
        }
        node.status({});//clear
        msg.payload = ticker;
        node.send(msg);
      });
    });
  }

  function getDayStatsNode(n) {
    RED.nodes.createNode(this,n);
    var node = this;
    node.binance = RED.nodes.getNode(n.binance);

    node.on('input', function (msg) {

      var symbol = msg.topic ? msg.topic: false; 

      console.debug("Getting 24h stats");
      binance.prevDay(symbol, function (err, ticker) {
        if (err) {
          var errorMsg = parseApiError(err);
          node.error(errorMsg);
          node.status({fill: "red", shape: "ring", text: errorMsg});
          return;
        }
        node.status({});//clear
        msg.payload = ticker;
        node.send(msg);
      });
    });
  }

  function getCandleSticksNode(n) {
    RED.nodes.createNode(this,n);
    var node = this;
    node.binance = RED.nodes.getNode(n.binance);
    node.interval = n.interval;
    node.limit = n.limit;
    node.startTime = n.startTime;
    node.endTime = n.endTime;

    node.on('input', function (msg) {

      if (!msg.topic) {
        node.error(RED._("binance.errors.missing-ticker"));
        node.status({fill: "red", shape: "ring", text: RED._("binance.errors.missing-ticker-status")});
        return;
      }

      console.debug("Getting candle stick data for"+msg.topic);
      binance.candlesticks(msg.topic, function (err, ticker) {
        if (err) {
          var errorMsg = parseApiError(err);
          node.error(errorMsg);
          node.status({fill: "red", shape: "ring", text: errorMsg});
          return;
        }
        node.status({});//clear
        msg.payload = ticker;
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

  RED.nodes.registerType("binance-get-price", getPriceNode);

  RED.nodes.registerType("binance-get-all-price", getAllPriceNode);

  RED.nodes.registerType("binance-get-balance", getBalanceNode);

  RED.nodes.registerType("binance-get-book-ticker", getBookTickerNode);

  RED.nodes.registerType("binance-get-day-stats", getDayStatsNode);

  RED.nodes.registerType("binance-get-candlesticks", getCandleSticksNode);


}