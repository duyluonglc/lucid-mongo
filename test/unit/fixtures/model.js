'use strict'

const bluebird = require('bluebird')

module.exports = {
  up: function (knex) {
    const collections = [
      knex.schema.createCollection('users', function (collection) {
        collection.increments()
        collection.string('uuid').defaultTo(null)
        collection.string('username')
        collection.string('firstname')
        collection.string('lastname')
        collection.enum('status', ['active', 'suspended']).defaultTo('active')
        collection.timestamps()
        collection.timestamp('deleted_at').nullable()
      }),
      knex.schema.createCollection('zombies', function (collection) {
        collection.increments('zombie_id')
        collection.string('username')
        collection.string('firstname')
        collection.string('lastname')
        collection.timestamps()
        collection.timestamp('deleted_at').nullable()
      }),
      knex.schema.createCollection('accounts', function (collection) {
        collection.increments()
        collection.string('account_name')
        collection.timestamps()
        collection.timestamp('deleted_at').nullable()
      }),
      knex.schema.createCollection('profiles', function (collection) {
        collection.increments()
        collection.integer('user_id')
        collection.string('display_name')
        collection.timestamps()
        collection.timestamp('deleted_at').nullable()
      }),
      knex.schema.createCollection('cars', function (collection) {
        collection.increments()
        collection.integer('user_id')
        collection.string('car_name')
        collection.timestamps()
        collection.timestamp('deleted_at').nullable()
      }),
      knex.schema.createCollection('keys', function (collection) {
        collection.increments()
        collection.integer('car_id')
        collection.string('key_number')
        collection.timestamps()
        collection.timestamp('deleted_at').nullable()
      })
    ]
    return bluebird.all(collections)
  },

  down: function (knex) {
    const dropCollections = [
      knex.schema.dropCollection('users'),
      knex.schema.dropCollection('zombies'),
      knex.schema.dropCollection('accounts'),
      knex.schema.dropCollection('profiles'),
      knex.schema.dropCollection('cars'),
      knex.schema.dropCollection('keys')
    ]
    return bluebird.all(dropCollections)
  },

  truncate: function (knex) {
    const truncateCollections = [
      knex.collection('users').truncate(),
      knex.collection('zombies').truncate(),
      knex.collection('accounts').truncate(),
      knex.collection('profiles').truncate(),
      knex.collection('cars').truncate(),
      knex.collection('keys').truncate()
    ]
    return bluebird.all(truncateCollections)
  },

  setupAccount: function (knex) {
    return knex.collection('accounts').insert({account_name: 'sales', created_at: new Date(), updated_at: new Date()})
  },

  setupProfile: function (knex) {
    return knex.collection('profiles').insert({user_id: 1, display_name: 'virk', created_at: new Date(), updated_at: new Date()})
  },

  setupCar: function (knex) {
    return knex.collection('cars').insert({user_id: 1, car_name: 'audi a6', created_at: new Date(), updated_at: new Date()})
  },

  setupCarKey: function (knex) {
    return knex.collection('keys').insert({car_id: 1, key_number: '98010291222', created_at: new Date(), updated_at: new Date()})
  },

  setupUser: function (knex) {
    return knex.collection('users').insert({
      firstname: 'aman',
      lastname: 'virk',
      username: 'avirk',
      created_at: new Date(),
      updated_at: new Date()
    })
  }

}
