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
const mquery = require('mquery')
const CE = require('../../Exceptions')
const Lock = exports = module.exports = {}

/**
 * makes a new lock collection if does not exists already
 *
 * @return {Object}
 *
 * @private
 */
Lock._makeLockCollection = function () {
  return this.database.schema
    .createCollectionIfNotExists(this.lockCollection, function (collection) {
      collection.increments('_id')
      collection.boolean('is_locked')
    })
}

/**
 * adds a lock on migrations
 *
 * @private
 */
Lock._addLock = function * () {
  const db = yield this.database.connection('default')
  return yield db.collection(this.lockCollection).insert({is_locked: 1})
}

/**
 * checks whether there is a lock on
 * migrations collection or not.
 *
 * @return {Object}
 *
 * @private
 */
Lock._checkLock = function * () {
  const db = yield this.database.connection('default')
  const result = yield mquery().collection(db.collection(this.lockCollection))
    .where('is_locked', 1)
    .sort('-_id')
    .limit(1)
    .find()

  if (_.size(result)) {
    throw CE.RuntimeException.migrationsAreLocked(this.lockCollection)
  }
  return false
}

/**
 * removes migrations lock by drop the
 * lock collection
 *
 * @return {Object}
 *
 * @private
 */
Lock._deleteLock = function * () {
  return yield this.database.schema.dropCollection(this.lockCollection)
}
