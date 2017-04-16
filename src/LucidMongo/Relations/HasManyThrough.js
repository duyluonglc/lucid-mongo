'use strict'

/**
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const Relation = require('./Relation')
const CE = require('../../Exceptions')
const helpers = require('../QueryBuilder/helpers')
const _ = require('lodash')

class HasManyThrough extends Relation {
  constructor (parent, related, through, primaryKey, foreignKey, throughPrimaryKey, throughForeignKey) {
    super(parent, related)
    this.through = this._resolveModel(through)
    this.fromKey = primaryKey || this.parent.constructor.primaryKey // id
    this.toKey = foreignKey || this.parent.constructor.foreignKey // country_id
    this.viaKey = throughPrimaryKey || this.through.primaryKey // authors.id
    this.viaForeignKey = throughForeignKey || this.through.foreignKey // author_id
    this.relatedQuery = this.through.query()
    this.alternateQuery = this.related.query()
  }

  /**
   * getAlternate
   *
   * @private
   */
  * _getAlternateIds () {
    const alternates = yield this.alternateQuery.select([this.fromKey, this.toKey])
      .where(this.toKey, this.parent[this.fromKey]).fetch()
    return alternates.map(this.viaKey).value()
  }

  /**
   * decorates the current query chain before execution
   */
  _getThroughQuery (alternateIds) {
    return this.relatedQuery.whereIn(this.viaForeignKey, alternateIds)
  }

  /**
   * Fetch over the related rows
   *
   * @return {Object}
   */
  * fetch () {
    this._validateRead()
    const alternateIds = yield this._getAlternateIds()
    return yield this._getThroughQuery(alternateIds).fetch()
  }

  /**
   * Fetch first over the related rows
   *
   * @return {Object}
   */
  * first () {
    this._validateRead()
    const alternateIds = yield this._getAlternateIds()
    return yield this._getThroughQuery(alternateIds).first()
  }

  /**
   * Paginates over the related rows
   *
   * @param  {Number} page
   * @param  {Number} [perPage=20]
   *
   * @return {Object}
   */
  * paginate (page, perPage) {
    this._validateRead()
    /**
     * creating the query clone to be used as countByQuery,
     * since selecting fields in countBy requires unwanted
     * groupBy clauses.
     */
    const alternateIds = yield this._getAlternateIds()
    return yield this._getThroughQuery(alternateIds).paginate(page, perPage)
  }

  /**
   * Returns count of rows for the related row
   *
   * @param  {String} groupBy
   *
   * @return {Array}
   */
  * count (groupBy) {
    this._validateRead()
    const alternateIds = yield this._getAlternateIds()
    return yield this._getThroughQuery(alternateIds).count(groupBy)
  }

  /**
   * Returns sum for a given key
   *
   * @param  {String} key
   * @param  {String} groupBy
   *
   * @return {Array}
   */
  * sum (key, groupBy) {
    this._validateRead()
    const alternateIds = yield this._getAlternateIds()
    return yield this._getThroughQuery(alternateIds).sum(key, groupBy)
  }

  /**
   * Returns avg for a given key
   *
   * @param  {String} key
   * @param  {String} groupBy
   *
   * @return {Array}
   */
  * avg (key, groupBy) {
    this._validateRead()
    const alternateIds = yield this._getAlternateIds()
    return yield this._getThroughQuery(alternateIds).avg(key, groupBy)
  }

  /**
   * Returns min for a given key
   *
   * @param  {String} key
   * @param  {String} groupBy
   *
   * @return {Array}
   */
  * min (key, groupBy) {
    this._validateRead()
    const alternateIds = yield this._getAlternateIds()
    return yield this._getThroughQuery(alternateIds).min(key, groupBy)
  }

  /**
   * Returns max for a given key
   *
   * @param  {String} key
   * @param  {String} groupBy
   *
   * @return {Array}
   */
  * max (key, groupBy) {
    this._validateRead()
    const alternateIds = yield this._getAlternateIds()
    return yield this._getThroughQuery(alternateIds).max(key, groupBy)
  }

  /**
   * will eager load the relation for multiple values on related
   * model and returns an object with values grouped by foreign
   * key.
   *
   * @param {Array} values
   * @param {Function} [scopeMethod] [description]
   * @return {Object}
   *
   * @public
   *
   */
  * eagerLoad (values, scopeMethod) {
    const viaQuery = this.through.query()
    if (typeof (scopeMethod) === 'function') {
      scopeMethod(viaQuery)
    }
    const relates = yield this.relatedQuery.select([this.toKey, this.fromKey])
      .whereIn(this.toKey, values).fetch()
    const viaIds = _(relates).map(this.fromKey).value()
    const results = yield viaQuery.whereIn(this.viaForeignKey, viaIds).fetch()
    return results.groupBy((item) => {
      const relate = relates.find(relate => String(relate[this.viaKey]) === String(item[this.viaForeignKey]))
      return relate[this.toKey]
    }).mapValues(function (value) {
      return helpers.toCollection(value)
    })
    .value()
  }

  /**
   * will eager load the relation for multiple values on related
   * model and returns an object with values grouped by foreign
   * key. It is equivalent to eagerLoad but query defination
   * is little different.
   *
   * @param  {Mixed} value
   * @param {Function} [scopeMethod] [description]
   * @return {Object}
   *
   * @public
   *
   */
  * eagerLoadSingle (value, scopeMethod) {
    const viaQuery = this.through.query()
    if (typeof (scopeMethod) === 'function') {
      scopeMethod(viaQuery)
    }
    const relates = yield this.relatedQuery.select([this.toKey, this.fromKey])
      .where(this.toKey, value).fetch()
    const viaIds = _(relates).map(this.fromKey).value()
    const results = yield viaQuery.whereIn(this.viaForeignKey, viaIds).fetch()
    const response = {}
    response[value] = results
    return response
  }

  /**
   * Throws exception since save should be
   * done after getting the instance.
   */
  * save () {
    throw CE.ModelRelationException.unSupportedMethod('save', this.constructor.name)
  }

  /**
   * Throws exception since create should be
   * done after getting the instance.
   */
  * create () {
    throw CE.ModelRelationException.unSupportedMethod('create', this.constructor.name)
  }

  /**
   * Throws exception since createMany should be
   * done after getting the instance.
   */
  * createMany () {
    throw CE.ModelRelationException.unSupportedMethod('createMany', this.constructor.name)
  }

  /**
   * Throws exception since saveMany should be
   * done after getting the instance.
   */
  * saveMany () {
    throw CE.ModelRelationException.unSupportedMethod('saveMany', this.constructor.name)
  }

  /**
   * Throws an exception since deleting the related model
   * should be done via relation and detach should be
   * used instead.
   */
  * delete () {
    throw CE.ModelRelationException.unSupportedMethod('delete', this.constructor.name)
  }

  /**
   * update
   *
   * @public
   *
   * @return {Object}
   */
  * update (values) {
    this._validateRead()
    const alternateIds = yield this._getAlternateIds()
    return yield this._getThroughQuery(alternateIds).update(values)
  }
}

module.exports = HasManyThrough
