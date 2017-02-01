/**
 * Select randomly from a set of weighted providers while taking Sonar scores
 * into account.
 */
var handler = new OpenmixApplication({
    // The array of all possible responses. The key, e.g. 'provider1', is the
    // label for the platform. The value, e.g. 'cname1.foo.com' is the CNAME
    // to hand back when that platform is selected.

    // Round Robin weight (these are relative to one another for purposes of
    // weighted random selection, but it may be useful to think of them as
    // percentages (i.e. they add up to 100).
    providers: {
        'provider1': {
            cname: 'cname1.foo.com',
            weight: 50
        },
        'provider2': {
            cname: 'cname2.foo.com',
            weight: 30
        },
        'provider3': {
            cname: 'cname3.foo.com',
            weight: 20
        }
    },

    // The DNS TTL to be applied to DNS responses in seconds.
    default_ttl: 20,
    // To enforce a Sonar health-check, set this threshold value to 1. To ignore the health-check, set this value to 0.
    fusion_sonar_threshold: 1
});

function init(config) {
    'use strict';
    handler.do_init(config);
}

function onRequest(request, response) {
    'use strict';
    handler.handle_request(request, response);
}

/** @constructor */
function OpenmixApplication(settings) {
    'use strict';

    var aliases = settings.providers === undefined ? [] : Object.keys(settings.providers);

    /**
     * @param {OpenmixConfiguration} config
     */
    this.do_init = function(config) {
        var i = aliases.length;

        // Register the providers that will be selected from
        while (i --) {
            config.requireProvider(aliases[i]);
        }

    };

    /**
     * @param {OpenmixRequest} request
     * @param {OpenmixResponse} response
     */
    this.handle_request = function(request, response) {
        //get the sonar data
        var /** @type { !Object.<string, { health_score: { value:string }, availability_override:string}> } */
            dataFusion = parseFusionData(request.getData('fusion')),
            dataFusionAliases,
            allReasons,
            decisionProvider,
            candidates,
            candidateAliases,
            decisionReason = '',
            totalWeight = 0;

        allReasons = {
            routed_randomly_by_weight: 'A',
            most_available_platform_chosen: 'B',
            choose_random_platform: 'C'
        };

        /**
         * @param candidate
         * @param key
         */
        function filterFusionSonar(candidate, key) {
            return dataFusion[key] !== undefined && dataFusion[key].health_score !== undefined && dataFusion[key].health_score.value >= settings.fusion_sonar_threshold;
        }

        /**
         * @param candidates
         */
        function getTotalWeight(candidates) {
            var keys = Object.keys(candidates),
                i = keys.length,
                total = 0,
                weight;
            while (i --) {
                weight = settings.providers[keys[i]].weight;

                if (weight !== undefined) {
                    total += weight;
                }
            }
            return total;
        }

        /**
         * @param candidates
         * @param max
         */
        function getWeightedRandom(candidates, max) {
            var random = Math.floor(Math.random() * max),
                mark = 0,
                keys = Object.keys(candidates),
                i = keys.length,
                key, weight;
            while (i --) {
                key = keys[i];
                weight  = settings.providers[key].weight;

                if (weight !== undefined) {
                    mark += weight;
                    if (random < mark) {
                        return key;
                    }
                }
            }
        }

        if (Object.keys(dataFusion).length > 0) {
            dataFusionAliases = Object.keys(dataFusion);
            //check if "Big Red Button" isn't activated
            if (dataFusion[dataFusionAliases[0]].availability_override === undefined) {
                // filter candidates by  fusion sonar threshold,
                // remove all the provider with fusion sonar data <= than settings.fusion_sonar_threshold
                candidates = filterObject(dataFusion, filterFusionSonar);
                candidateAliases = Object.keys(candidates);

                if (candidateAliases.length > 0) {
                    if (candidateAliases.length === 1) {
                        decisionProvider = candidateAliases[0];
                        decisionReason = allReasons.most_available_platform_chosen;
                    }
                    else {
                        // Respond with a weighted random selection
                        totalWeight = getTotalWeight(candidates);
                        if (totalWeight > 0) {
                            decisionProvider = getWeightedRandom(candidates, totalWeight);
                            decisionReason = allReasons.routed_randomly_by_weight;
                        }
                        // Respond with most available from sonar
                        else {
                            decisionProvider = getHighest(candidates);
                            decisionReason = allReasons.most_available_platform_chosen;
                        }
                    }
                }
            }
        }

        if (decisionProvider === undefined) {
            // If we get here, something went wrong. Select randomly to avoid fallback.
            decisionProvider = aliases[Math.floor(Math.random() * aliases.length)];
            decisionReason = allReasons.choose_random_platform;
        }

        response.respond(decisionProvider, settings.providers[decisionProvider].cname);
        response.setTTL(settings.default_ttl);
        response.setReasonCode(decisionReason);
    };

    /**
     * @param {!Object} object
     * @param {Function} filter
     */
    function filterObject(object, filter) {
        var keys = Object.keys(object),
            i = keys.length,
            key;
        while (i --) {
            key = keys[i];

            if (!filter(object[key], key)) {
                delete object[key];
            }
        }
        return object;
    }

    /**
     * @param {!Object} source
     */
    function getHighest(source) {
        var keys = Object.keys(source),
            i = keys.length,
            key,
            candidate,
            max = -Infinity,
            value;
        while (i --) {
            key = keys[i];
            value = source[key].health_score.value;

            if (value > max) {
                candidate = key;
                max = value;
            }
        }
        return candidate;
    }

    /**
     * @param {!Object} data
     */
    function parseFusionData(data) {
        var keys = Object.keys(data),
            i = keys.length,
            key;
        while (i --) {
            key = keys[i];
            try {
                data[key] = JSON.parse(data[key]);
            }
            catch (e) {
                delete data[key];
            }
        }
        return data;
    }
}