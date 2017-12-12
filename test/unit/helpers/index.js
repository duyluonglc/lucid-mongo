'use strict'

const _ = require('lodash')

module.exports = {
  formatQuery (query, connection) {
    return query
  },

  addReturningStatement (query, field) {
    return query
  },

  formatBindings (bindings) {
    return bindings
  },

  formatNumber (num) {
    return num
  },

  formatBoolean (bool) {
    return bool
  },

  getConfig () {
    if (process.env.DB === 'mongodb') {
      return _.cloneDeep({
        client: 'mongodb',
        connection: {
          host: process.env.DB_HOST || '127.0.0.1',
          port: process.env.DB_PORT || '27017',
          username: process.env.DB_USER || 'admin',
          password: process.env.DB_PASSWORD || '',
          database: process.env.DB_NAME || 'test'
        }
      })
    }
  },

  createCollections (db) {
    return Promise.all([
      db.schema.createCollection('users', function (collection) {
        collection.increments()
        collection.integer('vid')
        collection.integer('country_id')
        collection.string('username')
        collection.timestamps()
        collection.timestamp('login_at')
        collection.timestamp('deleted_at').nullable()
      }),
      db.schema.createCollection('cars', function (collection) {
        collection.increments()
        collection.integer('user_id')
        collection.string('name')
        collection.string('model')
        collection.timestamps()
        collection.timestamp('deleted_at').nullable()
      }),
      db.schema.createCollection('parts', function (collection) {
        collection.increments()
        collection.integer('car_id')
        collection.string('part_name')
        collection.timestamps()
        collection.timestamp('deleted_at').nullable()
      }),
      db.schema.createCollection('profiles', function (collection) {
        collection.increments()
        collection.integer('user_id')
        collection.integer('country_id')
        collection.string('profile_name')
        collection.integer('likes')
        collection.timestamps()
        collection.timestamp('deleted_at').nullable()
      }),
      db.schema.createCollection('pictures', function (collection) {
        collection.increments()
        collection.integer('profile_id')
        collection.string('storage_path')
        collection.timestamps()
        collection.timestamp('deleted_at').nullable()
      }),
      db.schema.createCollection('identities', function (collection) {
        collection.increments()
        collection.integer('user_id')
        collection.boolean('is_active').defaultTo(true)
        collection.timestamps()
        collection.timestamp('deleted_at').nullable()
      }),
      db.schema.createCollection('my_users', function (collection) {
        collection.integer('uuid')
        collection.string('username')
        collection.timestamps()
        collection.timestamp('deleted_at').nullable()
      }),
      db.schema.createCollection('posts', function (collection) {
        collection.increments('id')
        collection.integer('user_id')
        collection.string('title')
        collection.timestamps()
        collection.timestamp('deleted_at').nullable()
      }),
      db.schema.createCollection('post_user', function (collection) {
        collection.increments('id')
        collection.integer('post_id')
        collection.integer('user_id')
        collection.boolean('is_published')
        collection.timestamps()
        collection.timestamp('deleted_at').nullable()
      }),
      db.schema.createCollection('countries', function (collection) {
        collection.increments('id')
        collection.string('name')
        collection.timestamps()
        collection.timestamp('deleted_at').nullable()
      }),
      db.schema.createCollection('categories', function (collection) {
        collection.increments('id')
        collection.string('name')
        collection.timestamps()
        collection.timestamp('deleted_at').nullable()
      }),
      db.schema.createCollection('sections', function (collection) {
        collection.increments('id')
        collection.integer('category_id')
        collection.string('name')
        collection.boolean('is_active')
        collection.timestamps()
        collection.timestamp('deleted_at').nullable()
      }),
      db.schema.createCollection('post_section', function (collection) {
        collection.increments('id')
        collection.integer('post_id')
        collection.integer('section_id')
        collection.timestamps()
        collection.timestamp('deleted_at').nullable()
      })
    ])
  },

  dropCollections (db) {
    return Promise.all([
      db.schema.dropCollectionIfExists('users'),
      db.schema.dropCollectionIfExists('cars'),
      db.schema.dropCollectionIfExists('parts'),
      db.schema.dropCollectionIfExists('profiles'),
      db.schema.dropCollectionIfExists('pictures'),
      db.schema.dropCollectionIfExists('identities'),
      db.schema.dropCollectionIfExists('my_users'),
      db.schema.dropCollectionIfExists('posts'),
      db.schema.dropCollectionIfExists('post_user'),
      db.schema.dropCollectionIfExists('countries'),
      db.schema.dropCollectionIfExists('categories'),
      db.schema.dropCollectionIfExists('sections'),
      db.schema.dropCollectionIfExists('post_section')
    ])
  },

  sleep (time) {
    return new Promise((resolve) => {
      setTimeout(resolve, time)
    })
  }
}
