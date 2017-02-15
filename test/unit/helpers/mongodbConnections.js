'use strict'

/**
 * adonis-lucid
 * Copyright(c) 2016-2016 Harminder Virk
 * MIT Licensed
*/

module.exports = {
  default: {
    client: 'mongodb',
    connection: {
      host: '127.0.0.1',
      port: 27017,
      user: 'user',
      password: 'test',
      database: 'db_test'
    }
  },

  alternateConnection: {
    client: 'mongodb',
    connection: {
      host: '127.0.0.1',
      port: 27017,
      user: 'user',
      password: 'test',
      database: 'db_test_alternate'
    }
  },

  defaultPrefix: {
    client: 'mongodb',
    connection: {
      host: '127.0.0.1',
      port: 27017,
      user: 'user',
      password: 'test',
      database: 'db_test'
    },
    prefix: 'ad_'
  }
}
