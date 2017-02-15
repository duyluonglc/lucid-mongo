'use strict'

/**
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const mquery = require('mquery')

const Batch = exports = module.exports = {}

/**
 * returns recent batch number to be used for rollback
 *
 * @yield {Number}
 *
 * @private
 */
Batch._getRecentBatchNumber = function * () {
  const db = yield this.database.connection('default')
  const result = yield mquery().collection(db.collection(this.migrationsCollection)).sort('-batch').findOne()
  const batchNumber = result ? (result.batch || 1) : 1
  return Number(batchNumber) - 1
}

/**
 * returns next batch number to be used for storing
 * progress
 *
 * @yield {Number}
 *
 * @private
 */
Batch._getNextBatchNumber = function * () {
  const db = yield this.database.connection('default')
  const result = yield mquery().collection(db.collection(this.migrationsCollection)).sort('-batch').findOne()
  const batchNumber = result ? result.batch : 0
  return Number(batchNumber) + 1
}

/**
 * updates batch with all newly created
 * migrations
 *
 * @param  {Array}     migrations
 * @yield {Number}
 *
 * @private
 */
Batch._updateProgress = function * (migration, batchNumber) {
  const migrations = {name: migration, batch: batchNumber, migration_time: new Date()}
  const db = yield this.database.connection('default')
  return yield db.collection(this.migrationsCollection).insert(migrations)
}

/**
 * deletes batch row from migrations collection, required
 * when rolling back
 *
 * @yield {Object}
 *
 * @private
 */
Batch._revertProgress = function * (file, batchNumber) {
  const db = yield this.database.connection('default')
  return yield mquery().collection(db.collection(this.migrationsCollection)).where('name', file).remove()
}
