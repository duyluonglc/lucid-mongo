'use strict'

/*
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const _ = require('lodash')
const query = require('mquery')
const debug = require('debug')('mquery')
// const GeoPoint = require('geo-point')
const EagerLoad = require('../EagerLoad')
// const RelationsParser = require('../Relations/Parser')
const CE = require('../../Exceptions')

const proxyGet = require('../../../lib/proxyGet')
const util = require('../../../lib/util')
const { ioc } = require('../../../lib/iocResolver')

const proxyHandler = {
  get: proxyGet('query', false, function (target, name) {
    const queryScope = util.makeScopeName(name)

    /**
     * if value is a local query scope and a function, please
     * execute it
     */
    if (typeof (target.Model[queryScope]) === 'function') {
      return function (...args) {
        target.Model[queryScope](this, ...args)
        return this
      }
    }
  })
}

/**
 * Query builder for the lucid models extended
 * by the @ref('Database') class.
 *
 * @class QueryBuilder
 * @constructor
 */
class QueryBuilder {
  constructor (Model, connection) {
    this.Model = Model
    this.collection = this.Model.prefix ? `${this.Model.prefix}${this.Model.collection}` : this.Model.collection

    /**
     * Reference to database provider
     */
    this.db = ioc.use('Adonis/Src/Database').connection(connection)

    /**
     * mquery
     */
    this.query = query()

    /**
     * Scopes to be ignored at runtime
     *
     * @type {Array}
     *
     * @private
     */
    this._ignoreScopes = []

    /**
     * Relations to be eagerloaded
     *
     * @type {Object}
     */
    this._eagerLoads = {}

    /**
     * The sideloaded data for this query
     *
     * @type {Array}
     */
    this._sideLoaded = []

    /**
     * Replace some methods
     */
    this.replaceMethods()

    /**
     * Query level visible fields
     *
     * @type {Array}
     */
    this._visibleFields = this.Model.visible

    /**
     * Query level hidden fields
     *
     * @type {Array}
     */
    this._hiddenFields = this.Model.hidden

    return new Proxy(this, proxyHandler)
  }

  /**
   * @method getCollection
   *
   * @returns MongodbCollection
   * @memberof QueryBuilder
   */
  async getCollection () {
    const connection = await this.db.connect()
    return connection.collection(this.collection)
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
   * This method will apply all the global query scopes
   * to the query builder
   *
   * @method applyScopes
   *
   * @private
   */
  _applyScopes () {
    if (this._ignoreScopes.indexOf('*') > -1) {
      return this
    }

    _(this.Model.$globalScopes)
      .filter((scope) => this._ignoreScopes.indexOf(scope.name) <= -1)
      .each((scope) => {
        scope.callback(this)
      })

    return this
  }

  /**
   * Maps all rows to model instances
   *
   * @method _mapRowsToInstances
   *
   * @param  {Array}            rows
   *
   * @return {Array}
   *
   * @private
   */
  _mapRowsToInstances (rows) {
    return rows.map((row) => this._mapRowToInstance(row))
  }

  /**
   * Maps a single row to model instance
   *
   * @method _mapRowToInstance
   *
   * @param  {Object}          row
   *
   * @return {Model}
   */
  _mapRowToInstance (row) {
    const modelInstance = new this.Model()

    /**
     * The omitBy function is used to remove sideLoaded data
     * from the actual values and set them as $sideLoaded
     * property on models
     */
    modelInstance.newUp(_.omitBy(row, (value, field) => {
      if (this._sideLoaded.indexOf(field) > -1) {
        modelInstance.$sideLoaded[field] = value
        return true
      }

      modelInstance.$visible = this._visibleFields
      modelInstance.$hidden = this._hiddenFields
    }))

    return modelInstance
  }

  /**
   * Eagerload relations for all model instances
   *
   * @method _eagerLoad
   *
   * @param  {Array}   modelInstance
   *
   * @return {void}
   *
   * @private
   */
  async _eagerLoad (modelInstances) {
    if (_.size(modelInstances)) {
      await new EagerLoad(this._eagerLoads).load(modelInstances)
    }
  }

  /**
   * Instruct query builder to ignore all global
   * scopes.
   *
   * Passing `*` will ignore all scopes or you can
   * pass an array of scope names.
   *
   * @param {Array} [scopes = ['*']]
   *
   * @method ignoreScopes
   *
   * @chainable
   */
  ignoreScopes (scopes) {
    /**
     * Don't do anything when array is empty or value is not
     * an array
     */
    const scopesToIgnore = Array.isArray(scopes) ? scopes : ['*']
    this._ignoreScopes = this._ignoreScopes.concat(scopesToIgnore)
    return this
  }

  /**
   * Execute the query builder chain by applying global scopes
   *
   * @method fetch
   * @async
   *
   * @return {Serializer} Instance of model serializer
   */
  async fetch () {
    /**
     * Apply all the scopes before fetching
     * data
     */
    this._applyScopes()

    /**
     * Execute query
     */
    const collection = await this.db.getCollection(this.collection)
    const rows = await this.query.collection(collection).find()

    /**
     * Convert to an array of model instances
     */
    const modelInstances = this._mapRowsToInstances(rows)
    await this._eagerLoad(modelInstances)

    /**
     * Fire afterFetch event
     */
    if (this.Model.$hooks) {
      await this.Model.$hooks.after.exec('fetch', modelInstances)
    }

    /**
     * Return an instance of active model serializer
     */
    const Serializer = this.Model.resolveSerializer()
    return new Serializer(modelInstances)
  }

  /**
   * Returns the first row from the database.
   *
   * @method first
   * @async
   *
   * @return {Model|Null}
   */
  async first () {
    /**
     * Apply all the scopes before fetching
     * data
     */
    this._applyScopes()

    const collection = await this.db.getCollection(this.collection)
    const row = await this.query.collection(collection).findOne()

    if (!row) {
      return null
    }

    const modelInstance = this._mapRowToInstance(row)
    // await this._eagerLoad([modelInstance])
    /**
     * Eagerload relations when defined on query
     */
    if (_.size(this._eagerLoads)) {
      await modelInstance.loadMany(this._eagerLoads)
    }

    if (this.Model.$hooks) {
      await this.Model.$hooks.after.exec('find', modelInstance)
    }

    return modelInstance
  }

  /**
   * Throws an exception when unable to find the first
   * row for the built query
   *
   * @method firstOrFail
   * @async
   *
   * @return {Model}
   *
   * @throws {ModelNotFoundException} If unable to find first row
   */
  async firstOrFail () {
    const returnValue = await this.first()
    if (!returnValue) {
      throw CE.ModelNotFoundException.raise(this.Model.name)
    }

    return returnValue
  }

  /**
   * Find record by primary key
   *
   * @method find
   * @async
   *
   * @param  {string} id
   *
   * @return {Model|null}
   */
  find (id) {
    return this.where(this.Model.primaryKey, id).first()
  }

  /**
   * Paginate records, same as fetch but returns a
   * collection with pagination info
   *
   * @method paginate
   * @async
   *
   * @param  {Number} [page = 1]
   * @param  {Number} [limit = 20]
   *
   * @return {Serializer}
   */
  async paginate (page = 1, limit = 20) {
    /**
     * Apply all the scopes before fetching
     * data
     */
    this._applyScopes()
    const collection = await this.db.getCollection(this.collection)
    const countQuery = _.clone(this.query)
    countQuery._fields = undefined
    const countByQuery = await countQuery.collection(collection).count()
    this.query.limit(limit).skip((page - 1) * limit)
    const rows = await this.query.collection(collection).find()

    const result = util.makePaginateMeta(countByQuery || 0, page, limit)

    /**
     * Convert to an array of model instances
     */
    const modelInstances = this._mapRowsToInstances(rows)
    await this._eagerLoad(modelInstances)

    /**
     * Pagination meta data
     */
    const pages = _.omit(result, ['data'])

    /**
     * Fire afterPaginate event
     */
    if (this.Model.$hooks) {
      await this.Model.$hooks.after.exec('paginate', modelInstances, pages)
    }

    /**
     * Return an instance of active model serializer
     */
    const Serializer = this.Model.resolveSerializer()
    return new Serializer(modelInstances, pages)
  }

  /**
   * Bulk update data from query builder. This method will also
   * format all dates and set `updated_at` column
   *
   * @method update
   * @async
   *
   * @param  {Object} values
   *
   * @return {Promise}
   */
  async update (values) {
    const valuesCopy = _.clone(values)
    const fakeModel = new this.Model()
    fakeModel._setUpdatedAt(valuesCopy)
    fakeModel._formatFields(valuesCopy)

    /**
     * Apply all the scopes before update
     */
    this._applyScopes()
    const collection = await this.db.getCollection(this.collection)
    return this.query.collection(collection).setOptions({ multi: true }).update(valuesCopy)
  }

  /**
   * Deletes the rows from the database.
   *
   * @method delete
   * @async
   *
   * @return {Promise}
   */
  async delete () {
    this._applyScopes()
    const collection = await this.db.getCollection(this.collection)
    return this.query.collection(collection).setOptions({ multi: true }).remove()
  }

  /**
   * Insert row.
   *
   * @method insert
   *
   * @param {object} attributes
   * @returns {Promise}
   */
  async insert (attributes) {
    debug('insert', this.collection, attributes)
    const collection = await this.db.getCollection(this.collection)
    return collection.insert(attributes)
  }

  /**
   * Returns an array of primaryKeys
   *
   * @method ids
   * @async
   *
   * @return {Array}
   */
  ids () {
    return this.pluck(this.Model.primaryKey)
  }

  /**
 * Returns an array of selected field
 *
 * @method pluck
 * @param {String} field
 * @async
 *
 * @return {Array}
 */
  async pluck (field) {
    this._applyScopes()
    const rows = await this.select(field).fetch()
    return rows.rows.map((row) => row[field])
  }

  /**
   * Returns a pair of lhs and rhs. This method will not
   * eagerload relationships.
   *
   * @method pair
   * @async
   *
   * @param  {String} lhs
   * @param  {String} rhs
   *
   * @return {Object}
   */
  async pair (lhs, rhs) {
    const collection = await this.fetch()
    return _.transform(collection.rows, (result, row) => {
      result[row[lhs]] = row[rhs]
      return result
    }, {})
  }

  /**
   * Same as `pick` but inverse
   *
   * @method pickInverse
   * @async
   *
   * @param  {Number}    [limit = 1]
   *
   * @return {Collection}
   */
  pickInverse (limit = 1) {
    this.query.sort(`-${this.Model.primaryKey}`).limit(limit)
    return this.fetch()
  }

  /**
   * Pick x number of rows from the database
   *
   * @method pick
   * @async
   *
   * @param  {Number} [limit = 1]
   *
   * @return {Collection}
   */
  pick (limit = 1) {
    this.query.sort(this.Model.primaryKey).limit(limit)
    return this.fetch()
  }

  /**
   * Eagerload relationships when fetching the parent
   * record
   *
   * @method with
   *
   * @param  {String}   relation
   * @param  {Function} [callback]
   *
   * @chainable
   */
  with (...args) {
    if (args[1] && _.isFunction(args[1])) {
      this._eagerLoads[args[0]] = args[1]
    } else if (args[1] && _.isObject(args[1])) {
      this._eagerLoads[args[0]] = (builder) => {
        _.forEach(args[1], (value, key) => builder[key](value))
      }
    } else if (Array.isArray(args[0])) {
      _.forEach(args[0], related => this.with(related))
    } else if (_.isObject(args[0])) {
      _.forEach(args[0], (scope, key) => this.with(key, scope))
    } else {
      this._eagerLoads[args[0]] = (builder) => { }
    }
    return this
  }

  /**
   * Returns count of a relationship
   *
   * @method withCount
   *
   * @param  {String}   relation
   * @param  {Function} callback
   *
   * @chainable
   *
   * @example
   * ```js
   * query().withCount('profile')
   * query().withCount('profile as userProfile')
   * ```
   */
  // withCount (relation, callback) {
  //   let { name, nested } = RelationsParser.parseRelation(relation)
  //   if (nested) {
  //     throw CE.RuntimeException.cannotNestRelation(_.first(_.keys(nested)), name, 'withCount')
  //   }

  //   /**
  //    * Since user can set the `count as` statement, we need
  //    * to parse them properly.
  //    */
  //   const tokens = name.match(/as\s(\w+)/)
  //   let asStatement = `${name}_count`
  //   if (_.size(tokens)) {
  //     asStatement = tokens[1]
  //     name = name.replace(tokens[0], '').trim()
  //   }

  //   RelationsParser.validateRelationExistence(this.Model.prototype, name)
  //   const relationInstance = RelationsParser.getRelatedInstance(this.Model.prototype, name)

  //   /**
  //    * Call the callback with relationship instance
  //    * when callback is defined
  //    */
  //   if (typeof (callback) === 'function') {
  //     callback(relationInstance)
  //   }

  //   const columns = []

  //   /**
  //    * Add `*` to columns only when there are no existing columns selected
  //    */
  //   if (!_.find(this.query._statements, (statement) => statement.grouping === 'columns')) {
  //     columns.push('*')
  //   }
  //   columns.push(relationInstance.relatedWhere(true).as(asStatement))

  //   /**
  //    * Saving reference of count inside _sideloaded
  //    * so that we can set them later to the
  //    * model.$sideLoaded
  //    */
  //   this._sideLoaded.push(asStatement)

  //   /**
  //    * Clear previously selected columns and set new
  //    */
  //   this.query.select(columns)

  //   return this
  // }

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
      const originMethod = this.query[name]
      this.query[name] = (param) => {
        const key = this.query._path
        param = this.Model.formatField(key, param)
        originMethod.apply(this.query, [param])
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
    if (_.isPlainObject(arguments[0])) {
      const queryObject = arguments[0]
      for (const key in queryObject) {
        const conditions = queryObject[key]
        if (key === '$and' || key === '$or' || key === '$nor') {
          if (!Array.isArray(conditions)) {
            throw new CE.InvalidArgumentException(`Method "$${key}"'s param must be an array`)
          }
          const formatedConditions = []
          for (const condition of conditions) {
            const cloneQuery = _.clone(this)
            cloneQuery.query = query()
            formatedConditions.push(cloneQuery.where(condition).query._conditions)
          }
          queryObject[key] = formatedConditions
        } else if (_.isPlainObject(conditions)) {
          for (const subKey in conditions) {
            const reg = /^\$(eq|ne|gt|gte|lt|lte|in|nin|all|near|intersects|elemMatch|includes)$/
            if (reg.test(subKey)) {
              queryObject[key][subKey] = this.Model.formatField(key, queryObject[key][subKey])
            }
          }
        } else {
          queryObject[key] = this.Model.formatField(key, queryObject[key])
        }
      }
      this.query.where(queryObject)
    } else if (_.isFunction(arguments[0])) {
      arguments[0].bind(this).call()
    } else {
      if (arguments.length === 2) {
        this.query.where(arguments[0]).eq(arguments[1])
      } else if (arguments.length === 3) {
        switch (arguments[1]) {
          case '=':
            this.query.where(arguments[0]).eq(arguments[2])
            break
          case '>':
            this.query.where(arguments[0]).gt(arguments[2])
            break
          case '>=':
            this.query.where(arguments[0]).gte(arguments[2])
            break
          case '<':
            this.query.where(arguments[0]).lt(arguments[2])
            break
          case '<=':
            this.query.where(arguments[0]).lte(arguments[2])
            break
          case '<>':
            this.query.where(arguments[0]).ne(arguments[2])
            break
          default:
            throw new CE.RuntimeException(`Method "$${arguments[1]}" is not support by query builder`)
        }
      } else {
        return this.query.where(arguments[0])
      }
    }
    return this
  }

  /**
   * Where field is not exists
   *
   * @param {String} key
   * @param {Mixed} [value]
   *
   * @chainable
   */
  whereNull (key) {
    this.query.where(key).exists(false)
    return this
  }

  /**
   * Where field is exists
   *
   * @param {String} key
   * @param {Mixed} [value]
   *
   * @chainable
   */
  whereNotNull (key) {
    this.query.where(key).exists()
    return this
  }

  /**
   * Where field in array
   *
   * @param {String} key
   * @param {Mixed} [value]
   *
   * @chainable
   */
  whereIn (key, values) {
    this.query.where(key).in(values)
    return this
  }

  /**
   * Where field not in array
   *
   * @param {String} key
   * @param {Mixed} [value]
   *
   * @chainable
   */
  whereNotIn (key, values) {
    this.query.where(key).nin(values)
    return this
  }

  /**
   * Convert select query
   *
   * @public
   */
  select () {
    let arg = null
    if (arguments.length > 1) {
      arg = _.values(arguments).join(' ')
    } else {
      arg = arguments[0]
    }
    this.query.select(arg)
    return this
  }

  /**
   * @method orderBy
   *
   * @returns {this}
   * @memberof QueryBuilder
   */
  orderBy () {
    let arg = null
    if (arguments.length > 1) {
      arg = _.set({}, arguments[0], arguments[1])
    } else {
      arg = arguments[0]
    }
    this.query.sort(arg)
    return this
  }

  /**
   * Count collections
   *
   * @method count
   *
   * @return {Object}
   */
  count (groupBy) {
    return this._aggregate('count', null, groupBy)
  }

  /**
   * Max field collections
   *
   * @method max
   *
   * @return {Object}
   */
  max (key, groupBy) {
    return this._aggregate('max', key, groupBy)
  }

  /**
   * Min field collections
   *
   * @method min
   *
   * @return {Object}
   */
  min (key, groupBy) {
    return this._aggregate('min', key, groupBy)
  }

  /**
   * Sum field collections
   *
   * @method sum
   *
   * @return {Object}
   */
  sum (key, groupBy) {
    return this._aggregate('sum', key, groupBy)
  }

  /**
   * Average field collections
   *
   * @method avg
   *
   * @return {Object}
   */
  avg (key, groupBy) {
    return this._aggregate('avg', key, groupBy)
  }

  /**
   * Aggregation
   *
   * @method _aggregate
   *
   * @return {Object}
   */
  async _aggregate (aggregator, key, groupBy) {
    this._applyScopes()
    const $match = this.query._conditions
    const $group = {}
    if (_.isString(groupBy)) {
      $group._id = '$' + groupBy
    } else if (_.isObject) {
      $group._id = groupBy
    }

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
    const collection = await this.getCollection()
    debug(aggregator, this.collection, $match, $group)
    const result = await collection.aggregate([{ $match }, { $group }]).toArray()
    return groupBy ? result : !_.isEmpty(result) ? result[0][aggregator] : null
  }

  async aggregate (...args) {
    const collection = await this.getCollection()
    debug(...args, this.collection)
    return collection.aggregate(...args).toArray()
  }

  /**
   * Distinct field collections
   *
   * @method distinct
   *
   * @return {Object}
   */
  async distinct (field) {
    this._applyScopes()
    const collection = await this.getCollection()
    return this.query.collection(collection).distinct(...arguments)
  }

  /**
   * Returns the sql representation of query
   *
   * @method toSQL
   *
   * @return {Object}
   */
  toSQL () {
    return JSON.stringify(this.query)
  }

  /**
   * Returns string representation of query
   *
   * @method toString
   *
   * @return {String}
   */
  toString () {
    return this.query.toString()
  }

  /**
   * Define fields to be visible for a single
   * query.
   *
   * Computed when `toJSON` is called
   *
   * @method setVisible
   *
   * @param  {Array}   fields
   *
   * @chainable
   */
  setVisible (fields) {
    this._visibleFields = fields
    return this
  }

  /**
   * Define fields to be hidden for a single
   * query.
   *
   * Computed when `toJSON` is called
   *
   * @method setHidden
   *
   * @param  {Array}   fields
   *
   * @chainable
   */
  setHidden (fields) {
    this._hiddenFields = fields
    return this
  }
}

module.exports = QueryBuilder
