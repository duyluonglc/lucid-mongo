'use strict'

/**
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const { MongoClient } = require('mongodb')
const mquery = require('mquery')
const CE = require('../Exceptions')
const util = require('../../lib/util')
const _ = require('lodash')
const mongoUriBuilder = require('mongo-uri-builder')
const mongoUrl = require('mongodb-url')
// const debug = require('debug')('mquery')

const proxyHandler = {
  get (target, name) {
    if (typeof (name) === 'symbol' || name === 'inspect') {
      return target[name]
    }

    if (typeof (target[name]) !== 'undefined') {
      return target[name]
    }

    const queryBuilder = target.query()
    if (typeof (queryBuilder[name]) !== 'function') {
      throw new Error(`Database.${name} is not a function`)
    }

    /**
     * Attach transacting to all the database
     * queries if global transactions are on
     */
    if (target._globalTrx) {
      queryBuilder.transacting(target._globalTrx)
    }

    return queryBuilder[name].bind(queryBuilder)
  }
}

class SchemaBuilder {
  constructor (collection) {
    this.collection = collection
    this.createIndexes = []
    this.dropIndexes = []

    this.increments = () => this
    this.timestamps = () => this
    this.softDeletes = () => this
    this.string = () => this
    this.timestamp = () => this
    this.boolean = () => this
    this.integer = () => this
    this.double = () => this
    this.nullable = () => this
    this.defaultTo = () => this
    this.unsigned = () => this
    this.references = () => this
  }

  index (name, keys, options) {
    if (!name) {
      throw new CE.InvalidArgumentException(`param name is required to create index`)
    }
    if (!keys || !_.size(keys)) {
      throw new CE.InvalidArgumentException(`param keys is required to create index`)
    }
    options = options || {}
    options['name'] = name
    this.createIndexes.push({ keys, options })
  }

  dropIndex (name) {
    this.dropIndexes.push(name)
  }

  async build () {
    for (var i in this.createIndexes) {
      var createIndex = this.createIndexes[i]
      await this.collection.createIndex(createIndex.keys, createIndex.options)
    }
    for (var j in this.dropIndexes) {
      var dropIndex = this.dropIndexes[j]
      await this.collection.dropIndex(dropIndex)
    }
  }
}

/**
 * The database class is a reference to mquery for a single
 * connection. It has couple of extra methods over mquery.
 *
 * Note: You don't instantiate this class directly but instead
 * make use of @ref('DatabaseManager')
 *
 * @class Database
 * @constructor
 * @group Database
 */
class Database {
  constructor (config) {
    if (config.client !== 'mongodb') {
      throw new CE.RuntimeException('invalid connection type')
    }

    if (config.connectionString) {
      this.connectionString = config.connectionString
      const parsedUri = mongoUrl(this.connectionString)
      this.databaseName = parsedUri.dbName || config.connection.database
    } else {
      this.connectionString = mongoUriBuilder(config.connection)
      this.databaseName = config.connection.database
    }

    this.connectionOptions = _.assign({
      useNewUrlParser: true
    }, config.connectionOptions || {})

    this.connection = null
    this.db = null
    this._globalTrx = null
    this.query()
    return new Proxy(this, proxyHandler)
  }

  async connect (collectionName) {
    if (!this.db) {
      this.connection = await MongoClient.connect(this.connectionString, this.connectionOptions)
      this.db = this.connection.db(this.databaseName)
    }
    return Promise.resolve(this.db)
  }

  async getCollection (collectionName) {
    if (!this.db) {
      this.connection = await MongoClient.connect(this.connectionString, this.connectionOptions)
      this.db = this.connection.db(this.databaseName)
    }
    return Promise.resolve(this.db.collection(collectionName))
  }

  collection (collectionName) {
    this.collectionName = collectionName
    this.query()
    return this
  }

  /**
   * The schema builder instance to be used
   * for creating database schema.
   *
   * You should obtain a new schema instance for every
   * database operation and should never use stale
   * instances. For example
   *
   * @example
   * ```js
   * // WRONG
   * const schema = Database.schema
   * schema.createCollection('users')
   * schema.createCollection('profiles')
   * ```
   *
   * ```js
   * // RIGHT
   * Database.schema.createCollection('users')
   * Database.schema.createCollection('profiles')
   * ```
   *
   * @attribute schema
   *
   * @return {Object}
   */
  get schema () {
    return {
      collection: async (collectionName, callback) => {
        // debug('create collection', { collectionName })
        const db = await this.connect()
        const collection = await db.collection(collectionName)
        const schemaBuilder = new SchemaBuilder(collection)
        callback(schemaBuilder)
        return schemaBuilder.build()
      },
      createCollection: async (collectionName, callback) => {
        // debug('create collection', {collectionName})
        const db = await this.connect()
        const collections = await db.listCollections().toArray()
        if (_.find(collections, collection => collection.name === collectionName)) {
          throw new Error('already exists')
        }
        const collection = await db.createCollection(collectionName)
        const schemaBuilder = new SchemaBuilder(collection)
        callback(schemaBuilder)
        return schemaBuilder.build()
      },
      createCollectionIfNotExists: async (collectionName, callback) => {
        // debug('create collection if not exists', { collectionName })
        const db = await this.connect()
        const collections = await db.listCollections().toArray()
        if (!_.find(collections, collection => collection.name === collectionName)) {
          const collection = await db.createCollection(collectionName)
          const schemaBuilder = new SchemaBuilder(collection)
          callback(schemaBuilder)
          return schemaBuilder.build()
        }
      },
      dropCollection: async (collectionName) => {
        // debug('drop collection', { collectionName })
        const db = await this.connect()
        return db.dropCollection(collectionName)
      },
      dropCollectionIfExists: async (collectionName) => {
        // debug('drop collection if not exists', { collectionName })
        const db = await this.connect()
        const collections = await db.listCollections().toArray()
        if (_.find(collections, collection => collection.name === collectionName)) {
          return db.dropCollection(collectionName)
        }
      },
      renameCollection: async (collectionName, target) => {
        // debug('rename collection', { collectionName, target })
        const db = await this.connect()
        return db.collection(collectionName).rename(target)
      },
      hasCollection: async (collectionName) => {
        const db = await this.connect()
        const collections = await db.listCollections().toArray()
        return !!_.find(collections, collection => collection.name === collectionName)
      }
    }
  }

  /**
   * sort
   *
   * @param {any} arg
   * @returns
   * @memberof Database
   */
  sort (...arg) {
    this.queryBuilder.sort(...arg)
    return this
  }

  /**
   * limit
   *
   * @param {any} arg
   * @returns
   * @memberof Database
   */
  limit (...arg) {
    this.queryBuilder.limit(...arg)
    return this
  }

  /**
   * where
   *
   * @param {any} arg
   * @returns
   * @memberof Database
   */
  skip (...arg) {
    this.queryBuilder.skip(...arg)
    return this
  }

  /**
   * select
   *
   * @param {any} arg
   * @returns
   * @memberof Database
   */
  select (...arg) {
    this.queryBuilder.select(...arg)
    return this
  }

  /**
   * Return a new instance of query builder
   *
   * @method query
   *
   * @return {Object}
   */
  query () {
    this.queryBuilder = mquery()
    this.replaceMethods()
    return this.queryBuilder
  }

  /**
   * fn
   *
   * @method fn
   *
   * @return {Object}
   */
  get fn () {
    return {
      remove: (path) => console.log('remove', path),
      now: () => new Date()
    }
  }

  /**
   * get Conditions
   *
   * @readonly
   * @memberof Database
   */
  get conditions () {
    return this.queryBuilder._conditions
  }

  /**
   * Clone
   *
   * @memberof Database
   */
  clone () {
    return _.cloneDeep(this.queryBuilder)
  }

  /**
   * Closes the database connection. No more queries
   * can be made after this.
   *
   * @method close
   *
   * @return {Promise}
   */
  close () {
    return this.connection.close()
  }

  /**
   * Return a collection
   *
   * @method find
   *
   * @return {Object}
   */
  async find () {
    const connection = await this.connect()
    const collection = connection.collection(this.collectionName)
    return this.queryBuilder.collection(collection).find()
  }

  /**
   * Return a document
   *
   * @method findOne
   *
   * @return {Object}
   */
  async findOne () {
    const connection = await this.connect()
    const collection = connection.collection(this.collectionName)
    return this.queryBuilder.collection(collection).findOne()
  }

  /**
   * Return a document
   *
   * @method first
   *
   * @return {Object}
   */
  async first () {
    return this.findOne()
  }

  /**
   * Return a document
   *
   * @method pluck
   *
   * @return {Object}
   */
  async pluck (field) {
    this.queryBuilder.select(field)
    const result = await this.find()
    return _.map(result, field)
  }

  /**
   * Update collections
   *
   * @method update
   *
   * @return {Object}
   */
  async update () {
    const connection = await this.connect()
    const collection = connection.collection(this.collectionName)
    return this.queryBuilder.collection(collection).update(...arguments)
  }

  /**
   * Remove collections
   *
   * @method delete
   *
   * @return {Object}
   */
  async delete () {
    const connection = await this.connect()
    const collection = connection.collection(this.collectionName)
    return this.queryBuilder.collection(collection).remove(...arguments)
  }

  /**
   * Query pagination
   *
   * @method paginate
   *
   * @return {Object}
   */
  async paginate (page, limit) {
    const connection = await this.connect()
    const collection = connection.collection(this.collectionName)
    const countByQuery = await this.aggregate('count')
    const rows = await this.queryBuilder.collection(collection).limit(limit).skip((page || 1) * limit).find()
    const result = util.makePaginateMeta(countByQuery || 0, page, limit)
    result.data = rows
    return result
  }

  /**
   * Insert document
   *
   * @method insert
   *
   * @return {Object}
   */
  async insert (row) {
    const connection = await this.connect()
    const collection = connection.collection(this.collectionName)
    return collection.insert(row)
  }

  /**
   * @method count
   *
   * @param {any} args
   * @returns {Number|Array}
   * @memberof Database
   */
  count (...args) {
    return this.aggregate('count', null, ...args)
  }

  /**
   * @method count
   *
   * @param {any} args
   * @returns {Number|Array}
   * @memberof Database
   */
  sum (...args) {
    return this.aggregate('sum', ...args)
  }

  /**
   * @method count
   *
   * @param {any} args
   * @returns {Number|Array}
   * @memberof Database
   */
  avg (...args) {
    return this.aggregate('avg', ...args)
  }

  /**
   * @method count
   *
   * @param {any} args
   * @returns {Number|Array}
   * @memberof Database
   */
  max (...args) {
    return this.aggregate('max', ...args)
  }

  /**
   * @method count
   *
   * @param {any} args
   * @returns {Number|Array}
   * @memberof Database
   */
  min (...args) {
    return this.aggregate('min', ...args)
  }

  /**
   * Aggregation
   *
   * @method aggregate
   *
   * @return {Object}
   */
  async aggregate (aggregator, key, groupBy) {
    const $match = this.conditions
    const $group = { _id: '$' + groupBy }
    switch (aggregator) {
      case 'count':
        $group[aggregator] = { $sum: 1 }
        break
      case 'max':
        $group[aggregator] = { $max: '$' + key }
        break
      case 'min':
        $group[aggregator] = { $min: '$' + key }
        break
      case 'sum':
        $group[aggregator] = { $sum: '$' + key }
        break
      case 'avg':
        $group[aggregator] = { $avg: '$' + key }
        break
      default:
        break
    }
    // debug('count', this.collectionName, $match, $group)
    const connection = await this.connect()
    const collection = connection.collection(this.collectionName)
    const result = await collection.aggregate([{ $match }, { $group }]).toArray()
    return groupBy ? result : !_.isEmpty(result) ? result[0][aggregator] : null
  }

  /**
   * Query distinct
   *
   * @method distinct
   *
   * @return {Object}
   */
  async distinct () {
    const connection = await this.connect()
    const collection = connection.collection(this.collectionName)
    return this.queryBuilder.collection(collection).distinct(...arguments)
  }

  /**
   * Condition Methods
   *
   * @readonly
   * @static
   * @memberof QueryBuilder
   */
  static get conditionMethods () {
    return [
      'eq',
      'ne',
      'gt',
      'gte',
      'lt',
      'lte',
      'in',
      'nin',
      'all',
      'near',
      'maxDistance',
      'mod',
      'includes',
      'polygon',
      'elemMatch',
      'geometry',
      'intersects'
    ]
  }

  /**
   * replace condition methods of mquery
   *
   * @memberof QueryBuilder
   */
  replaceMethods () {
    for (const name of this.constructor.conditionMethods) {
      const originMethod = this.queryBuilder[name]
      this.queryBuilder[name] = (param) => {
        originMethod.apply(this.queryBuilder, [param])
        return this
      }
    }
  }

  /**
   * Replace where method
   *
   * @returns {this}
   * @memberof QueryBuilder
   */
  where () {
    if (arguments.length === 3) {
      switch (arguments[1]) {
        case '=':
          this.queryBuilder.where(arguments[0]).eq(arguments[2])
          break
        case '>':
          this.queryBuilder.where(arguments[0]).gt(arguments[2])
          break
        case '>=':
          this.queryBuilder.where(arguments[0]).gte(arguments[2])
          break
        case '<':
          this.queryBuilder.where(arguments[0]).lt(arguments[2])
          break
        case '<=':
          this.queryBuilder.where(arguments[0]).lte(arguments[2])
          break
        case '<>':
          this.queryBuilder.where(arguments[0]).ne(arguments[2])
          break
        default:
          throw new CE.InvalidArgumentException(`Method "$${arguments[1]}" is not support by query builder`)
      }
    } else if (arguments.length === 2 || _.isPlainObject(arguments[0])) {
      this.queryBuilder.where(...arguments)
    } else {
      return this.queryBuilder.where(...arguments)
    }
    return this
  }
}

module.exports = Database
