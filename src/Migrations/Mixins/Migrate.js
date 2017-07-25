'use strict'

/**
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const _ = require('lodash')
const CatLog = require('cat-log')
const cf = require('co-functional')
const co = require('co')
const CE = require('../../Exceptions')
const logger = new CatLog('adonis:lucid')
const mquery = require('mquery')
const Migrate = exports = module.exports = {}

/**
 * migrates a class by calling up or down
 * method on it.
 *
 * @method _translateActions
 *
 * @param  {Object}      schema
 * @param  {String}      direction
 * @return {void}
 *
 * @private
 */
Migrate._translateActions = function (schemaInstance, direction) {
  this._decorateSchema(schemaInstance)
  if (!schemaInstance[direction]) {
    logger.warn('skipping migration as %s is not defined', direction)
    return
  }
  schemaInstance[direction]()
  return _.map(schemaInstance.actions, (props) => {
    return this._callSchemaActions(props, schemaInstance.constructor.connection)
  })
}

/**
 * this method will loop through all the schema actions
 * defined inside a single method (up/down).
 *
 * @method _callSchemaActions
 *
 * @param  {Array}           props
 * @param  {Object}          connection
 * @param  {String}          action
 *
 * @private
 */
Migrate._callSchemaActions = function (definition, connection) {
  /**
   * Custom check to allow access the database provider and
   * do custom stuff with support for co-routines.
   */
  if (definition.action === 'db') {
    return co.wrap(function * () {
      return yield definition.callback(this.database)
    }.bind(this))
  }

  /**
   * co.wrap returns a function which returns a promise, so we
   * need to wrap schema method inside a function to keep
   * the API collection.
   */
  return (function () {
    // const builder = yield this.database.connection(connection)
    return this.database.schema[definition.action](definition.key, this._wrapSchemaCallback(definition.callback))
  }.bind(this))
}

/**
 * calls the schema methods callback, while executing the callback
 * it will decorate the collection object passed to the callback.
 *
 * @method _wrapSchemaCallback
 *
 * @param  {Function}      callback
 *
 * @private
 */
Migrate._wrapSchemaCallback = function (callback) {
  if (typeof (callback) !== 'function') {
    return callback
  }
  const self = this
  return function (collection) {
    self._decorateCollection(collection)
    callback(collection)
  }
}

/**
 * adds custom methods to schema instance.
 *
 * @method _decorateSchema
 *
 * @param  {Object}        schemaInstance
 *
 * @private
 */
Migrate._decorateSchema = function (schemaInstance) {
  schemaInstance.fn = this.database.fn
  schemaInstance.schema = this.database.schema
}

/**
 * decorates schema callback collection object by adding
 * new methods on it.
 *
 * @method _decorateCollection
 *
 * @param  {Object}       collection
 *
 * @private
 */
Migrate._decorateCollection = function (collection) {
  collection.softDeletes = function () {
    collection.dateTime('deleted_at').nullable()
  }
  collection.nullableTimestamps = function () {
    collection.dateTime('created_at').nullable()
    collection.dateTime('updated_at').nullable()
  }
}

/**
 * creates migrations collection if it does not exists.
 * creating collection needs to be first step
 *
 * @method _makeMigrationsCollection
 *
 * @return {Object}
 *
 * @private
 */
Migrate._makeMigrationsCollection = function * () {
  return yield this.database.schema
    .createCollectionIfNotExists(this.migrationsCollection, function (collection) {
      collection.increments('id')
      collection.string('name')
      collection.integer('batch')
      collection.timestamp('migration_time')
    })
}

/**
 * calls the migrations queue in sequence
 *
 * @method _executeMigrations
 *
 * @return {Array}
 *
 * @private
 */
Migrate._executeMigrations = function * (migrations, direction, batchNumber) {
  const self = this
  yield cf.forEachSerial(function * (migration) {
    return yield self._executeActions(_.flatten(migration.actions), migration.file, direction, batchNumber)
  }, migrations)
}

/**
 * executes an array of actions defined in a single file in sequence
 *
 * @param {Arrau} actions
 * @param {String} file
 * @param {String} direction
 * @param {Number} batchNumber
 *
 * @private
 */
Migrate._executeActions = function * (actions, file, direction, batchNumber) {
  yield cf.forEachSerial(function * (action) {
    return yield action()
  }, _.flatten(actions))

  /**
   * updating batch number after running all actions
   */
  direction === 'down' ? yield this._revertProgress(file) : yield this._updateProgress(file, batchNumber)
}

/**
 * returns difference of migrations to be used for
 * creation or rollback based upon the direction.
 *
 * @param  {Object}        files
 * @param  {Array}         values
 * @param  {String}        direction
 * @return {Object}
 *
 * @example
 *   input>> {'2015-10-20_users': Users, ['2015-10-20_users'], 'up'}
 *   output>> {}
 *
 * @private
 */
Migrate._getMigrationsList = function (files, values, direction) {
  const diff = direction === 'down' ? _.reverse(_.intersection(values, _.keys(files))) : _.difference(_.keys(files), values)
  return _.reduce(diff, (result, name) => {
    result[name] = files[name]
    return result
  }, {})
}

/**
 * map list of migrations to an array of actions.
 *
 * @param      {Object}  migrationsList
 * @return     {Array}
 *
 * @example
 * input >>> {'2015-10-30': Users}
 * output >>> [{file: '2015-10-30', actions: [knex actions]}]
 *
 * @private
 */
Migrate._mapMigrationsToActions = function (migrationsList, direction) {
  return _.map(migrationsList, (File, fileName) => {
    if (typeof (File) !== 'function') {
      throw CE.DomainException.invalidSchemaFile(fileName)
    }
    return {file: fileName, actions: this._translateActions(new File(), direction)}
  })
}

/**
 * return list of migrated files saved inside migrations
 * collection.
 *
 * @return     {Array}  The migrated files.
 *
 * @private
 */
Migrate._getMigratedFiles = function * () {
  const db = yield this.database.connection('default')
  const migratedFiles = yield mquery().collection(db.collection(this.migrationsCollection)).find().select('name').sort('name')
  return _.map(migratedFiles, 'name')
}

/**
 * returns list of migration files till a give batch number
 * this is used to rollback migrations till a given batch
 *
 * @param      {Number}  batch   The batch
 * @return     {Array}
 *
 * @private
 */
Migrate._getFilesTillBatch = function * (batch) {
  const db = yield this.database.connection('default')
  const migrateFiles = yield mquery().collection(db.collection(this.migrationsCollection)).find()
    .select('name')
    .where('batch').gt(batch)
    .sort('name')
  return _.map(migrateFiles, 'name')
}

/**
 * returns an array of queries sql output next and
 * file name.
 *
 * @param   {Array} migrations
 *
 * @return  {Array}
 *
 * @private
 */
Migrate._toSql = function (migrations) {
  return _.transform(migrations, (result, migration) => {
    const queries = _.map(migration.actions, (action) => {
      return action()
    })
    result.push({file: migration.file, queries})
    return result
  }, [])
}
