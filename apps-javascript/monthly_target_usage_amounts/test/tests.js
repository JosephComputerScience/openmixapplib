
(function() {
    'use strict';

    var default_settings = {
        providers: {
            'foo': {
                cname: 'www.foo.com',
                base_padding: 50,
                targetMin: 20000,
                targetMax: 30000
            },
            'bar': {
                cname: 'www.bar.com',
                base_padding: 0
            },
            'baz': {
                cname: 'www.baz.com',
                base_padding: 0
            }
        },
        burstable_cdns: {
            'foo': {
                bandwidth: [
                    { max_threshold: 10000, multiplier: 1.2 },
                    { max_threshold: 7500, multiplier: 1.3 },
                    { max_threshold: 5000, multiplier: 1.5 }
                ]
            },
            'bar': {
                bandwidth: [
                    { max_threshold: 10000, multiplier: 1.2 },
                    { max_threshold: 7500, multiplier: 1.3 },
                    { max_threshold: 5000, multiplier: 1.5 }
                ]
            }
        },
        asn_to_provider: {
            7922: 'foo'
        },
        default_ttl: 20,
        error_ttl: 10,
        min_valid_rtt_score: 5,
        availability_threshold: 90,
        enable_usage_target_min_routing: true,
        enable_usage_target_max_routing: true,
        enable_max_threshold_routing: false,
        usage_strictness: 0.5
    };

    module('do_init');

    function test_do_init(i) {
        return function() {

            var sut = new OpenmixApplication(i.settings || default_settings),
                config = {
                    requireProvider: this.stub()
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

    test('default', test_do_init({
        setup: function() { return; },
        verify: function(i) {
            equal(i.config.requireProvider.callCount, 3, 'Verifying requireProvider call count');
            equal(i.config.requireProvider.args[2][0], 'foo', 'Verirying provider alias');
            equal(i.config.requireProvider.args[1][0], 'bar', 'Verirying provider alias');
            equal(i.config.requireProvider.args[0][0], 'baz', 'Verirying provider alias');
        }
    }));

    module('handle_request');

    function test_handle_request(i) {
        return function() {
            var sut = new OpenmixApplication(i.settings || default_settings),
                request = {
                    getData: this.stub(),
                    getProbe: this.stub()
                },
                response = {
                    respond: this.stub(),
                    setTTL: this.stub(),
                    setReasonCode: this.stub()
                },
                test_stuff = {
                    instance: sut,
                    request: request,
                    response: response
                };

            this.stub(Math, 'random');

            i.setup(test_stuff);

            // Test
            sut.handle_request(request, response);

            // Assert
            i.verify(test_stuff);
        };
    }

    test('foo faster; bar fastest after padding', test_handle_request({
        settings: {
            providers: {
                'foo': {
                    cname: 'www.foo.com',
                    base_padding: 50
                },
                'bar': {
                    cname: 'www.bar.com',
                    base_padding: 0
                },
                'baz': {
                    cname: 'www.baz.com',
                    base_padding: 0
                }
            },
            burstable_cdns: {
                'foo': {
                    bandwidth: [
                        { max_threshold: 10000, multiplier: 1.2 },
                        { max_threshold: 7500, multiplier: 1.3 },
                        { max_threshold: 5000, multiplier: 1.5 }
                    ]
                },
                'bar': {
                    bandwidth: [
                        { max_threshold: 10000, multiplier: 1.2 },
                        { max_threshold: 7500, multiplier: 1.3 },
                        { max_threshold: 5000, multiplier: 1.5 }
                    ]
                }
            },
            asn_to_provider: {
                7922: 'foo'
            },
            default_ttl: 20,
            error_ttl: 10,
            min_valid_rtt_score: 5,
            availability_threshold: 90,
            enable_usage_target_min_routing: false,
            enable_usage_target_max_routing: false,
            enable_max_threshold_routing: true,
            usage_strictness: 0.5
        },
        setup: function(i) {
            i.request
                .getProbe
                .onCall(0)
                .returns({
                    "foo": {
                        "avail": 100
                    },
                    "bar": {
                        "avail": 100
                    },
                    "baz": {
                        "avail": 100
                    }
                });
            i.request
                .getProbe
                .onCall(1)
                .returns({
                    "foo": {
                        "http_rtt": 200
                    },
                    "bar": {
                        "http_rtt": 201
                    },
                    "baz": {
                        "http_rtt": 220
                    }
                });
            i.request
                .getData
                .onCall(0)
                .returns({
                    "foo": JSON.stringify({
                        "bandwidth": {
                            "unit": "Mbps",
                            "value": "8623.57"
                        }
                    }),
                    "bar": JSON.stringify({
                        "bandwidth": {
                            "unit": "Mbps",
                            "value": "5001.31"
                        }
                    })
                });
            Math.random.returns(0);
        },
        verify: function(i) {
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'bar', 'Verifying respond provider');
            equal(i.response.respond.args[0][1], 'www.bar.com', 'Verifying respond CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
            equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying setReasonCode');
        }
    }));

    test('baz fastest after padding', test_handle_request({
        settings: {
            providers: {
                'foo': {
                    cname: 'www.foo.com',
                    base_padding: 50
                },
                'bar': {
                    cname: 'www.bar.com',
                    base_padding: 0
                },
                'baz': {
                    cname: 'www.baz.com',
                    base_padding: 0
                }
            },
            burstable_cdns: {
                'foo': {
                    bandwidth: [
                        { max_threshold: 10000, multiplier: 1.2 },
                        { max_threshold: 7500, multiplier: 1.3 },
                        { max_threshold: 5000, multiplier: 1.5 }
                    ]
                },
                'bar': {
                    bandwidth: [
                        { max_threshold: 10000, multiplier: 1.2 },
                        { max_threshold: 7500, multiplier: 1.3 },
                        { max_threshold: 5000, multiplier: 1.5 }
                    ]
                }
            },
            asn_to_provider: {
                7922: 'foo'
            },
            default_ttl: 20,
            error_ttl: 10,
            min_valid_rtt_score: 5,
            availability_threshold: 90,
            enable_usage_target_min_routing: false,
            enable_usage_target_max_routing: false,
            enable_max_threshold_routing: true,
            usage_strictness: 0.5
        },
        setup: function(i) {
            i.request
                .getProbe
                .onCall(0)
                .returns({
                    "foo": {
                        "avail": 100
                    },
                    "bar": {
                        "avail": 100
                    },
                    "baz": {
                        "avail": 100
                    }
                });
            i.request
                .getProbe
                .onCall(1)
                .returns({
                    "foo": {
                        "http_rtt": 155
                    },
                    "bar": {
                        "http_rtt": 201
                    },
                    "baz": {
                        "http_rtt": 220
                    }
                });
            i.request
                .getData
                .onCall(0)
                .returns({
                    "foo": JSON.stringify({
                        "bandwidth": {
                            "unit": "Mbps",
                            "value": "8623.57"
                        }
                    }),
                    "bar": JSON.stringify({
                        "bandwidth": {
                            "unit": "Mbps",
                            "value": "6112.31"
                        }
                    })
                });
            Math.random.returns(0);
        },
        verify: function(i) {
            equal(i.response.respond.args[0][0], 'baz', 'Verifying respond provider');
            equal(i.response.respond.args[0][1], 'www.baz.com', 'Verifying respond CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
            equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying setReasonCode');
        }
    }));

    test('foo fastest available', test_handle_request({
        settings: {
            providers: {
                'foo': {
                    cname: 'www.foo.com',
                    base_padding: 50
                },
                'bar': {
                    cname: 'www.bar.com',
                    base_padding: 0
                },
                'baz': {
                    cname: 'www.baz.com',
                    base_padding: 0
                }
            },
            burstable_cdns: {
                'foo': {
                    bandwidth: [
                        { max_threshold: 10000, multiplier: 1.2 },
                        { max_threshold: 7500, multiplier: 1.3 },
                        { max_threshold: 5000, multiplier: 1.5 }
                    ]
                },
                'bar': {
                    bandwidth: [
                        { max_threshold: 10000, multiplier: 1.2 },
                        { max_threshold: 7500, multiplier: 1.3 },
                        { max_threshold: 5000, multiplier: 1.5 }
                    ]
                }
            },
            asn_to_provider: {
                7922: 'foo'
            },
            default_ttl: 20,
            error_ttl: 10,
            min_valid_rtt_score: 5,
            availability_threshold: 90,
            enable_usage_target_min_routing: false,
            enable_usage_target_max_routing: false,
            enable_max_threshold_routing: true,
            usage_strictness: 0.5
        },
        setup: function(i) {
            i.request
                .getProbe
                .onCall(0)
                .returns({
                    "foo": {
                        "avail": 90
                    },
                    "bar": {
                        "avail": 89
                    },
                    "baz": {
                        "avail": 90
                    }
                });
            i.request
                .getProbe
                .onCall(1)
                .returns({
                    "foo": {
                        "http_rtt": 200
                    },
                    "bar": {
                        "http_rtt": 100
                    },
                    "baz": {
                        "http_rtt": 300
                    }
                });
            i.request
                .getData
                .onCall(0)
                .returns({
                    "foo": JSON.stringify({
                        "bandwidth": {
                            "unit": "Mbps",
                            "value": "8623.57"
                        }
                    }),
                    "bar": JSON.stringify({
                        "bandwidth": {
                            "unit": "Mbps",
                            "value": "6112.31"
                        }
                    })
                });
            Math.random.returns(0);
        },
        verify: function(i) {
            equal(i.response.respond.args[0][0], 'foo', 'Verifying respond provider');
            equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying respond CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
            equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying setReasonCode');
        }
    }));

    test('missing avail data for foo', test_handle_request({
        settings: {
            providers: {
                'foo': {
                    cname: 'www.foo.com',
                    base_padding: 50
                },
                'bar': {
                    cname: 'www.bar.com',
                    base_padding: 0
                },
                'baz': {
                    cname: 'www.baz.com',
                    base_padding: 0
                }
            },
            burstable_cdns: {
                'foo': {
                    bandwidth: [
                        { max_threshold: 10000, multiplier: 1.2 },
                        { max_threshold: 7500, multiplier: 1.3 },
                        { max_threshold: 5000, multiplier: 1.5 }
                    ]
                },
                'bar': {
                    bandwidth: [
                        { max_threshold: 10000, multiplier: 1.2 },
                        { max_threshold: 7500, multiplier: 1.3 },
                        { max_threshold: 5000, multiplier: 1.5 }
                    ]
                }
            },
            asn_to_provider: {
                7922: 'foo'
            },
            default_ttl: 20,
            error_ttl: 10,
            min_valid_rtt_score: 5,
            availability_threshold: 90,
            enable_usage_target_min_routing: false,
            enable_usage_target_max_routing: false,
            enable_max_threshold_routing: true,
            usage_strictness: 0.5
        },
        setup: function(i) {
            console.log(i);
            i.request
                .getProbe
                .onCall(0)
                .returns({
                    "foo": {},
                    "bar": {
                        "avail": 100
                    },
                    "baz": {
                        "avail": 100
                    }
                });
            i.request
                .getProbe
                .onCall(1)
                .returns({
                    "foo": {
                        "http_rtt": 155
                    },
                    "bar": {
                        "http_rtt": 201
                    },
                    "baz": {
                        "http_rtt": 220
                    }
                });
            i.request
                .getData
                .onCall(0)
                .returns({
                    "foo": JSON.stringify({
                        "bandwidth": {
                            "unit": "Mbps",
                            "value": "8623.57"
                        }
                    }),
                    "bar": JSON.stringify({
                        "bandwidth": {
                            "unit": "Mbps",
                            "value": "6112.31"
                        }
                    })
                });
            Math.random.returns(0);
        },
        verify: function(i) {
            equal(i.response.respond.args[0][0], 'foo', 'Verifying respond provider');
            equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying respond CNAME');
            equal(i.response.setTTL.args[0][0], 10, 'Verifying setTTL');
            equal(i.response.setReasonCode.args[0][0], 'E', 'Verifying setReasonCode');
        }
    }));

    test('missing rtt data for baz', test_handle_request({
        settings: {
            providers: {
                'foo': {
                    cname: 'www.foo.com',
                    base_padding: 50
                },
                'bar': {
                    cname: 'www.bar.com',
                    base_padding: 0
                },
                'baz': {
                    cname: 'www.baz.com',
                    base_padding: 0
                }
            },
            burstable_cdns: {
                'foo': {
                    bandwidth: [
                        { max_threshold: 10000, multiplier: 1.2 },
                        { max_threshold: 7500, multiplier: 1.3 },
                        { max_threshold: 5000, multiplier: 1.5 }
                    ]
                },
                'bar': {
                    bandwidth: [
                        { max_threshold: 10000, multiplier: 1.2 },
                        { max_threshold: 7500, multiplier: 1.3 },
                        { max_threshold: 5000, multiplier: 1.5 }
                    ]
                }
            },
            asn_to_provider: {
                7922: 'foo'
            },
            default_ttl: 20,
            error_ttl: 10,
            min_valid_rtt_score: 5,
            availability_threshold: 90,
            enable_usage_target_min_routing: false,
            enable_usage_target_max_routing: false,
            enable_max_threshold_routing: true,
            usage_strictness: 0.5
        },
        setup: function(i) {
            console.log(i);
            i.request
                .getProbe
                .onCall(0)
                .returns({
                    "foo": {
                        "avail": 100
                    },
                    "bar": {
                        "avail": 100
                    },
                    "baz": {
                        "avail": 100
                    }
                });
            i.request
                .getProbe
                .onCall(1)
                .returns({
                    "foo": {
                        "http_rtt": 155
                    },
                    "bar": {
                        "http_rtt": 201
                    },
                    "baz": {}
                });
            i.request
                .getData
                .onCall(0)
                .returns({
                    "foo": JSON.stringify({
                        "bandwidth": {
                            "unit": "Mbps",
                            "value": "8623.57"
                        }
                    }),
                    "bar": JSON.stringify({
                        "bandwidth": {
                            "unit": "Mbps",
                            "value": "6112.31"
                        }
                    })
                });
            Math.random.returns(0);
        },
        verify: function(i) {
            equal(i.response.respond.args[0][0], 'foo', 'Verifying respond provider');
            equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying respond CNAME');
            equal(i.response.setTTL.args[0][0], 10, 'Verifying setTTL');
            equal(i.response.setReasonCode.args[0][0], 'E', 'Verifying setReasonCode');
        }
    }));

    test('invalid rtt score for baz', test_handle_request({
        settings: {
            providers: {
                'foo': {
                    cname: 'www.foo.com',
                    base_padding: 50
                },
                'bar': {
                    cname: 'www.bar.com',
                    base_padding: 0
                },
                'baz': {
                    cname: 'www.baz.com',
                    base_padding: 0
                }
            },
            burstable_cdns: {
                'foo': {
                    bandwidth: [
                        { max_threshold: 10000, multiplier: 1.2 },
                        { max_threshold: 7500, multiplier: 1.3 },
                        { max_threshold: 5000, multiplier: 1.5 }
                    ]
                },
                'bar': {
                    bandwidth: [
                        { max_threshold: 10000, multiplier: 1.2 },
                        { max_threshold: 7500, multiplier: 1.3 },
                        { max_threshold: 5000, multiplier: 1.5 }
                    ]
                }
            },
            asn_to_provider: {
                7922: 'foo'
            },
            default_ttl: 20,
            error_ttl: 10,
            min_valid_rtt_score: 5,
            availability_threshold: 90,
            enable_usage_target_min_routing: false,
            enable_usage_target_max_routing: false,
            enable_max_threshold_routing: true,
            usage_strictness: 0.5
        },
        setup: function(i) {
            console.log(i);
            i.request
                .getProbe
                .onCall(0)
                .returns({
                    "foo": {
                        "avail": 100
                    },
                    "bar": {
                        "avail": 100
                    },
                    "baz": {
                        "avail": 100
                    }
                });
            i.request
                .getProbe
                .onCall(1)
                .returns({
                    "foo": {
                        "http_rtt": 155
                    },
                    "bar": {
                        "http_rtt": 201
                    },
                    "baz": {
                        "http_rtt": 4
                    }
                });
            i.request
                .getData
                .onCall(0)
                .returns({
                    "foo": JSON.stringify({
                        "bandwidth": {
                            "unit": "Mbps",
                            "value": "8623.57"
                        }
                    }),
                    "bar": JSON.stringify({
                        "bandwidth": {
                            "unit": "Mbps",
                            "value": "6112.31"
                        }
                    })
                });
            Math.random.returns(0);
        },
        verify: function(i) {
            equal(i.response.respond.args[0][0], 'foo', 'Verifying respond provider');
            equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying respond CNAME');
            equal(i.response.setTTL.args[0][0], 10, 'Verifying setTTL');
            equal(i.response.setReasonCode.args[0][0], 'E', 'Verifying setReasonCode');
        }
    }));

    test('fusion data problem', test_handle_request({
        settings: {
            providers: {
                'foo': {
                    cname: 'www.foo.com',
                    base_padding: 50
                },
                'bar': {
                    cname: 'www.bar.com',
                    base_padding: 0
                },
                'baz': {
                    cname: 'www.baz.com',
                    base_padding: 0
                }
            },
            burstable_cdns: {
                'foo': {
                    bandwidth: [
                        { max_threshold: 10000, multiplier: 1.2 },
                        { max_threshold: 7500, multiplier: 1.3 },
                        { max_threshold: 5000, multiplier: 1.5 }
                    ]
                },
                'bar': {
                    bandwidth: [
                        { max_threshold: 10000, multiplier: 1.2 },
                        { max_threshold: 7500, multiplier: 1.3 },
                        { max_threshold: 5000, multiplier: 1.5 }
                    ]
                }
            },
            asn_to_provider: {
                7922: 'foo'
            },
            default_ttl: 20,
            error_ttl: 10,
            min_valid_rtt_score: 5,
            availability_threshold: 90,
            enable_usage_target_min_routing: false,
            enable_usage_target_max_routing: false,
            enable_max_threshold_routing: true,
            usage_strictness: 0.5
        },
        setup: function(i) {
            console.log(i);
            i.request
                .getProbe
                .onCall(0)
                .returns({
                    "foo": {
                        "avail": 100
                    },
                    "bar": {
                        "avail": 100
                    },
                    "baz": {
                        "avail": 100
                    }
                });
            i.request
                .getProbe
                .onCall(1)
                .returns({
                    "foo": {
                        "http_rtt": 200
                    },
                    "bar": {
                        "http_rtt": 200
                    },
                    "baz": {
                        "http_rtt": 200
                    }
                });
            i.request
                .getData
                .onCall(0)
                .returns({});
            Math.random.returns(0);
        },
        verify: function(i) {
            equal(i.response.respond.args[0][0], 'foo', 'Verifying respond provider');
            equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying respond CNAME');
            equal(i.response.setTTL.args[0][0], 10, 'Verifying setTTL');
            equal(i.response.setReasonCode.args[0][0], 'F', 'Verifying setReasonCode');
        }
    }));

    test('commit_target_penalty', test_handle_request({
        settings: {
            providers: {
                'foo': {
                    cname: 'www.foo.com',
                    base_padding: 0,
                    targetMin: 180,
                    targetMax: 200
                },
                'bar': {
                    cname: 'www.bar.com',
                    base_padding: 0,
                    targetMin: 180,
                    targetMax: 200
                },
                'baz': {
                    cname: 'www.baz.com',
                    base_padding: 0
                }
            },
            burstable_cdns: {
                'foo': {
                    bandwidth: [
                        { max_threshold: 10000, multiplier: 1.2 },
                        { max_threshold: 7500, multiplier: 1.3 },
                        { max_threshold: 5000, multiplier: 1.5 }
                    ]
                },
                'bar': {
                    bandwidth: [
                        { max_threshold: 10000, multiplier: 1.2 },
                        { max_threshold: 7500, multiplier: 1.3 },
                        { max_threshold: 5000, multiplier: 1.5 }
                    ]
                }
            },
            asn_to_provider: {
                7922: 'foo'
            },
            default_ttl: 20,
            error_ttl: 10,
            min_valid_rtt_score: 5,
            availability_threshold: 90,
            enable_usage_target_min_routing: true,
            enable_usage_target_max_routing: true,
            enable_max_threshold_routing: false,
            usage_strictness: 0.5
        },
        setup: function(i) {
            console.log(i);
            i.request
                .getProbe
                .onCall(0)
                .returns({
                    "foo": {
                        "avail": 100
                    },
                    "bar": {
                        "avail": 100
                    },
                    "baz": {
                        "avail": 100
                    }
                });
            i.request
                .getProbe
                .onCall(1)
                .returns({
                    "foo": {
                        "http_rtt": 200
                    },
                    "bar": {
                        "http_rtt": 200
                    },
                    "baz": {
                        "http_rtt": 200
                    }
                });
            i.request
                .getData
                .onCall(0)
                .returns({
                    "foo": JSON.stringify({
                        "usage": {
                            "unit": "GB",
                            "value": "10"
                        },
                        "bandwidth": {
                            "unit": "Mbps",
                            "value": "8623.57"
                        }
                    }),
                    "bar": JSON.stringify({
                        "usage": {
                            "unit": "GB",
                            "value": "50"
                        },
                        "bandwidth": {
                            "unit": "Mbps",
                            "value": "6112.31"
                        }
                    })
                });
            Math.random.returns(0);
            sinon.clock.now = 0;
            sinon.clock.tick(1436378332572);
        },
        verify: function(i) {
            equal(i.response.respond.args[0][0], 'foo', 'Verifying respond provider');
            equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying respond CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
            equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying setReasonCode');
        }
    }));

    test('commit_target_penalty_asn_override', test_handle_request({
        settings: {
            providers: {
                'foo': {
                    cname: 'www.foo.com',
                    base_padding: 50,
                    targetMin: 180,
                    targetMax: 200
                },
                'bar': {
                    cname: 'www.bar.com',
                    base_padding: 0,
                    targetMin: 180,
                    targetMax: 200
                },
                'baz': {
                    cname: 'www.baz.com',
                    base_padding: 0
                }
            },
            burstable_cdns: {
                'foo': {
                    bandwidth: [
                        { max_threshold: 10000, multiplier: 1.2 },
                        { max_threshold: 7500, multiplier: 1.3 },
                        { max_threshold: 5000, multiplier: 1.5 }
                    ]
                },
                'bar': {
                    bandwidth: [
                        { max_threshold: 10000, multiplier: 1.2 },
                        { max_threshold: 7500, multiplier: 1.3 },
                        { max_threshold: 5000, multiplier: 1.5 }
                    ]
                }
            },
            asn_to_provider: {
                123: 'foo'
            },
            default_ttl: 20,
            error_ttl: 10,
            min_valid_rtt_score: 5,
            availability_threshold: 90,
            enable_usage_target_min_routing: true,
            enable_usage_target_max_routing: true,
            enable_max_threshold_routing: false,
            usage_strictness: 0.5
        },
        setup: function(i) {
            console.log(i);
            i.request
                .getProbe
                .onCall(0)
                .returns({
                    "foo": {
                        "avail": 100
                    },
                    "bar": {
                        "avail": 100
                    },
                    "baz": {
                        "avail": 100
                    }
                });
            i.request
                .getProbe
                .onCall(1)
                .returns({
                    "foo": {
                        "http_rtt": 200
                    },
                    "bar": {
                        "http_rtt": 200
                    },
                    "baz": {
                        "http_rtt": 200
                    }
                });
            i.request
                .getData
                .onCall(0)
                .returns({
                    "foo": JSON.stringify({
                        "usage": {
                            "unit": "GB",
                            "value": "50"
                        },
                        "bandwidth": {
                            "unit": "Mbps",
                            "value": "8623.57"
                        }
                    }),
                    "bar": JSON.stringify({
                        "usage": {
                            "unit": "GB",
                            "value": "50"
                        },
                        "bandwidth": {
                            "unit": "Mbps",
                            "value": "6112.31"
                        }
                    })
                });
            Math.random.returns(0);
            sinon.clock.now = 0;
            sinon.clock.tick(1436378332572);
            i.request.asn = 123;
        },
        verify: function(i) {
            equal(i.response.respond.args[0][0], 'foo', 'Verifying respond provider');
            equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying respond CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
            equal(i.response.setReasonCode.args[0][0], 'J', 'Verifying setReasonCode');
        }
    }));

}());
