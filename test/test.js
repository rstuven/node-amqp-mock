var mockamqp = require('..'),
    amqp = require('amqp'),
    sinon = require('sinon'),
    chai = require('chai'),
    should = chai.should();
chai.use(require('sinon-chai'));

describe('amqp-mock', function(){

    describe('#publish', function(){

        it('should publish messages with different exchanges', function(done){

            var scope = mockamqp(),
                spy = sinon.spy(),
                connection = amqp.createConnection();

            scope
                .exchange('exch1')
                    .publish('rout', "test 1")
                .exchange('exch2')
                    .publish('rout', "test 2")
                ;

            connection.on('ready', function(){
                connection.exchange('exch2', {type:'direct'}, function(exchange){
                    connection.queue('', function(queue){

                        queue.bind(exchange.name, 'rout');

                        queue.subscribe({}, function(message){
                            spy(message.data);
                        });
                    });
                });
            });

            connection.on('error', function(err){
                throw err;
            });

            setTimeout(function(){

                spy.should.have.been.calledOnce;
                spy.should.have.been.calledWith('test 2');

                scope.done();
                done();

            }, 1);
        });

        it('should publish messages with different routing keys through fanout exchange', function(done){

            var scope = mockamqp(),
                spy = sinon.spy(),
                connection = amqp.createConnection();

            scope
                .exchange('exch')
                    .publish('rout1', "test 1")
                    .publish('rout2', "test 2")
                    .publish('rout3', "test 3")
                ;

            connection.on('ready', function(){
                connection.exchange('exch', {type:'fanout'}, function(exchange){
                    connection.queue('', function(queue){

                        queue.bind(exchange.name, 'rout3');
                        queue.bind(exchange.name, 'rout1');

                        queue.subscribe({}, function(message){
                            spy(message.data);
                        });
                    });
                });
            });

            connection.on('error', function(err){
                throw err;
            });

            setTimeout(function(){

                spy.should.have.been.calledThrice;
                spy.should.have.been.calledWith('test 1');
                spy.should.have.been.calledWith('test 2');
                spy.should.have.been.calledWith('test 3');

                scope.done();
                done();

            }, 1);
        });

        it('should publish messages with different routing keys through direct exchange', function(done){

            var scope = mockamqp(),
                spy = sinon.spy(),
                connection = amqp.createConnection();

            scope
                .exchange('exch')
                    .publish('rout1', "test 1")
                    .publish('rout2', "test 2")
                    .publish('rout3', "test 3")
                ;

            connection.on('ready', function(){
                connection.exchange('exch', {type:'direct'}, function(exchange){
                    connection.queue('', function(queue){

                        queue.bind(exchange.name, 'rout3');
                        queue.bind(exchange.name, 'rout1');

                        queue.subscribe({}, function(message){
                            spy(message.data);
                        });
                    });
                });
            });

            connection.on('error', function(err){
                throw err;
            });

            setTimeout(function(){

                spy.should.have.been.calledTwice;
                spy.should.have.been.calledWith('test 1');
                spy.should.have.been.calledWith('test 3');

                scope.done();
                done();

            }, 1);
        });

        it('should publish messages with different routing keys through topic exchange', function(done){

            var scope = mockamqp(),
                spy = sinon.spy(),
                connection = amqp.createConnection();

            scope
                .exchange('exch')
                    .publish('a.b.c', "test x")
                    .publish('a.b.d', "test y")
                    .publish('x.y.c', "test z")
                ;

            connection.on('ready', function(){
                connection.exchange('exch', {type:'topic'}, function(exchange){
                    connection.queue('', function(queue){

                        queue.bind(exchange.name, '*.*.c');
                        queue.bind(exchange.name, 'x.*.*');

                        queue.subscribe({}, function(message){
                            spy(message.data);
                        });
                    });
                });
            });

            connection.on('error', function(err){
                throw err;
            });

            setTimeout(function(){

                spy.should.have.been.calledTwice;
                spy.should.have.been.calledWith('test x');
                spy.should.have.been.calledWith('test z');

                scope.done();
                done();

            }, 1);
        });

    });

});
