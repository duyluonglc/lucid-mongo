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
      username: 'admin',
      password: '',
      database: 'default'
    }
  },

  alternateConnection: {
    client: 'mongodb',
    connection: {
      username: 'admin',
      password: '',
      database: 'alternate'
    }
  },

  defaultPrefix: {
    client: 'mongodb',
    connection: {
      username: 'admin',
      password: '',
      database: 'default'
    },
    prefix: 'ad_'
  }
}
