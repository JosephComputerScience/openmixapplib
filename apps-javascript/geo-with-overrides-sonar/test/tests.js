
(function() {
    'use strict';

    var default_settings = {
        providers: {
            'foo': {
                cname: 'www.foo.com'
            },
            'bar': {
                cname: 'www.bar.com'
            },
            'baz': {
                cname: 'www.baz.com'
            }
        },
        country_to_provider: { 'UK': 'bar' },
        market_to_provider: { 'EG': 'foo' },
        default_provider: 'foo',
        default_ttl: 20,
        error_ttl: 10,
        require_sonar_data: false
    };

    QUnit.module('do_init');

    function test_do_init(i) {
        return function() {

            var sut = new OpenmixApplication(i.settings || default_settings),
                config = {
                    requireProvider: sinon.stub()
                },
                test_stuff = {
                    instance: sut,
                    config: config
                };

            i.setup(test_stuff);

            // Test
            sut.do_init(config);

            // Assert
            i.verify(test_stuff);
        };
    }

    QUnit.test('default', function(assert) {
        test_do_init({
            setup: function() { return; },
            verify: function(i) {
                assert.equal(i.config.requireProvider.callCount, 3, 'Verifying requireProvider call count');
                assert.equal(i.config.requireProvider.args[2][0], 'foo', 'Verirying failover provider alias');
                assert.equal(i.config.requireProvider.args[1][0], 'bar', 'Verirying provider alias');
                assert.equal(i.config.requireProvider.args[0][0], 'baz', 'Verirying provider alias');
            }
        })();
    });

    QUnit.module('handle_request');

    function test_handle_request(i) {
        return function() {
            var sut = new OpenmixApplication(i.settings || default_settings),
                request = {
                    getData: sinon.stub(),
                    getProbe: sinon.stub()
                },
                response = {
                    respond: sinon.stub(),
                    setTTL: sinon.stub(),
                    setReasonCode: sinon.stub()
                },
                test_stuff = {
                    instance: sut,
                    request: request,
                    response: response
                };

            var random = sinon.stub(Math,"random");

            i.setup(test_stuff);

            // Test
            sut.handle_request(request, response);

            // Assert
            i.verify(test_stuff);
            random.restore();
        };
    }

    QUnit.test('geo country overrides, no sonar data', function(assert) {
        test_handle_request({
            settings: {
                providers: {
                    'foo': {
                        cname: 'www.foo.com'
                    },
                    'bar': {
                        cname: 'www.bar.com'
                    },
                    'baz': {
                        cname: 'www.baz.com'
                    }
                },
                country_to_provider: { 'UK': 'bar' },
                market_to_provider: { 'EG': 'foo' },
                default_provider: 'foo',
                default_ttl: 20,
                error_ttl: 10,
                require_sonar_data: false,
                fusion_sonar_threshold: 2
            },
            setup: function(i) {
                console.log(i);
                i.request.country = 'UK';
                i.request.market = 'EG';
                i.request
                    .getData
                    .onCall(0)
                    .returns({});
            },
            verify: function(i) {
                console.log(i);
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'bar', 'Verifying selected alias');
                assert.equal(i.response.respond.args[0][1], 'www.bar.com', 'Verifying CNAME');
                assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'B', 'Verifying reason code');
            }
        })();
    });

    QUnit.test('geo markets overrides, no sonar data', function(assert) {
        test_handle_request({
            settings: {
                providers: {
                    'foo': {
                        cname: 'www.foo.com'
                    },
                    'bar': {
                        cname: 'www.bar.com'
                    },
                    'baz': {
                        cname: 'www.baz.com'
                    }
                },
                country_to_provider: { 'UK': 'bar' },
                market_to_provider: { 'EG': 'foo' },
                default_provider: 'foo',
                default_ttl: 20,
                error_ttl: 10,
                require_sonar_data: false
            },
            setup: function(i) {
                console.log(i);
                i.request.country = 'US';
                i.request.market = 'EG';
                i.request
                    .getData
                    .onCall(0)
                    .returns({});
            },
            verify: function(i) {
                console.log(i);
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'foo', 'Verifying selected alias');
                assert.equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying CNAME');
                assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying reason code');
            }
        })();
    });

    QUnit.test('unexpected market, no sonar data', function(assert) {
        test_handle_request({
            settings: {
                providers: {
                    'foo': {
                        cname: 'www.foo.com'
                    },
                    'bar': {
                        cname: 'www.bar.com'
                    },
                    'baz': {
                        cname: 'www.baz.com'
                    }
                },
                country_to_provider: { 'UK': 'bar' },
                market_to_provider: { 'EG': 'foo' },
                default_provider: 'baz',
                default_ttl: 20,
                error_ttl: 10,
                require_sonar_data: false
            },
            setup: function(i) {
                console.log(i);
                i.request.country = 'US';
                i.request.market = 'FR';
                i.request
                    .getData
                    .onCall(0)
                    .returns({});
            },
            verify: function(i) {
                console.log(i);
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'baz', 'Verifying selected alias');
                assert.equal(i.response.respond.args[0][1], 'www.baz.com', 'Verifying CNAME');
                assert.equal(i.response.setTTL.args[0][0], 10, 'Verifying TTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'C', 'Verifying reason code');
            }
        })();
    });

    QUnit.test('selected geo country provider is not below sonar threshold', function(assert) {
        test_handle_request({
            settings: {
                providers: {
                    'foo': {
                        cname: 'www.foo.com'
                    },
                    'bar': {
                        cname: 'www.bar.com'
                    },
                    'baz': {
                        cname: 'www.baz.com'
                    }
                },
                country_to_provider: { 'UK': 'bar' },
                market_to_provider: { 'EG': 'foo' },
                default_provider: 'baz',
                default_ttl: 20,
                error_ttl: 10,
                require_sonar_data: false
            },
            setup: function(i) {
                console.log(i);
                i.request.country = 'UK';
                i.request.market = 'FR';
                i.request
                    .getData
                    .onCall(0)
                    .returns({
                        "foo": JSON.stringify({
                            "avail": 0
                        }),
                        "bar": JSON.stringify({
                            "avail": 1
                        })
                    });
            },
            verify: function(i) {
                console.log(i);
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'bar', 'Verifying selected alias');
                assert.equal(i.response.respond.args[0][1], 'www.bar.com', 'Verifying CNAME');
                assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'B', 'Verifying reason code');
            }
        })();
    });

    QUnit.test('disregard geo override, select only provider where sonar score above threshold', function(assert) {
        test_handle_request({
            settings: {
                providers: {
                    'foo': {
                        cname: 'www.foo.com'
                    },
                    'bar': {
                        cname: 'www.bar.com'
                    },
                    'baz': {
                        cname: 'www.baz.com'
                    }
                },
                country_to_provider: { 'UK': 'bar' },
                market_to_provider: { 'EG': 'foo' },
                default_provider: 'baz',
                default_ttl: 20,
                error_ttl: 10,
                require_sonar_data: false
            },
            setup: function(i) {
                console.log(i);
                i.request.country = 'UK';
                i.request.market = 'FR';
                i.request
                    .getData
                    .onCall(0)
                    .returns({
                        "foo": JSON.stringify({
                            "avail": 1
                        }),
                        "bar": JSON.stringify({
                            "avail": 0
                        }),
                        "baz": JSON.stringify({
                            "avail": 0
                        })
                    });
            },
            verify: function(i) {
                console.log(i);
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'foo', 'Verifying selected alias');
                assert.equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying CNAME');
                assert.equal(i.response.setTTL.args[0][0], 10, 'Verifying TTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'DC', 'Verifying reason code');
            }
        })();
    });

    QUnit.test('verify default provider selected when no sonar providers available', function(assert) {
        test_handle_request({
            settings: {
                providers: {
                    'foo': {
                        cname: 'www.foo.com'
                    },
                    'bar': {
                        cname: 'www.bar.com'
                    },
                    'baz': {
                        cname: 'www.baz.com'
                    }
                },
                country_to_provider: { 'UK': 'bar' },
                market_to_provider: { 'EG': 'foo' },
                default_provider: 'baz',
                default_ttl: 20,
                error_ttl: 10,
                require_sonar_data: false
            },
            setup: function(i) {
                console.log(i);
                i.request.country = 'UK';
                i.request.market = 'FR';
                i.request
                    .getData
                    .onCall(0)
                    .returns({
                        "foo": JSON.stringify({
                            "avail": 0
                        }),
                        "bar": JSON.stringify({
                            "avail": 0
                        }),
                        "baz": JSON.stringify({
                            "avail": 0
                        })
                    });
            },
            verify: function(i) {
                console.log(i);
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'baz', 'Verifying selected alias');
                assert.equal(i.response.respond.args[0][1], 'www.baz.com', 'Verifying CNAME');
                assert.equal(i.response.setTTL.args[0][0], 10, 'Verifying TTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'EC', 'Verifying reason code');
            }
        })();
    });

    QUnit.test('verify default provider selected when no sonar providers available 2', function(assert) {
        test_handle_request({
            settings: {
                providers: {
                    'foo': {
                        cname: 'www.foo.com'
                    },
                    'bar': {
                        cname: 'www.bar.com'
                    },
                    'baz': {
                        cname: 'www.baz.com'
                    }
                },
                country_to_provider: { 'UK': 'bar' },
                market_to_provider: { 'EG': 'foo' },
                default_provider: 'baz',
                default_ttl: 20,
                error_ttl: 10,
                require_sonar_data: true
            },
            setup: function(i) {
                console.log(i);
                i.request.country = 'UK';
                i.request.market = 'FR';
                i.request
                    .getData
                    .onCall(0)
                    .returns({
                        "foo": JSON.stringify({
                            "avail": 0
                        }),
                        "bar": JSON.stringify({
                            "avail": 0
                        }),
                        "baz": JSON.stringify({
                            "avail": 0
                        })
                    });
            },
            verify: function(i) {
                console.log(i);
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'baz', 'Verifying selected alias');
                assert.equal(i.response.respond.args[0][1], 'www.baz.com', 'Verifying CNAME');
                assert.equal(i.response.setTTL.args[0][0], 10, 'Verifying TTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'EC', 'Verifying reason code');
            }
        })();
    });

    QUnit.test('all sonar scores are good, select geo market override', function(assert) {
        test_handle_request({
            settings: {
                providers: {
                    'foo': {
                        cname: 'www.foo.com'
                    },
                    'bar': {
                        cname: 'www.bar.com'
                    },
                    'baz': {
                        cname: 'www.baz.com'
                    }
                },
                country_to_provider: { 'UK': 'bar' },
                market_to_provider: { 'EG': 'foo' },
                default_provider: 'baz',
                default_ttl: 20,
                error_ttl: 10,
                require_sonar_data: false
            },
            setup: function(i) {
                console.log(i);
                i.request.country = 'US';
                i.request.market = 'EG';
                i.request
                    .getData
                    .onCall(0)
                    .returns({
                        "foo": JSON.stringify({
                            "avail": 1
                        }),
                        "bar": JSON.stringify({
                            "avail": 1
                        }),
                        "baz": JSON.stringify({
                            "avail": 1
                        })
                    });
            },
            verify: function(i) {
                console.log(i);
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'foo', 'Verifying selected alias');
                assert.equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying CNAME');
                assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying reason code');
            }
        })();
    });

    QUnit.test('geo country fails sonar, select next available sonar provider', function(assert) {
        test_handle_request({
            settings: {
                providers: {
                    'foo': {
                        cname: 'www.foo.com'
                    },
                    'bar': {
                        cname: 'www.bar.com'
                    },
                    'baz': {
                        cname: 'www.baz.com'
                    }
                },
                country_to_provider: { 'UK': 'bar' },
                market_to_provider: { 'US': 'foo' },
                default_provider: 'baz',
                default_ttl: 20,
                error_ttl: 10,
                require_sonar_data: false
            },
            setup: function(i) {
                console.log(i);
                i.request.country = 'UK';
                i.request.market = 'EG';
                i.request
                    .getData
                    .onCall(0)
                    .returns({
                        "foo": JSON.stringify({
                            "avail": 1
                        }),
                        "bar": JSON.stringify({
                            "avail": 0
                        }),
                        "baz": JSON.stringify({
                            "avail": 1
                        })
                    });
            },
            verify: function(i) {
                console.log(i);
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.notEqual(i.response.respond.args[0][0], 'bar', 'Verifying selected alias');
                assert.notEqual(i.response.respond.args[0][1], 'www.bar.com', 'Verifying CNAME');
                assert.equal(i.response.setTTL.args[0][0], 10, 'Verifying TTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'DC', 'Verifying reason code');
            }
        })();
    });

    QUnit.test('test sonar_data_required flag returns only available platform', function(assert) {
        test_handle_request({
            settings: {
                providers: {
                    'foo': {
                        cname: 'www.foo.com'
                    },
                    'bar': {
                        cname: 'www.bar.com'
                    },
                    'baz': {
                        cname: 'www.baz.com'
                    }
                },
                country_to_provider: { 'UK': 'bar' },
                market_to_provider: { 'US': 'foo' },
                default_provider: 'baz',
                default_ttl: 20,
                error_ttl: 10,
                require_sonar_data: true
            },
            setup: function(i) {
                console.log(i);
                i.request.country = 'UK';
                i.request.market = 'EG';
                i.request
                    .getData
                    .onCall(0)
                    .returns({
                        "foo": JSON.stringify({
                            "avail": 1
                        })
                    });
            },
            verify: function(i) {
                console.log(i);
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'foo', 'Verifying selected alias');
                assert.equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying CNAME');
                assert.equal(i.response.setTTL.args[0][0], 10, 'Verifying TTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'DC', 'Verifying reason code');
            }
        })();
    });

}());
