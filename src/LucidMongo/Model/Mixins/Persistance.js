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
const CE = require('../../../Exceptions')
const Persistance = exports = module.exports = {}

/**
 * inserts instance values to the database and sets instance
 * primary key value
 *
 * @method insert
 *
 * @return {Boolean}
 *
 * @public
 */
Persistance.insert = function * () {
  /**
   * insert handler is sent to hooks execution method
   * and will be called there itself.
   */
  const insertHandler = function * () {
    const values = this.attributes
    if (!values || _.size(values) < 1) {
      throw CE.ModelException.invalidState(`Cannot save empty ${this.constructor.name} model`)
    }
    const query = this.constructor.query()
    // yield query.connect()
    if (this.transaction) {
      query.transacting(this.transaction)
    }
    const save = yield query.insertAttributes(values)
    this.parsePersistance(save.ops[0])
    // this.$primaryKeyValue = values[this.constructor.primaryKey] || save.insertedIds[1]
    this.exists = true
    this.original = _.clone(this.attributes)
    return !!save
  }
  return yield this.executeInsertHooks(this, insertHandler)
}

/**
 * updates model dirty values
 *
 * @method update
 *
 * @return {Number} - number of affected rows after update
 *
 * @public
 */
Persistance.update = function * () {
  /**
   * update handler is sent to hooks execution method
   * and will be called there itself.
   */
  const updateHandler = function * () {
    const query = this.constructor.query()
    // yield query.connect()
    let dirtyValues = this.$dirty
    if (!_.size(dirtyValues) && !this.unsetFields.length) {
      return 0
    }
    // let dirty = { $set: dirtyValues }
    if (this.unsetFields.length) {
      dirtyValues.$unset = {}
      this.unsetFields.forEach(field => {
        dirtyValues.$unset[field] = 1
        delete this.attributes[field]
      })
    }
    if (this.transaction) {
      query.transacting(this.transaction)
    }
    const save = yield query.where(this.constructor.primaryKey, this.$primaryKeyValue).updateAttributes(dirtyValues)
    if (save.result.ok > 0) {
      this.parsePersistance(_.omit(dirtyValues, ['$set', '$unset']))
      this.original = _.clone(this.attributes)
    }
    return save
  }
  return yield this.executeUpdateHooks(this, updateHandler)
}

/**
 * deletes a given model row from database. However if soft deletes are
 * enabled, it will update the deleted at timestamp
 *
 * @method delete
 *
 * @return {Number} - Number of affected rows
 *
 * @public
 */
Persistance.delete = function * () {
  const deleteHandler = function * () {
    const query = this.constructor.query().where(this.constructor.primaryKey, this.$primaryKeyValue)
    // yield query.connect()
    if (this.transaction) {
      query.transacting(this.transaction)
    }
    const values = {}
    const affected = yield query.deleteAttributes(values)
    if (affected > 0) {
      _.merge(this.attributes, values)
      this.exists = false
      this.freeze()
    }
    return affected
  }
  return yield this.executeDeleteHooks(this, deleteHandler)
}

/**
 * restores a soft deleted model instance
 * @method *restore
 *
 * @return {Number} - Number of affected rows
 *
 * @public
 */
Persistance.restore = function * () {
  const restoreHandler = function * () {
    const query = this.constructor.query().where(this.constructor.primaryKey, this.$primaryKeyValue)
    // yield query.connect()
    if (this.transaction) {
      query.transacting(this.transaction)
    }
    const values = {}
    const affected = yield query.restoreAttributes(values)
    if (affected > 0) {
      this.unfreeze()
      _.merge(this.attributes, values)
    }
    return affected
  }
  return yield this.executeRestoreHooks(this, restoreHandler)
}
