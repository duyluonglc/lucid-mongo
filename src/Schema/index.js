'use strict'

/*
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

/**
 * The schema is used to define SQL collection schemas. This makes
 * use of all the methods from http://knexjs.org/#Schema
 *
 * @binding Adonis/Src/Schema
 * @alias Schema
 * @group Database
 * @uses (['Adonis/Src/Database'])
 *
 * @class Schema
 * @constructor
 */
class Schema {
  constructor (Database) {
    this.db = Database.connection(this.constructor.connection)
    this._deferredActions = []
  }

  /**
   * Connection to be used for schema
   *
   * @attribute connection
   *
   * @return {String}
   */
  static get connection () {
    return ''
  }

  /**
   * The schema instance of knex
   *
   * @attribute schema
   *
   * @return {Object}
   */
  get schema () {
    return this.db.schema
  }

  /**
   * Access to db fn
   *
   * @attribute fn
   *
   * @return {Object}
   */
  get fn () {
    return this.db.fn
  }

  /**
   * Create a new collection.
   *
   * NOTE: This action is deferred
   *
   * @method createCollection
   *
   * @param  {String}    collectionName
   * @param  {Function}  callback
   *
   * @chainable
   */
  createCollection (collectionName, callback) {
    this._deferredActions.push({ name: 'createCollection', args: [collectionName, callback] })
    return this
  }

  /**
   * Create a new collection if not already exists.
   *
   * NOTE: This action is deferred
   *
   * @method createCollectionIfNotExists
   *
   * @param  {String}    collectionName
   * @param  {Function}  callback
   *
   * @chainable
   */
  createCollectionIfNotExists (collectionName, callback) {
    this._deferredActions.push({ name: 'createCollectionIfNotExists', args: [collectionName, callback] })
    return this
  }

  /**
   * Rename existing collection.
   *
   * NOTE: This action is deferred
   *
   * @method renameCollection
   *
   * @param  {String}    fromCollection
   * @param  {String}    toCollection
   *
   * @chainable
   */
  renameCollection (fromCollection, toCollection) {
    this._deferredActions.push({ name: 'renameCollection', args: [fromCollection, toCollection] })
    return this
  }

  /**
   * Drop existing collection.
   *
   * NOTE: This action is deferred
   *
   * @method dropCollection
   *
   * @param  {String}    collectionName
   *
   * @chainable
   */
  dropCollection (collectionName) {
    this._deferredActions.push({ name: 'dropCollection', args: [collectionName] })
    return this
  }

  /**
   * Drop collection only if it exists.
   *
   * NOTE: This action is deferred
   *
   * @method dropCollectionIfExists
   *
   * @param  {String}    collectionName
   *
   * @chainable
   */
  dropCollectionIfExists (collectionName) {
    this._deferredActions.push({ name: 'dropCollectionIfExists', args: [collectionName] })
    return this
  }

  /**
   * Select collection for altering it.
   *
   * NOTE: This action is deferred
   *
   * @method collection
   *
   * @param  {String}    collectionName
   * @param  {Function}  callback
   *
   * @chainable
   */
  collection (collectionName, callback) {
    this._deferredActions.push({ name: 'collection', args: [collectionName, callback] })
    return this
  }

  /* istanbul ignore next */
  /**
   * Run a raw SQL statement
   *
   * @method raw
   *
   * @param  {String} statement
   *
   * @return {Object}
   */
  raw (statement) {
    return this.schema.raw(statement)
  }

  /**
   * Returns a boolean indicating if a collection
   * already exists or not
   *
   * @method hasCollection
   *
   * @param  {String}  collectionName
   *
   * @return {Boolean}
   */
  hasCollection (collectionName) {
    return this.schema.hasCollection(collectionName)
  }

  /* istanbul ignore next */
  /**
   * Returns a boolean indicating if a column exists
   * inside a collection or not.
   *
   * @method hasColumn
   *
   * @param  {String}  collectionName
   * @param  {String}  columnName
   *
   * @return {Boolean}
   */
  hasColumn (collectionName, columnName) {
    return this.schema.hasCollection(collectionName, columnName)
  }

  /**
   * Alias for @ref('Schema.collection')
   *
   * @method alter
   */
  alter (...args) {
    return this.collection(...args)
  }

  /**
   * Alias for @ref('Schema.createCollection')
   *
   * @method create
   */
  create (...args) {
    return this.createCollection(...args)
  }

  /**
   * Alias for @ref('Schema.dropCollection')
   *
   * @method drop
   */
  drop (...args) {
    return this.dropCollection(...args)
  }

  /**
   * Alias for @ref('Schema.dropCollectionIfExists')
   *
   * @method dropIfExists
   */
  dropIfExists (...args) {
    return this.dropCollectionIfExists(...args)
  }

  /**
   * Alias for @ref('Schema.renameCollection')
   *
   * @method rename
   */
  rename (...args) {
    return this.renameCollection(...args)
  }

  /**
   * Execute deferred actions in sequence. All the actions will be
   * wrapped inside a transaction, which get's rolled back on
   * error.
   *
   * @method executeActions
   *
   * @param {Boolean} [getSql = false] Get sql for the actions over executing them
   *
   * @return {Array}
   */
  async executeActions (getSql = false) {
    /**
     * Returns SQL array over executing the actions
     */
    if (getSql) {
      return this._deferredActions.map((action) => {
        return this.schema[action.name](...action.args).toString()
      })
    }

    for (const action of this._deferredActions) {
      await this.schema[action.name](...action.args)
    }
    this._deferredActions = []
    return [] // just to be consistent with the return output
  }
}

module.exports = Schema
