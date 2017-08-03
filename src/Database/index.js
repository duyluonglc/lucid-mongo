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
// const _ = require('lodash')

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
    const security = (config.connection.user && config.connection.password)
      ? `${config.connection.user}:${config.connection.password}@`
      : (config.connection.user ? `${config.connection.user}@` : '')
    this.connectionString = `mongodb://${security}${config.connection.host}:${config.connection.port}/${config.connection.database}`
    this.mquery = mquery()
    this.connection = null
    this._globalTrx = null
    this.collectionName = null
    return new Proxy(this, proxyHandler)
  }

  async connect () {
    if (!this.connection) {
      this.connection = await MongoClient.connect(this.connectionString)
    }
    return Promise.resolve(this.connection)
  }

  collection (collectionName) {
    // this.query().collection(this.connection.collection(collectionName))
    this.collectionName = collectionName
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
   * schema.createTable('users')
   * schema.createTable('profiles')
   * ```
   *
   * ```js
   * // RIGHT
   * Database.schema.createTable('users')
   * Database.schema.createTable('profiles')
   * ```
   *
   * @attribute schema
   *
   * @return {Object}
   */
  get schema () {
    return this.mquery.schema
  }

  /**
   * Returns the fn from mquery instance
   *
   * @method fn
   *
   * @return {Object}
   */
  get fn () {
    return this.mquery.fn
  }

  /**
   * Method to construct raw database queries.
   *
   * @method raw
   *
   * @param  {...Spread} args
   *
   * @return {String}
   */
  raw (...args) {
    return this.mquery.raw(...args)
  }

  /**
   * Returns a trx object to be used for running queries
   * under transaction.
   *
   * @method beginTransaction
   * @async
   *
   * @return {Object}
   *
   * @example
   * ```js
   * const trx = await Database.beginTransaction()
   * await trx
   *   .table('users')
   *   .insert({ username: 'virk' })
   *
   * // or
   * Database
   *   .table('users')
   *   .transacting(trx)
   *   .insert({ username: 'virk' })
   * ```
   */
  beginTransaction () {
    return new Promise((resolve, reject) => {
      this
        .mquery
        .transaction(function (trx) {
          resolve(trx)
        }).catch(() => { })
    })
  }

  /**
   * Starts a global transaction, where all query builder
   * methods will be part of transaction automatically.
   *
   * Note: You must not use it in real world apart from when
   * writing tests.
   *
   * @method beginGlobalTransaction
   * @async
   *
   * @return {void}
   */
  async beginGlobalTransaction () {
    this._globalTrx = await this.beginTransaction()
  }

  /**
   * Rollbacks global transaction.
   *
   * @method rollbackGlobalTransaction
   *
   * @return {void}
   */
  rollbackGlobalTransaction () {
    this._globalTrx.rollback()
    this._globalTrx = null
  }

  /**
   * Commits global transaction.
   *
   * @method commitGlobalTransaction
   *
   * @return {void}
   */
  commitGlobalTransaction () {
    this._globalTrx.commit()
    this._globalTrx = null
  }

  /**
   * Return a new instance of query builder
   *
   * @method query
   *
   * @return {Object}
   */
  query () {
    return this.mquery
  }

  /**
   *
   * @method query
   *
   * @return {Object}
   */
  on (event, callback) {

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
    return this.mquery.close()
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
    return this.mquery.collection(collection).find()
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
    return this.mquery.collection(collection).findOne()
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
   * Update collections
   *
   * @method update
   *
   * @return {Object}
   */
  async update () {
    const connection = await this.connect()
    const collection = connection.collection(this.collectionName)
    return this.mquery.collection(collection).update(...arguments)
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
    return this.mquery.collection(collection).remove(...arguments)
  }

  /**
   * Count collections
   *
   * @method count
   *
   * @return {Object}
   */
  async count () {
    const connection = await this.connect()
    const collection = connection.collection(this.collectionName)
    return this.mquery.collection(collection).count(...arguments)
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
    return this.mquery.collection(collection).limit(limit).skip((page || 1) * limit).find()
  }

  /**
   * Insert document
   *
   * @method insert
   *
   * @return {Object}
   */
  async insert () {
    const connection = await this.connect()
    const collection = connection.collection(this.collectionName)
    return collection.insert(...arguments)
  }

  /**
   * Aggregation
   *
   * @method paginate
   *
   * @return {Object}
   */
  async aggregate () {
    const connection = await this.connect()
    const collection = connection.collection(this.collectionName)
    return collection.aggregate(...arguments)
  }
}

module.exports = Database
