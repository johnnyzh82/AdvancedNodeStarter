const mongoose = require('mongoose');
const redis = require('redis');
const util = require('util');
const keys = require('../config/keys');

const client = redis.createClient(keys.redisUrl);
client.hget = util.promisify(client.hget);

// stores a reference to original exe function
const exec = mongoose.Query.prototype.exec;

mongoose.Query.prototype.cache = function(options = {}) {
    this.useCache = true;
    this.hashKey = JSON.stringify(options.key || '');

    return this; // make it chainable
};

// arrow function messed around `this`
mongoose.Query.prototype.exec = async function() {
    if (!this.useCache) {
        return exec.apply(this, arguments);
    }

    const key = JSON.stringify(Object.assign({}, this.getQuery(), {
        collection: this.mongooseCollection.name
    }));

    // See if we have a value for 'key' in redis
    const cacheValue = await client.hget(this.hashKey, key);

    // If we do, return that
    if (cacheValue) {
        const doc = JSON.parse(cacheValue);
        return Array.isArray(doc) 
            ? doc.map(d => new this.model(d))  // Hydrating arrays
            : new this.model(doc); 
    }

    // Otherwise, issue the query and store the result in redis
    const result = await exec.apply(this, arguments); // execute the original exec function

    client.hmset(this.hashKey, key, JSON.stringify(result), 'EX', 10);

    return result;
};

module.exports = {
    clearHash(hashKey) {
        client.del(JSON.stringify(hashKey));
    }
};
