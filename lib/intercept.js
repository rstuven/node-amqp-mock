"use scrict";

var amqp = require('amqp');

// Connection prototype
var cp = amqp.Connection.prototype;

// Queue prototype
var qp = (function(){
    // Queue class is private, but here's a hack to get its prototype:

    // first, let's instantiate a Connection
    var c = new amqp.Connection();

    // initialize properties used by 'queue' method with inoffensive but necessary values.
    c._sendMethod = function(){};
    c.channels = [];

    // Connection's 'queue' method returns an instance of Queue
    var q = c.queue();

    // now we can get the prototype of Queue
    return Object.getPrototypeOf(q);
})();

// save original methods
var o = {
    cp: {
        reconnect: cp.reconnect,
        _onMethod: cp._onMethod,
        _sendMethod: cp._sendMethod,
        _sendBody: cp._sendBody,
        exchange: cp.exchange,
        queue: cp.queue
    },
    qp: {
        subscribe: qp.subscribe
    }
};


// restore original methods
function restore() {
    cp.reconnect = o.cp.reconnect;
    cp._onMethod = o.cp._onMethod;
    cp._sendMethod = o.cp._sendMethod;
    cp._sendBody = o.cp._sendBody;
    cp.exchange = o.cp.exchange;
    cp.queue = o.cp.queue;
    qp.subscribe = o.qp.subscribe;
}


module.exports = function() {

    var bindings = [];

    // intercept methods

    function noop(){}
    cp._onMethod = noop;
    cp._sendBody = noop;

    cp.reconnect = function(){
        var self = this;
        this.channels = [];
        this.exchanges = {};
        setTimeout(function(){
            self.emit('ready');
        }, 1);
    };

    cp._sendMethod = function(channel, method, args){
        if (method.name === 'queueBind') {
            bindings.push(args);
        }
    };

    cp.exchange = function(name, options, openCallback){
        var result = o.cp.exchange.apply(this, arguments);

        if (openCallback != null) {
            openCallback(result);
        }

        return result;
    };

    cp.queue = function(name){
        var options, callback;
        if (typeof arguments[1] == 'object') {
            options = arguments[1];
            callback = arguments[2];
        } else {
            callback = arguments[1];
        }
        var result = o.cp.queue.apply(this, arguments);

        if (callback != null) {
            callback(result);
        }

        return result;
    };

    qp.subscribe = function() {
        var self = this;

        var args = Array.prototype.slice.call(arguments, 0);
        var messageListener = args[args.length - 1];

        var newMessageListener = args[args.length - 1] = function() {
            messageListener.apply(null, arguments);
        };

        for (var i=0; i < published.length; i++) {
            var p=published[i];

            if (!hasBinding(p, self)) continue;

            var headers = {};
            var deliveryInfo = {};
            var m = null;
            var msg = {data: p.message};
            newMessageListener.call(null, msg, headers, deliveryInfo, m);
            self.emit('message', msg, headers, deliveryInfo, m);
        }
    };

    function hasBinding(published, queue) {
        for (var i=0; i < bindings.length; i++) {
            var binding = bindings[i];
            var queueMatch = (binding.queue === queue.name  || binding.queue === '');
            var exchangeMatch =
                (binding.exchange === queue.exchange.name) &&
                (binding.exchange === published.exchange);
            var exchangeType = queue.exchange.options.type;
            var routingKeyMatch =
                (exchangeType === 'fanout') ||
                (exchangeType === 'direct' && binding.routingKey === published.routingKey) ||
                (exchangeType === 'topic' && topicMatch(binding.routingKey, published.routingKey));

            if (queueMatch && exchangeMatch && routingKeyMatch)
            {
                return true;
            }
        }
        return false;
    }

    function topicMatch(bindingRoutingKey, messageRoutingKey) {
        var re = bindingRoutingKey;
        re = re.replace(/\./g, '\\.');
        re = re.replace(/\*/g, '[^\\.]+');
        re = re.replace(/#/g, '.*');
        re = '^' + re + '$';
        re = new RegExp(re);
        return re.test(messageRoutingKey);
    }

    // queue of published messages
    var published = [];

    return {
        done: restore,
        publish: function(exchange, routingKey, message) {

            published.push({
                exchange: exchange,
                routingKey: routingKey,
                message: message
            });

            return this;
        }
    };

};
