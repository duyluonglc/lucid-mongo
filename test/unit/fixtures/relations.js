'use strict'

/**
 * adonis-lucid
 * Copyright(c) 2016-2016 Harminder Virk
 * MIT Licensed
*/

const bluebird = require('bluebird')
const files = require('./files')

module.exports = {
  setupCollections: function (knex) {
    const collections = [
      knex.schema.createCollection('suppliers', function (collection) {
        collection.increments()
        collection.string('name')
        collection.timestamps()
        collection.timestamp('deleted_at').nullable()
      }),
      knex.schema.createCollection('accounts', function (collection) {
        collection.increments()
        collection.integer('supplier_id')
        collection.integer('points').defaultTo(0)
        collection.string('name')
        collection.timestamps()
        collection.timestamp('deleted_at').nullable()
      }),
      knex.schema.createCollection('profiles', function (collection) {
        collection.increments()
        collection.integer('account_id')
        collection.boolean('is_primary')
        collection.string('profile_name')
        collection.timestamps()
        collection.timestamp('deleted_at').nullable()
      }),
      knex.schema.createCollection('head_offices', function (collection) {
        collection.increments()
        collection.integer('supplier_id')
        collection.string('location')
        collection.timestamps()
        collection.timestamp('deleted_at').nullable()
      }),
      knex.schema.createCollection('all_suppliers', function (collection) {
        collection.increments()
        collection.string('regid').unique()
        collection.string('name')
        collection.timestamps()
        collection.timestamp('deleted_at').nullable()
      }),
      knex.schema.createCollection('all_accounts', function (collection) {
        collection.increments()
        collection.string('supplier_regid')
        collection.string('name')
        collection.timestamps()
        collection.timestamp('deleted_at').nullable()
      }),
      knex.schema.createCollection('users', function (collection) {
        collection.increments()
        collection.string('username')
        collection.integer('manager_id')
        collection.string('type')
        collection.timestamps()
        collection.timestamp('deleted_at').nullable()
      }),
      knex.schema.createCollection('posts', function (collection) {
        collection.increments()
        collection.string('title')
        collection.string('body')
        collection.timestamps()
        collection.timestamp('deleted_at').nullable()
      }),
      knex.schema.createCollection('comments', function (collection) {
        collection.increments()
        collection.integer('post_id')
        collection.string('body')
        collection.integer('likes').defaultTo(0)
        collection.timestamps()
        collection.timestamp('deleted_at').nullable()
      }),
      knex.schema.createCollection('replies', function (collection) {
        collection.increments()
        collection.integer('comment_id')
        collection.string('body')
        collection.timestamps()
        collection.timestamp('deleted_at').nullable()
      }),
      knex.schema.createCollection('students', function (collection) {
        collection.increments()
        collection.string('name')
        collection.timestamps()
        collection.timestamp('deleted_at').nullable()
      }),
      knex.schema.createCollection('courses', function (collection) {
        collection.increments()
        collection.string('title')
        collection.integer('weightage')
        collection.timestamps()
        collection.timestamp('deleted_at').nullable()
      }),
      knex.schema.createCollection('subjects', function (collection) {
        collection.increments()
        collection.string('title')
        collection.integer('course_id')
        collection.timestamps()
        collection.timestamp('deleted_at').nullable()
      }),
      knex.schema.createCollection('course_student', function (collection) {
        collection.integer('student_id')
        collection.integer('course_id')
        collection.boolean('is_enrolled')
        collection.integer('lessons_done')
        collection.timestamps()
      }),
      knex.schema.createCollection('authors', function (collection) {
        collection.increments()
        collection.integer('country_id')
        collection.string('name')
        collection.timestamps()
        collection.timestamp('deleted_at').nullable()
      }),
      knex.schema.createCollection('publications', function (collection) {
        collection.increments()
        collection.integer('author_id')
        collection.string('title')
        collection.string('body')
        collection.integer('amount')
        collection.timestamps()
        collection.timestamp('deleted_at').nullable()
      }),
      knex.schema.createCollection('countries', function (collection) {
        collection.increments()
        collection.string('name')
        collection.string('locale')
        collection.timestamps()
        collection.timestamp('deleted_at').nullable()
      })
    ]
    return bluebird.all(collections)
  },
  dropCollections: function (knex) {
    const collections = [
      knex.schema.dropCollection('accounts'),
      knex.schema.dropCollection('head_offices'),
      knex.schema.dropCollection('profiles'),
      knex.schema.dropCollection('suppliers'),
      knex.schema.dropCollection('all_accounts'),
      knex.schema.dropCollection('all_suppliers'),
      knex.schema.dropCollection('users'),
      knex.schema.dropCollection('posts'),
      knex.schema.dropCollection('comments'),
      knex.schema.dropCollection('replies'),
      knex.schema.dropCollection('courses'),
      knex.schema.dropCollection('students'),
      knex.schema.dropCollection('subjects'),
      knex.schema.dropCollection('course_student'),
      knex.schema.dropCollection('authors'),
      knex.schema.dropCollection('publications'),
      knex.schema.dropCollection('countries')
    ]
    return bluebird.all(collections)
  },
  createRecords: function * (knex, collection, values) {
    if (collection === 'course_student') {
      return yield knex.collection(collection).insert(values)
    }
    return yield knex.collection(collection).insert(values).returning('id')
  },
  truncate: function * (knex, collection) {
    yield knex.collection(collection).truncate()
  },
  up: function * (knex) {
    yield files.createDir()
    yield this.setupCollections(knex)
  },
  down: function * (knex) {
    yield this.dropCollections(knex)
  }
}
