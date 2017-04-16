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
const helpers = require('../helpers')
const debug = require('debug')('mquery')

class BaseSerializer {
  constructor (queryBuilder, proxyScope) {
    /**
     * this is the reference to the proxied query builder.
     * Something we call "target" inside custom proxy
     * methods. @ref - Lucid/QueryBuilder/index.js
     */
    this.queryBuilder = queryBuilder

    /**
     * required when calling global scoped methods.
     */
    this.proxyScope = proxyScope
  }

  /**
   * decorates the existing query by calling all
   * globalScope methods.
   *
   * @private
   */
  _decorateQuery () {
    const globalScope = this.queryBuilder.HostModel.globalScope
    if (_.size(globalScope)) {
      _.each(globalScope, (scopeMethod) => {
        scopeMethod(this.proxyScope)
      })
    }
  }

  /**
   * eagerly fetches relations for a given query builder
   * instance.
   *
   * @param  {Array} values [description]
   * @return {Array}        [description]
   *
   * @private
   */
  * _fetchEager (values) {
    let eagerlyFetched = []
    /**
     * eagerly fetch all relations which are set for eagerLoad and
     * also the previous query execution returned some results.
     */
    if (_.size(this.queryBuilder.eagerLoad.withRelations) && _.size(values)) {
      return yield this.queryBuilder.eagerLoad.load(values, this.queryBuilder.HostModel)
    }
    return eagerlyFetched
  }

  /**
   * converts the final result set into a custom collection. This method
   * should never be called on newly instantiated models, whereas is
   * only used when fetching models from Database.
   *
   * @param  {Array} values      [description]
   * @param  {Array} eagerValues [description]
   * @return {Collection}             [description]
   *
   * @private
   */
  _toCollection (values, eagerValues) {
    /**
     * here we convert an array to a collection, and making sure each
     * item inside an array is an instance of it's parent model.
     */
    return helpers.toCollection(values).transform((result, value, index) => {
      const modelInstance = new this.queryBuilder.HostModel()
      modelInstance.parsePersistance(value)
      modelInstance.exists = true
      modelInstance.original = _.cloneDeep(modelInstance.attributes)
      this.queryBuilder.eagerLoad.mapRelationsToRow(eagerValues, modelInstance, value)
      result[index] = modelInstance
    })
  }

  /**
   * fetch query results and wrap them inside a custom
   * collection.
   *
   * @return {Collection}
   *
   * @public
   */
  * fetch () {
    this._decorateQuery()
    yield this.queryBuilder.connect()
    const values = yield this.queryBuilder.modelQueryBuilder.find()
    const eagerlyFetched = yield this._fetchEager(values)
    return this._toCollection(values, eagerlyFetched)
  }

  /**
   * fetch query results as paginated data and wrap
   * them inside a custom collection.
   *
   * @param {Number} page
   * @param {Number} [perPage=20]
   * @param {Object} [countByQuery]
   *
   * @return {Collection}
   *
   * @public
   */
  * paginate (page, perPage, countByQuery) {
    this._decorateQuery()
    yield this.queryBuilder.connect()
    const values = yield this.queryBuilder.modelQueryBuilder.paginate(page, perPage, countByQuery)
    const eagerlyFetched = yield this._fetchEager(values.data)
    const collection = this._toCollection(values.data, eagerlyFetched)
    /**
     * here we override the collection toJSON method to return the
     * pagination meta data along with actual collection object.
     */
    collection.meta = {
      total: values.total,
      perPage: values.perPage,
      currentPage: values.currentPage,
      lastPage: values.lastPage
    }

    const collectionToJSON = collection.toJSON

    collection.toJSON = function () {
      const meta = collection.meta
      meta.data = collectionToJSON.bind(collection)()
      return meta
    }
    return collection
  }

  /**
   * Aggregate Count
   *
   * @return {Number|Collection}
   *
   * @public
   */
  * count (groupBy) {
    this._decorateQuery()
    const connection = yield this.queryBuilder.connect()
    const collection = connection.collection(this.queryBuilder.HostModel.collection)
    const $match = this.queryBuilder.modelQueryBuilder._conditions
    const $group = {
      _id: '$' + groupBy,
      count: {$sum: 1}
    }
    return new Promise((resolve, reject) => {
      debug('count', this.queryBuilder.HostModel.collection, $match, $group)
      collection.aggregate([{$match}, {$group}], (err, result) => {
        if (err) reject(err)
        resolve(groupBy ? result : (_.isEmpty(result) ? null : result[0].count))
      })
    })
  }

  /**
   * Aggregate max
   *
   * @return {Number|Collection}
   *
   * @public
   */
  * max (key, groupBy) {
    this._decorateQuery()
    const connection = yield this.queryBuilder.connect()
    const collection = connection.collection(this.queryBuilder.HostModel.collection)
    const $match = this.queryBuilder.modelQueryBuilder._conditions
    const $group = {
      _id: '$' + groupBy,
      max: {$max: '$' + key}
    }
    return new Promise((resolve, reject) => {
      debug('max', this.queryBuilder.HostModel.collection, $match, $group)
      collection.aggregate([{$match}, {$group}], (err, result) => {
        if (err) reject(err)
        resolve(groupBy ? result : (_.isEmpty(result) ? null : result[0].max))
      })
    })
  }

  /**
   * Aggregate min
   *
   * @return {Number|Collection}
   *
   * @public
   */
  * min (key, groupBy) {
    this._decorateQuery()
    const connection = yield this.queryBuilder.connect()
    const collection = connection.collection(this.queryBuilder.HostModel.collection)
    const $match = this.queryBuilder.modelQueryBuilder._conditions
    const $group = {
      _id: '$' + groupBy,
      min: {$min: '$' + key}
    }
    return new Promise((resolve, reject) => {
      debug('min', this.queryBuilder.HostModel.collection, $match, $group)
      collection.aggregate([{$match}, {$group}], (err, result) => {
        if (err) reject(err)
        resolve(groupBy ? result : (_.isEmpty(result) ? null : result[0].min))
      })
    })
  }

  /**
   * Aggregate sum
   *
   * @return {Number|Collection}
   *
   * @public
   */
  * sum (key, groupBy) {
    this._decorateQuery()
    const connection = yield this.queryBuilder.connect()
    const collection = connection.collection(this.queryBuilder.HostModel.collection)
    const $match = this.queryBuilder.modelQueryBuilder._conditions
    const $group = {
      _id: '$' + groupBy,
      sum: {$sum: '$' + key}
    }
    return new Promise((resolve, reject) => {
      debug('sum', this.queryBuilder.HostModel.collection, $match, $group)
      collection.aggregate([{$match}, {$group}], (err, result) => {
        if (err) reject(err)
        resolve(groupBy ? result : (_.isEmpty(result) ? null : result[0].sum))
      })
    })
  }

  /**
   * Aggregate avg
   *
   * @return {Number|Collection}
   *
   * @public
   */
  * avg (key, groupBy) {
    this._decorateQuery()
    const connection = yield this.queryBuilder.connect()
    const collection = connection.collection(this.queryBuilder.HostModel.collection)
    const $match = this.queryBuilder.modelQueryBuilder._conditions
    const $group = {
      _id: '$' + groupBy,
      avg: {$avg: '$' + key}
    }
    return new Promise((resolve, reject) => {
      debug('avg', this.queryBuilder.HostModel.collection, $match, $group)
      collection.aggregate([{$match}, {$group}], (err, result) => {
        if (err) reject(err)
        resolve(groupBy ? result : (_.isEmpty(result) ? null : result[0].avg))
      })
    })
  }
}

module.exports = BaseSerializer
