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
const moment = require('moment')
const GeoPoint = require('geo-point')
const ObjectID = require('mongodb').ObjectID
const { resolver, ioc } = require('../../../lib/iocResolver')
const GE = require('@adonisjs/generic-exceptions')
const BaseModel = require('./Base')
const Hooks = require('../Hooks')
const QueryBuilder = require('../QueryBuilder')
const EagerLoad = require('../EagerLoad')
const {
  HasOne,
  HasMany,
  BelongsTo,
  BelongsToMany,
  HasManyThrough,
  MorphMany,
  MorphOne,
  MorphTo,
  EmbedsMany,
  EmbedsOne,
  ReferMany
} = require('../Relations')

const CE = require('../../Exceptions')
const util = require('../../../lib/util')

/**
 * Lucid model is a base model and supposed to be
 * extended by other models.
 *
 * @binding Adonis/Src/Model
 * @alias Model
 * @group Database
 *
 * @class Model
 */
class Model extends BaseModel {
  /**
   * Boot model if not booted. This method is supposed
   * to be executed via IoC container hooks.
   *
   * @method _bootIfNotBooted
   *
   * @return {void}
   *
   * @private
   *
   * @static
   */
  static _bootIfNotBooted () {
    if (!this.$booted) {
      this.$booted = true
      this.boot()
    }
  }

  /**
   * An array of methods to be called everytime
   * a model is imported via ioc container.
   *
   * @attribute iocHooks
   *
   * @return {Array}
   *
   * @static
   */
  static get iocHooks () {
    return ['_bootIfNotBooted']
  }

  /**
   * Making sure that `ioc.make` returns
   * the class object and not it's
   * instance
   *
   * @method makePlain
   *
   * @return {Boolean}
   */
  static get makePlain () {
    return true
  }

  /**
   * The primary key for the model. You can change it
   * to anything you want, just make sure that the
   * value of this key will always be unique.
   *
   * @attribute primaryKey
   *
   * @return {String} The default value is `id`
   *
   * @static
   */
  static get primaryKey () {
    return '_id'
  }

  /**
   * The foreign key for the model. It is generated
   * by converting model name to lowercase and then
   * snake case and appending `_id` to it.
   *
   * @attribute foreignKey
   *
   * @return {String}
   *
   * @example
   * ```
   * User - user_id
   * Post - post_id
   * ``
   */
  static get foreignKey () {
    return util.makeForeignKey(this.name, this.nameConvention === 'camel')
  }

  /**
   * Tell Lucid whether primary key is supposed to be incrementing
   * or not. If `false` is returned then you are responsible for
   * setting the `primaryKeyValue` for the model instance.
   *
   * @attribute incrementing
   *
   * @return {Boolean}
   *
   * @static
   */
  static get incrementing () {
    return true
  }

  /**
   * Returns the value of primary key regardless of
   * the key name.
   *
   * @attribute primaryKeyValue
   *
   * @return {Mixed}
   */
  get primaryKeyValue () {
    return this.$attributes[this.constructor.primaryKey]
  }

  /**
   * Override primary key value.
   *
   * Note: You should know what you are doing, since primary
   * keys are supposed to be fetched automatically from
   * the database table.
   *
   * The only time you want to do is when `incrementing` is
   * set to false
   *
   * @attribute primaryKeyValue
   *
   * @param  {Mixed}        value
   *
   * @return {void}
   */
  set primaryKeyValue (value) {
    this.$attributes[this.constructor.primaryKey] = value
  }

  /**
   * Naming convention of Collections and Fields are snake or camel case
   *
   * @readonly
   */
  get nameConvention () {
    return 'snake'
  }

  /**
   * The collection name for the model. It is dynamically generated
   * from the Model name by pluralizing it and converting it
   * to lowercase.
   *
   * @attribute collection
   *
   * @return {String}
   *
   * @static
   *
   * @example
   * ```
   * Model - User
   * collection - users
   *
   * Model - Person
   * collection - people
   * ```
   */
  static get collection () {
    return util.makeCollectionName(this.name, this.nameConvention === 'camel')
  }

  /**
   * Get fresh instance of query builder for
   * this model.
   *
   * @method query
   *
   * @return {LucidQueryBuilder}
   *
   * @static
   */
  static query (params) {
    const query = new (this.QueryBuilder || QueryBuilder)(this, this.connection)
    /**
     * Listening for query event and executing
     * listeners if any
     */
    query.on('query', (builder) => {
      _(this.$queryListeners)
        .filter((listener) => typeof (listener) === 'function')
        .each((listener) => listener(builder))
    })

    if (_.isObject(params)) {
      if (params.select) { query.select(params.select) }
      if (params.where) { query.where(params.where) }
      if (params.with) { query.with(params.with) }
      if (params.limit) { query.limit(params.limit) }
      if (params.skip) { query.skip(params.skip) }
      if (params.sort) { query.sort(params.sort) }
    }

    return query
  }

  /**
   * Method to be called only once to boot
   * the model.
   *
   * NOTE: This is called automatically by the IoC
   * container hooks when you make use of `use()`
   * method.
   *
   * @method boot
   *
   * @return {void}
   *
   * @static
   */
  static boot () {
    this.hydrate()
    _.each(this.traits, (trait) => this.addTrait(trait))
  }

  /**
   * Hydrates model static properties by re-setting
   * them to their original value.
   *
   * @method hydrate
   *
   * @return {void}
   *
   * @static
   */
  static hydrate () {
    /**
     * Model hooks for different lifeCycle
     * events
     *
     * @type {Object}
     */
    this.$hooks = {
      before: new Hooks(),
      after: new Hooks()
    }

    /**
     * List of global query listeners for the model.
     *
     * @type {Array}
     */
    this.$queryListeners = []

    /**
     * List of global query scopes. Chained before executing
     * query builder queries.
     */
    this.$globalScopes = []

    /**
     * We use the default query builder class to run queries, but as soon
     * as someone wants to add methods to the query builder via traits,
     * we need an isolated copy of query builder class just for that
     * model, so that the methods added via traits are not impacting
     * other models.
     */
    this.QueryBuilder = null
  }

  /**
   * Define a query macro to be added to query builder.
   *
   * @method queryMacro
   *
   * @param  {String}   name
   * @param  {Function} fn
   *
   * @chainable
   */
  static queryMacro (name, fn) {
    /**
     * Someone wished to add methods to query builder but just for
     * this model. First get a unique copy of query builder and
     * then add methods to it's prototype.
     */
    if (!this.QueryBuilder) {
      this.QueryBuilder = class ExtendedQueryBuilder extends QueryBuilder { }
    }

    this.QueryBuilder.prototype[name] = fn
    return this
  }

  /**
   * Adds a new hook for a given event type.
   *
   * @method addHook
   *
   * @param  {String} forEvent
   * @param  {Function|String|Array} handlers
   *
   * @chainable
   *
   * @static
   */
  static addHook (forEvent, handlers) {
    const [cycle, event] = util.getCycleAndEvent(forEvent)

    /**
     * If user has defined wrong hook cycle, do let them know
     */
    if (!this.$hooks[cycle]) {
      throw GE.InvalidArgumentException.invalidParameter(`Invalid hook event {${forEvent}}`)
    }

    /**
     * Add the handlers
     */
    handlers = Array.isArray(handlers) ? handlers : [handlers]
    handlers.forEach((handler) => {
      this.$hooks[cycle].addHandler(event, handler)
    })

    return this
  }

  /**
   * Adds the global scope to the model global scopes.
   *
   * You can also give name to the scope, since named
   * scopes can be removed when executing queries.
   *
   * @method addGlobalScope
   *
   * @param  {Function}     callback
   * @param  {String}       [name = null]
   */
  static addGlobalScope (callback, name = null) {
    if (typeof (callback) !== 'function') {
      throw GE
        .InvalidArgumentException
        .invalidParameter('Model.addGlobalScope expects a closure as first parameter', callback)
    }
    this.$globalScopes.push({ callback, name })
    return this
  }

  /**
   * Attach a listener to be called everytime a query on
   * the model is executed.
   *
   * @method onQuery
   *
   * @param  {Function} callback
   *
   * @chainable
   */
  static onQuery (callback) {
    if (typeof (callback) !== 'function') {
      throw GE
        .InvalidArgumentException
        .invalidParameter('Model.onQuery expects a closure as first parameter', callback)
    }

    this.$queryListeners.push(callback)
    return this
  }

  /**
   * Adds a new trait to the model. Ideally it does a very
   * simple thing and that is to pass the model class to
   * your trait and you own it from there.
   *
   * @method addTrait
   *
   * @param  {Function|String} trait - A plain function or reference to IoC container string
   */
  static addTrait (trait, options = {}) {
    if (typeof (trait) !== 'function' && typeof (trait) !== 'string') {
      throw GE
        .InvalidArgumentException
        .invalidParameter('Model.addTrait expects an IoC container binding or a closure', trait)
    }

    /**
     * If trait is a string, then point to register function
     */
    trait = typeof (trait) === 'string' ? `${trait}.register` : trait
    const { method } = resolver.forDir('modelTraits').resolveFunc(trait)
    method(this, options)
  }

  /**
   * Creates a new model instances from payload
   * and also persist it to database at the
   * same time.
   *
   * @method create
   *
   * @param  {Object} payload
   *
   * @return {Model} Model instance is returned
   */
  static async create (payload) {
    const modelInstance = new this(payload)
    await modelInstance.save()
    return modelInstance
  }

  /**
   * Creates many instances of model in parallel.
   *
   * @method createMany
   *
   * @param  {Array} payloadArray
   *
   * @return {Array} Array of model instances is returned
   *
   * @throws {InvalidArgumentException} If payloadArray is not an array
   */
  static async createMany (payloadArray) {
    if (!Array.isArray(payloadArray)) {
      throw GE
        .InvalidArgumentException
        .invalidParameter(`${this.name}.createMany expects an array of values`, payloadArray)
    }
    return Promise.all(payloadArray.map((payload) => this.create(payload)))
  }

  /**
   * Returns an object of values dirty after persisting to
   * database or after fetching from database.
   *
   * @attribute dirty
   *
   * @return {Object}
   */
  get dirty () {
    return _.pickBy(this.$attributes, (value, key) => {
      return _.isUndefined(this.$originalAttributes[key]) || !_.isEqual(this.$originalAttributes[key], value)
    })
  }

  /**
   * Tells whether model is dirty or not
   *
   * @attribute isDirty
   *
   * @return {Boolean}
   */
  get isDirty () {
    return !!_.size(this.dirty)
  }

  /**
   * Returns a boolean indicating if model is
   * child of a parent model
   *
   * @attribute hasParent
   *
   * @return {Boolean}
   */
  get hasParent () {
    return !!this.$parent
  }

  /**
   * Formats the date fields from the payload, only
   * when they are marked as dates and there are
   * no setters defined for them.
   *
   * Note: This method will mutate the existing object. If
   * any part of your application doesn't want mutations
   * then pass a cloned copy of object
   *
   * @method _formatFields
   *
   * @param  {Object}          values
   *
   * @return {Object}
   *
   * @private
   */
  _formatFields (values) {
    // dates
    _(this.constructor.dates)
      .filter((key) => values[key] && typeof (this[util.getSetterName(key)]) !== 'function')
      .each((key) => { values[key] = this.constructor.formatDates(key, values[key]) })

    // objectID
    _(this.constructor.objectIDs)
      .filter((key) => values[key] && typeof (this[util.getSetterName(key)]) !== 'function')
      .each((key) => { values[key] = this.constructor.formatObjectID(key, values[key]) })

    // geometry
    _(this.constructor.geometries)
      .filter((key) => values[key] && typeof (this[util.getSetterName(key)]) !== 'function')
      .each((key) => { values[key] = this.constructor.formatGeometry(key, values[key]) })

    // bool
    _(this.constructor.booleans)
      .filter((key) => values[key] !== undefined && typeof (this[util.getSetterName(key)]) !== 'function')
      .each((key) => { values[key] = this.constructor.formatBoolean(key, values[key]) })

    return values
  }

  /**
   * Checks for existence of setter on model and if exists
   * returns the return value of setter, otherwise returns
   * the default value.
   *
   * @method _getSetterValue
   *
   * @param  {String}        key
   * @param  {Mixed}        value
   *
   * @return {Mixed}
   *
   * @private
   */
  _getSetterValue (key, value) {
    const setterName = util.getSetterName(key)
    if (typeof (this[setterName]) === 'function') {
      return this[setterName](value)
    }
    return this._convertFieldToObjectInstance(key, value)
  }

  /**
   * Checks for existence of getter on model and if exists
   * returns the return value of getter, otherwise returns
   * the default value
   *
   * @method _getGetterValue
   *
   * @param  {String}        key
   * @param  {Mixed}         value
   * @param  {Mixed}         [passAttrs = null]
   *
   * @return {Mixed}
   *
   * @private
   */
  _getGetterValue (key, value, passAttrs = null) {
    const getterName = util.getGetterName(key)
    return typeof (this[getterName]) === 'function' ? this[getterName](passAttrs || value) : value
  }

  /**
   * Sets `created_at` column on the values object.
   *
   * Note: This method will mutate the original object
   * by adding a new key/value pair.
   *
   * @method _setCreatedAt
   *
   * @param  {Object}     values
   *
   * @private
   */
  _setCreatedAt (values) {
    const createdAtColumn = this.constructor.createdAtColumn
    if (createdAtColumn) {
      values[createdAtColumn] = this._getSetterValue(createdAtColumn, new Date())
    }
  }

  /**
   * Sets `updated_at` column on the values object.
   *
   * Note: This method will mutate the original object
   * by adding a new key/value pair.
   *
   * @method _setUpdatedAt
   *
   * @param  {Object}     values
   *
   * @private
   */
  _setUpdatedAt (values) {
    const updatedAtColumn = this.constructor.updatedAtColumn
    if (updatedAtColumn) {
      values[updatedAtColumn] = this._getSetterValue(updatedAtColumn, new Date())
    }
  }

  /**
   * Sync the original attributes with actual attributes.
   * This is done after `save`, `update` and `find`.
   *
   * After this `isDirty` should return `false`.
   *
   * @method _syncOriginals
   *
   * @return {void}
   *
   * @private
   */
  _syncOriginals () {
    this.$originalAttributes = _.cloneDeep(this.$attributes)
  }

  /**
   * Insert values to the database. This method will
   * call before and after hooks for `create` and
   * `save` event.
   *
   * @method _insert
   * @async
   *
   * @return {Boolean}
   *
   * @private
   */
  async _insert () {
    /**
     * Executing before hooks
     */
    await this.constructor.$hooks.before.exec('create', this)

    /**
     * Set timestamps
     */
    this._setCreatedAt(this.$attributes)
    this._setUpdatedAt(this.$attributes)
    const attributes = this._formatFields(_.cloneDeep(this.$attributes))
    const result = await this.constructor
      .query()
      .insert(attributes)

    /**
     * Only set the primary key value when incrementing is
     * set to true on model
     */
    if (this.constructor.incrementing) {
      this.primaryKeyValue = result.insertedIds[0]
    }

    this.$persisted = true

    /**
     * Keep a clone copy of saved attributes, so that we can find
     * a diff later when calling the update query.
     */
    this._syncOriginals()

    /**
     * Executing after hooks
     */
    await this.constructor.$hooks.after.exec('create', this)
    return true
  }

  /**
   * Update model by updating dirty attributes to the database.
   *
   * @method _update
   * @async
   *
   * @return {Boolean}
   */
  async _update () {
    /**
     * Executing before hooks
     */
    await this.constructor.$hooks.before.exec('update', this)
    let affected = 0

    if (this.isDirty || _.size(this.$unsetAttributes)) {
      const dirty = this.dirty
      /**
       * Unset attributes
       */
      if (_.size(this.$unsetAttributes)) {
        dirty['$unset'] = this.$unsetAttributes
      }
      /**
       * Set proper timestamps
       */
      this._setUpdatedAt(this.$attributes)

      affected = await this.constructor
        .query()
        .where(this.constructor.primaryKey, this.primaryKeyValue)
        .ignoreScopes()
        .update(dirty)
    }

    /**
     * Executing after hooks
     */
    await this.constructor.$hooks.after.exec('update', this)
    if (this.isDirty || _.size(this.$unsetAttributes)) {
      /**
       * Sync originals to find a diff when updating for next time
       */
      this._syncOriginals()
    }
    return !!affected
  }

  /**
   * Converts all fields to objects: moment, ObjectID, GeoPoint, so
   * that you can transform them into something
   * else.
   *
   * @method _convertFieldToObjectInstances
   *
   * @return {void}
   *
   * @private
   */
  _convertFieldToObjectInstances () {
    this.constructor.dates.forEach((field) => {
      if (this.$attributes[field]) {
        this.$attributes[field] = this.constructor.parseDates(field, this.$attributes[field])
      }
    })
    this.constructor.objectIDs.forEach((field) => {
      if (this.$attributes[field]) {
        this.$attributes[field] = this.constructor.parseObjectID(field, this.$attributes[field])
      }
    })
    this.constructor.geometries.forEach((field) => {
      if (this.$attributes[field]) {
        this.$attributes[field] = this.constructor.parseGeometry(field, this.$attributes[field])
      }
    })
    this.constructor.booleans.forEach((field) => {
      if (this.$attributes[field]) {
        this.$attributes[field] = this.constructor.parseBoolean(field, this.$attributes[field])
      }
    })
  }

  /**
   * Set attribute on model instance. Setting properties
   * manually or calling the `set` function has no
   * difference.
   *
   * NOTE: this method will call the setter
   *
   * @method set
   *
   * @param  {String} name
   * @param  {Mixed} value
   *
   * @return {void}
   */
  set (name, value) {
    this.$attributes[name] = this._getSetterValue(name, value)
  }

  /**
   * Converts model to an object. This method will call getters,
   * cast dates and will attach `computed` properties to the
   * object.
   *
   * @method toObject
   *
   * @return {Object}
   */
  toObject () {
    let evaluatedAttrs = _.transform(this.$attributes, (result, value, key) => {
      /**
       * If value is an instance of moment and there is no getter defined
       * for it, then cast it as a date.
       */
      if (value instanceof moment && typeof (this[util.getGetterName(key)]) !== 'function') {
        result[key] = this.constructor.castDates(key, value)
      } else if (value instanceof ObjectID && typeof (this[util.getGetterName(key)]) !== 'function') {
        result[key] = this.constructor.castObjectID(key, value)
      } else if (value instanceof GeoPoint && typeof (this[util.getGetterName(key)]) !== 'function') {
        result[key] = this.constructor.castGeometry(key, value)
      } else {
        result[key] = this._getGetterValue(key, value)
      }
      return result
    }, {})

    /**
     * Set computed properties when defined
     */
    _.each(this.constructor.computed || [], (key) => {
      evaluatedAttrs[key] = this._getGetterValue(key, null, evaluatedAttrs)
    })

    /**
     * Pick visible fields or remove hidden fields
     */
    if (Array.isArray(this.$visible)) {
      evaluatedAttrs = _.pick(evaluatedAttrs, this.$visible)
    } else if (Array.isArray(this.$hidden)) {
      evaluatedAttrs = _.omit(evaluatedAttrs, this.$hidden)
    }

    return evaluatedAttrs
  }

  /**
   * Persist model instance to the database. It will create
   * a new row when model has not been persisted already,
   * otherwise will update it.
   *
   * @method save
   * @async
   *
   * @return {Boolean} Whether or not the model was persisted
   */
  async save () {
    return this.isNew ? this._insert() : this._update()
  }

  /**
   * Deletes the model instance from the database. Also this
   * method will freeze the model instance for updates.
   *
   * @method delete
   * @async
   *
   * @return {Boolean}
   */
  async delete () {
    /**
     * Executing before hooks
     */
    await this.constructor.$hooks.before.exec('delete', this)

    const response = await this.constructor
      .query()
      .where(this.constructor.primaryKey, this.primaryKeyValue)
      .ignoreScopes()
      .delete()

    /**
     * If model was delete then freeze it modifications
     */
    if (response.result.n > 0) {
      this.freeze()
    }

    /**
     * Executing after hooks
     */
    await this.constructor.$hooks.after.exec('delete', this)
    return !!response.result.ok
  }

  /**
   * Perform required actions to newUp the model instance. This
   * method does not call setters since it is supposed to be
   * called after `fetch` or `find`.
   *
   * @method newUp
   *
   * @param  {Object} row
   *
   * @return {void}
   */
  newUp (row) {
    this.$persisted = true
    this.$attributes = row
    this._convertFieldToObjectInstances()
    this._syncOriginals()
  }

  /**
   * Find a row using the primary key
   *
   * @method find
   * @async
   *
   * @param  {String|Number} value
   *
   * @return {Model|Null}
   */
  static find (value) {
    return this.findBy(this.primaryKey, value)
  }

  /**
   * Find a row using the primary key or
   * fail with an exception
   *
   * @method findByOrFail
   * @async
   *
   * @param  {String|Number}     value
   *
   * @return {Model}
   *
   * @throws {ModelNotFoundException} If unable to find row
   */
  static findOrFail (value) {
    return this.findByOrFail(this.primaryKey, value)
  }

  /**
   * Find a model instance using key/value pair
   *
   * @method findBy
   * @async
   *
   * @param  {String} key
   * @param  {String|Number} value
   *
   * @return {Model|Null}
   */
  static findBy (key, value) {
    return this.query().where(key, value).first()
  }

  /**
   * Find a model instance using key/value pair or
   * fail with an exception
   *
   * @method findByOrFail
   * @async
   *
   * @param  {String}     key
   * @param  {String|Number}     value
   *
   * @return {Model}
   *
   * @throws {ModelNotFoundException} If unable to find row
   */
  static findByOrFail (key, value) {
    return this.query().where(key, value).firstOrFail()
  }

  /**
   * Returns the first row. This method will add orderBy asc
   * clause
   *
   * @method first
   * @async
   *
   * @return {Model|Null}
   */
  static first () {
    return this.query().orderBy(this.primaryKey, 'asc').first()
  }

  /**
   * Returns the first row or throw an exception.
   * This method will add orderBy asc clause.
   *
   * @method first
   * @async
   *
   * @return {Model}
   *
   * @throws {ModelNotFoundException} If unable to find row
   */
  static firstOrFail () {
    return this.query().orderBy(this.primaryKey, 'asc').firstOrFail()
  }

  /**
 * Find a row or create a new row when it doesn't
 * exists.
 *
 * @method findOrCreate
 * @async
 *
 * @param  {Object}     whereClause
 * @param  {Object}     payload
 * @param  {Object}     [trx]
 *
 * @return {Model}
 */
  static async findOrCreate (whereClause, payload, trx) {
    if (!payload) {
      payload = whereClause
    }

    /**
     * Find a row using where clause
     */
    const row = await this.query().where(whereClause).first()
    if (row) {
      return row
    }

    /**
     * Otherwise create one
     */
    return this.create(payload, trx)
  }

  /**
   * Find row from database or returns an instance of
   * new one.
   *
   * @method findOrNew
   *
   * @param  {Object}  whereClause
   * @param  {Object}  payload
   *
   * @return {Model}
   */
  static async findOrNew (whereClause, payload) {
    if (!payload) {
      payload = whereClause
    }

    /**
     * Find a row using where clause
     */
    const row = await this.query().where(whereClause).first()
    if (row) {
      return row
    }

    /**
     * Newup row and fill data
     */
    const newRow = new this()
    newRow.fill(payload)

    return newRow
  }

  /**
   * Fetch everything from the database
   *
   * @method all
   * @async
   *
   * @return {Collection}
   */
  static all () {
    return this.query().fetch()
  }

  /**
   * Sets a preloaded relationship on the model instance
   *
   * @method setRelated
   *
   * @param  {String}   key
   * @param  {Object|Array}   value
   *
   * @throws {RuntimeException} If trying to set a relationship twice.
   */
  setRelated (key, value) {
    if (this.$relations[key]) {
      throw CE.RuntimeException.overRidingRelation(key)
    }

    this.$relations[key] = value

    /**
     * Don't do anything when value doesn't exists
     */
    if (!value) {
      return
    }

    /**
     * Set parent on model instance if value is instance
     * of model.
     */
    if (value instanceof Model) {
      value.$parent = this.constructor.name
      return
    }

    /**
     * Otherwise loop over collection rows to set
     * the $parent.
     */
    _(value.rows)
      .filter((val) => !!val)
      .each((val) => (val.$parent = this.constructor.name))
  }

  /**
   * Returns the relationship value
   *
   * @method getRelated
   *
   * @param  {String}   key
   *
   * @return {Object}
   */
  getRelated (key) {
    return this.$relations[key]
  }

  /**
   * Loads relationships and set them as $relations
   * attribute.
   *
   * To load multiple relations, call this method for
   * multiple times
   *
   * @method load
   * @async
   *
   * @param  {String}   relation
   * @param  {Function} callback
   *
   * @return {void}
   */
  async load (relation, callback) {
    const eagerLoad = new EagerLoad({ [relation]: callback })
    const result = await eagerLoad.loadForOne(this)
    _.each(result, (values, name) => this.setRelated(name, values))
  }

  /**
   * Just like @ref('Model.load') but instead loads multiple relations for a
   * single model instance.
   *
   * @method loadMany
   * @async
   *
   * @param  {Object} eagerLoadMap
   *
   * @return {void}
   */
  async loadMany (eagerLoadMap) {
    const eagerLoad = new EagerLoad(eagerLoadMap)
    const result = await eagerLoad.loadForOne(this)
    _.each(result, (values, name) => this.setRelated(name, values))
  }

  /**
   * Returns an instance of @ref('HasOne') relation.
   *
   * @method hasOne
   *
   * @param  {String|Class}  relatedModel
   * @param  {String}        primaryKey
   * @param  {String}        foreignKey
   *
   * @return {HasOne}
   */
  hasOne (relatedModel, primaryKey, foreignKey) {
    relatedModel = typeof (relatedModel) === 'string' ? ioc.use(relatedModel) : relatedModel

    primaryKey = primaryKey || this.constructor.primaryKey
    foreignKey = foreignKey || this.constructor.foreignKey
    return new HasOne(this, relatedModel, primaryKey, foreignKey)
  }

  /**
   * Returns an instance of @ref('HasMany') relation
   *
   * @method hasMany
   *
   * @param  {String|Class}  relatedModel
   * @param  {String}        primaryKey
   * @param  {String}        foreignKey
   *
   * @return {HasMany}
   */
  hasMany (relatedModel, primaryKey, foreignKey) {
    relatedModel = typeof (relatedModel) === 'string' ? ioc.use(relatedModel) : relatedModel

    primaryKey = primaryKey || this.constructor.primaryKey
    foreignKey = foreignKey || this.constructor.foreignKey
    return new HasMany(this, relatedModel, primaryKey, foreignKey)
  }

  /**
   * Returns an instance of @ref('BelongsTo') relation
   *
   * @method belongsTo
   *
   * @param  {String|Class}  relatedModel
   * @param  {String}        primaryKey
   * @param  {String}        foreignKey
   *
   * @return {BelongsTo}
   */
  belongsTo (relatedModel, primaryKey, foreignKey) {
    relatedModel = typeof (relatedModel) === 'string' ? ioc.use(relatedModel) : relatedModel

    primaryKey = primaryKey || relatedModel.foreignKey
    foreignKey = foreignKey || relatedModel.primaryKey
    return new BelongsTo(this, relatedModel, primaryKey, foreignKey)
  }

  /**
   * Returns an instance of @ref('BelongsToMany') relation
   *
   * @method belongsToMany
   *
   * @param  {Class|String}      relatedModel
   * @param  {String}            foreignKey
   * @param  {String}            relatedForeignKey
   * @param  {String}            primaryKey
   * @param  {String}            relatedPrimaryKey
   *
   * @return {BelongsToMany}
   */
  belongsToMany (relatedModel, foreignKey, relatedForeignKey, primaryKey, relatedPrimaryKey) {
    relatedModel = typeof (relatedModel) === 'string' ? ioc.use(relatedModel) : relatedModel

    foreignKey = foreignKey || this.constructor.foreignKey
    relatedForeignKey = relatedForeignKey || relatedModel.foreignKey
    primaryKey = primaryKey || this.constructor.primaryKey
    relatedPrimaryKey = relatedPrimaryKey || relatedModel.primaryKey

    return new BelongsToMany(this, relatedModel, primaryKey, foreignKey, relatedPrimaryKey, relatedForeignKey)
  }

  /**
   * Returns instance of @ref('HasManyThrough')
   *
   * @method manyThrough
   *
   * @param  {Class|String}    relatedModel
   * @param  {String}    relatedMethod
   * @param  {String}    primaryKey
   * @param  {String}    foreignKey
   *
   * @return {HasManyThrough}
   */
  manyThrough (relatedModel, relatedMethod, primaryKey, foreignKey) {
    relatedModel = typeof (relatedModel) === 'string' ? ioc.use(relatedModel) : relatedModel

    primaryKey = primaryKey || this.constructor.primaryKey
    foreignKey = foreignKey || this.constructor.foreignKey

    return new HasManyThrough(this, relatedModel, relatedMethod, primaryKey, foreignKey)
  }

  /**
   * Returns instance of @ref('MorphMany')
   *
   * @method morphMany
   *
   * @param  {Class|String}    relatedModel
   * @param  {String}    determiner
   * @param  {String}    localKey
   * @param  {String}    primaryKey
   *
   * @return {MorphMany}
   */
  morphMany (relatedModel, determiner, localKey, primaryKey) {
    relatedModel = typeof (relatedModel) === 'string' ? ioc.use(relatedModel) : relatedModel

    primaryKey = primaryKey || this.constructor.primaryKey

    return new MorphMany(this, relatedModel, determiner, localKey, primaryKey)
  }

  /**
   * Returns instance of @ref('MorphOne')
   *
   * @method morphOne
   *
   * @param  {Class|String}    relatedModel
   * @param  {String}    determiner
   * @param  {String}    localKey
   * @param  {String}    primaryKey
   *
   * @return {MorphOne}
   */
  morphOne (relatedModel, determiner, localKey, primaryKey) {
    relatedModel = typeof (relatedModel) === 'string' ? ioc.use(relatedModel) : relatedModel

    primaryKey = primaryKey || this.constructor.primaryKey

    return new MorphOne(this, relatedModel, determiner, localKey, primaryKey)
  }

  /**
   * Returns instance of @ref('MorphTo')
   *
   * @method morphTo
   *
   * @param  {Class|String}    relatedModel
   * @param  {String}    modelPath
   * @param  {String}    determiner
   * @param  {String}    primaryKey
   * @param  {String}    foreignKey
   *
   * @return {MorphMany}
   */
  morphTo (modelPath, determiner, primaryKey, foreignKey) {
    primaryKey = primaryKey || this.constructor.primaryKey

    return new MorphTo(this, modelPath, determiner, primaryKey, foreignKey)
  }

  /**
   * Returns instance of @EmbedsMany')
   *
   * @method embedsMany
   *
   * @param  {Class|String}    relatedModel
   * @param  {String}    modelPath
   * @param  {String}    primaryKey
   * @param  {String}    foreignKey
   *
   * @return {EmbedsMany}
   */
  embedsMany (relatedModel, primaryKey, foreignKey) {
    relatedModel = typeof (relatedModel) === 'string' ? ioc.use(relatedModel) : relatedModel

    primaryKey = primaryKey || this.constructor.primaryKey

    return new EmbedsMany(this, relatedModel, primaryKey, foreignKey)
  }

  /**
   * Returns instance of @ref('EmbedsOne')
   *
   * @method embedsOne
   *
   * @param  {Class|String}    relatedModel
   * @param  {String}    modelPath
   * @param  {String}    primaryKey
   * @param  {String}    foreignKey
   *
   * @return {EmbedsOne}
   */
  embedsOne (relatedModel, primaryKey, foreignKey) {
    relatedModel = typeof (relatedModel) === 'string' ? ioc.use(relatedModel) : relatedModel

    primaryKey = primaryKey || this.constructor.primaryKey

    return new EmbedsOne(this, relatedModel, primaryKey, foreignKey)
  }

  /**
   * Returns instance of @ref('ReferMany')
   *
   * @method referMany
   *
   * @param  {Class|String}    relatedModel
   * @param  {String}    modelPath
   * @param  {String}    primaryKey
   * @param  {String}    foreignKey
   *
   * @return {ReferMany}
   */
  referMany (relatedModel, primaryKey, foreignKey) {
    relatedModel = typeof (relatedModel) === 'string' ? ioc.use(relatedModel) : relatedModel

    primaryKey = primaryKey || this.constructor.primaryKey
    foreignKey = foreignKey || relatedModel.foreignKey

    return new ReferMany(this, relatedModel, primaryKey, foreignKey)
  }

  /**
   * Reload the model instance in memory. Some may
   * not like it, but in real use cases no one
   * wants a new instance.
   *
   * @method reload
   *
   * @return {void}
   */
  async reload () {
    if (this.$frozen) {
      throw GE.RuntimeException.invoke('Cannot reload a deleted model instance')
    }

    if (!this.isNew) {
      const newInstance = await this.constructor.find(this.primaryKeyValue)
      if (!newInstance) {
        throw GE
          .RuntimeException
          .invoke(`Cannot reload model since row with ${this.constructor.primaryKey} ${this.primaryKeyValue} has been removed`)
      }
      this.newUp(newInstance.$attributes)
    }
  }
}

/**
 * shorthand to get access to the methods on
 * query builder chain.
 */
const shortHands = [
  'fetch',
  'first',
  'pick',
  'pickInverse',
  'pair',
  'ids',
  'select',
  'where',
  'whereIn',
  'with',
  'limit',
  'sort',
  'count',
  'max',
  'min',
  'sum',
  'avg',
  'distinct'
]

shortHands.map(method => {
  Model[method] = function (...args) {
    const query = this.query()
    return query[method].apply(query, args)
  }
})

module.exports = Model
