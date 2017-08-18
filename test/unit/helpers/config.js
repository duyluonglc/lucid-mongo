'use strict'

/**
 * adonis-lucid
 * Copyright(c) 2016-2016 Harminder Virk
 * MIT Licensed
*/
const mongodbConnections = require('./mongodbConnections')
const get = function (key, hasPrefix) {
  if (key === 'database.migrationsCollection') {
    return 'adonis_migrations'
  }

  if (key === 'database.connection') {
    return process.env.DB
  }

  if (key === 'database.mongodb') {
    return hasPrefix ? mongodbConnections.defaultPrefix : mongodbConnections.default
  }

  if (key === 'database.alternateConnection' && process.env.DB === 'mongodb') {
    return mongodbConnections.alternateConnection
  }
}

module.exports = {
  get: function (key) {
    return get(key, false)
  },
  withPrefix: {
    get: function (key) {
      return get(key, true)
    }
  }
}
