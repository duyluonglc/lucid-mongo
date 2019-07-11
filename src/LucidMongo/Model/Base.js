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
const VanillaSerializer = require('../Serializers/Vanilla')
const { ioc } = require('../../../lib/iocResolver')
const GE = require('@adonisjs/generic-exceptions')
// const DATE_FORMAT = 'YYYY-MM-DD HH:mm:ss'

/**
 * The base model to share attributes with Lucid
 * model and the Pivot model.
 *
 * @class BaseModel
 * @constructor
 */
class BaseModel {
  constructor (attributes = {}) {
    this._instantiate()
    this.fill(attributes)
    return new Proxy(this, require('./proxyHandler'))
  }

  /**
   * The attributes to be considered as dates. By default
   * @ref('Model.createdAtColumn') and @ref('Model.updatedAtColumn')
   * are considered as dates.
   *
   * @attribute dates
   *
   * @return {Array}
   *
   * @static
   */
  static get dates () {
    const dates = []
    if (this.createdAtColumn) { dates.push(this.createdAtColumn) }
    if (this.updatedAtColumn) { dates.push(this.updatedAtColumn) }
    return dates
  }

  /**
   * The attributes to be considered as ObjectID.
   * By default ['_id'] are considered as ObjectID.
   *
   * @attribute objectIDs
   *
   * @return {Array}
   *
   * @static
   */
  static get objectIDs () {
    return [this.primaryKey]
  }

  /**
   * The attributes to be considered as location. By default [] are considered as location.
   *
   * @attribute geometries
   *
   * @return {Array}
   *
   * @static
   */
  static get geometries () {
    return []
  }

  /**
   * Boolean fields will auto convert to boolean
   *
   * @return {Array}
   *
   * @public
   */
  static get booleans () {
    return []
  }

  /**
   * The attribute name for created at timestamp.
   *
   * @attribute createdAtColumn
   *
   * @return {String}
   *
   * @static
   */
  static get createdAtColumn () {
    return 'created_at'
  }

  /**
   * The attribute name for updated at timestamp.
   *
   * @attribute updatedAtColumn
   *
   * @return {String}
   *
   * @static
   */
  static get updatedAtColumn () {
    return 'updated_at'
  }

  /**
   * The serializer to be used for serializing
   * data. The return value must always be a
   * ES6 class.
   *
   * By default Lucid uses @ref('VanillaSerializer')
   *
   * @attribute Serializer
   *
   * @return {Class}
   */
  static get Serializer () {
    return VanillaSerializer
  }

  /**
   * The database connection to be used for
   * the model. Returning blank string will
   * use the `default` connection.
   *
   * @attribute connection
   *
   * @return {String}
   *
   * @static
   */
  static get connection () {
    return ''
  }

  static formatField (key, value) {
    if (this.dates.includes(key)) {
      return this.formatDates(key, value)
    }
    if (this.objectIDs.includes(key)) {
      return this.formatObjectID(key, value)
    }
    if (this.geometries.includes(key)) {
      return this.formatGeometry(key, value)
    }
    if (this.booleans.includes(key)) {
      return this.formatBoolean(key, value)
    }

    return value
  }

  /**
   * This method is executed for all the date fields
   * with the field name and the value. The return
   * value gets saved to the database.
   *
   * Also if you have defined a setter for a date field
   * this method will not be executed for that field.
   *
   * @method formatDates
   *
   * @param  {String}    key
   * @param  {String|Date}    value
   *
   * @return {String}
   */
  static formatDates (key, value) {
    return moment.isMoment(value) ? value.toDate() : moment.utc(value).toDate()
  }

  /**
   * Format objectID fields
   *
   * @method formatObjectID
   *
   * @param  {String}    key
   * @param  {String|ObjectID}    value
   *
   * @return {String}
   */
  static formatObjectID (key, value) {
    try {
      if (Array.isArray(value)) {
        return _.map(value, item => this.formatObjectID(key, item))
      } else {
        return ObjectID(value)
      }
    } catch (_) {}
    return value
  }

  /**
   * Format boolean fields
   *
   * @method formatBooleans
   *
   * @param  {String}    key
   * @param  {Any}    value
   *
   * @return {String}
   */
  static formatBoolean (key, value) {
    if (_.isObject(value)) {
      return value
    } else {
      return !!value
    }
  }

  /**
   * Format geometry fields
   *
   * @method formatGeometry
   *
   * @param  {String}    key
   * @param  {Object|Geometry}    value
   *
   * @return {String}
   */
  static formatGeometry (key, value) {
    return value instanceof GeoPoint ? value.toGeoJSON() : value
  }

  /**
   * Resolves the serializer for the current model.
   *
   * If serializer is a string, then it is resolved using
   * the Ioc container, otherwise it is assumed that
   * a `class` is returned.
   *
   * @method resolveSerializer
   *
   * @returns {Class}
   */
  static resolveSerializer () {
    return typeof (this.Serializer) === 'string' ? ioc.use(this.Serializer) : this.Serializer
  }

  /**
   * This method is executed when toJSON is called on a
   * model or collection of models. The value received
   * will always be an instance of momentjs and return
   * value is used.
   *
   * NOTE: This method will not be executed when you define
   * a getter for a given field.
   *
   * @method castDates
   *
   * @param  {String}  key
   * @param  {Moment}  value
   *
   * @return {String}
   *
   * @static
   */
  static castDates (key, value) {
    return value.toISOString()
  }

  /**
   * This method is executed when toJSON is called on a
   * model or collection of models.
   *
   * @method castObjectID
   *
   * @param  {String}  key
   * @param  {Moment}  value
   *
   * @return {String}
   *
   * @static
   */
  static castObjectID (key, value) {
    return String(value)
  }

  /**
   * This method is executed when toJSON is called on a
   * model or collection of models.
   *
   * @method castGeometry
   *
   * @param  {String}  key
   * @param  {Moment}  value
   *
   * @return {String}
   *
   * @static
   */
  static castGeometry (key, value) {
    return value instanceof GeoPoint ? value.toObject() : value
  }

  /**
   * This method is executed when set value of attribute.
   *
   * @param {String} key
   * @param {any} value
   * @returns {any}
   */
  _convertFieldToObjectInstance (key, value) {
    if (this.constructor.dates.includes(key)) {
      return this.constructor.parseDates(key, value)
    }
    if (this.constructor.objectIDs.includes(key)) {
      return this.constructor.parseObjectID(key, value)
    }
    if (this.constructor.geometries.includes(key)) {
      return this.constructor.parseGeometry(key, value)
    }
    if (this.constructor.booleans.includes(key)) {
      return this.constructor.parseBoolean(key, value)
    }

    return value
  }

  /**
   * This method is executed when set value of attribute.
   *
   * @method parseDates
   *
   * @param  {String}  key
   * @param  {String|Moment}  value
   *
   * @return {String}
   *
   * @static
   */
  static parseDates (key, value) {
    return (moment.isMoment(value) || !value) ? value : moment.utc(value)
  }

  /**
   * This method is executed when set value of attribute.
   *
   * @method parseObjectID
   *
   * @param  {String}  key
   * @param  {String|ObjectID}  value
   *
   * @return {ObjectID}
   *
   * @static
   */
  static parseObjectID (key, value) {
    if (value instanceof ObjectID || value === null) {
      return value
    } else if (_.isString(value)) {
      return ObjectID(value)
    } else if (Array.isArray(value) || _.isPlainObject(value)) {
      return _.map(value, item => this.parseObjectID(key, item))
    }
    throw GE
      .InvalidArgumentException
      .invalidParameter(`Can not convert ${JSON.stringify(value)} to mongo ObjectID`)
  }

  /**
   * This method is executed when set value of attribute.
   *
   * @method parseGeometry
   *
   * @param  {String}  key
   * @param  {Object}  value
   *
   * @return {GeoPoint}
   *
   * @static
   */
  static parseGeometry (key, value) {
    if (value instanceof GeoPoint) {
      return value
    }

    if (typeof value === 'object' && value.latitude !== undefined && value.longitude !== undefined) {
      return GeoPoint.fromObject(value)
    }

    if (typeof value === 'object' && value.type === 'Point' && value.coordinates !== undefined) {
      return GeoPoint.fromGeoJSON(value)
    }

    return value
  }

  /**
   * This method is executed when set value of attribute.
   *
   * @method parseBoolean
   *
   * @param  {String}  key
   * @param  {any}  value
   *
   * @return {bool}
   *
   * @static
   */
  static parseBoolean (key, value) {
    return !!value
  }

  /**
   * Tells whether model instance is new or
   * persisted to database.
   *
   * @attribute isNew
   *
   * @return {Boolean}
   */
  get isNew () {
    return !this.$persisted
  }

  /**
   * Returns a boolean indicating whether model
   * has been deleted or not
   *
   * @method isDeleted
   *
   * @return {Boolean}
   */
  get isDeleted () {
    return this.$frozen
  }

  /**
   * Instantiate the model by defining constructor properties
   * and also setting `__setters__` to tell the proxy that
   * these values should be set directly on the constructor
   * and not on the `attributes` object.
   *
   * @method instantiate
   *
   * @return {void}
   *
   * @private
   */
  _instantiate () {
    this.__setters__ = [
      '$attributes',
      '$unsetAttributes',
      '$persisted',
      'primaryKeyValue',
      '$originalAttributes',
      '$relations',
      '$sideLoaded',
      '$parent',
      '$frozen',
      '$visible',
      '$hidden'
    ]

    this.$attributes = {}
    this.$unsetAttributes = {}
    this.$persisted = false
    this.$originalAttributes = {}
    this.$relations = {}
    this.$sideLoaded = {}
    this.$parent = null
    this.$frozen = false
    this.$visible = this.constructor.visible
    this.$hidden = this.constructor.hidden
  }

  /**
   * Unset attribute
   *
   * @param {string} key
   */
  unset (key) {
    delete this.$attributes[key]
    this.$unsetAttributes[key] = true
  }

  /**
   * Set attributes on model instance in bulk.
   *
   * NOTE: Calling this method will remove the existing attributes.
   *
   * @method fill
   *
   * @param  {Object} attributes
   *
   * @return {void}
   */
  fill (attributes) {
    this.$attributes = {}
    this.merge(attributes)
  }

  /**
   * Merge attributes into on a model instance without
   * overriding existing attributes and their values
   *
   * @method merge
   *
   * @param  {Object} attributes
   *
   * @return {void}
   */
  merge (attributes) {
    _.each(attributes, (value, key) => this.set(key, value))
  }

  /**
   * Freezes the model instance for modifications
   *
   * @method freeze
   *
   * @return {void}
   */
  freeze () {
    this.$frozen = true
  }

  /**
   * Unfreezes the model allowing further modifications
   *
   * @method unfreeze
   *
   * @return {void}
   */
  unfreeze () {
    this.$frozen = false
  }

  /**
   * Converts model instance toJSON using the serailizer
   * toJSON method
   *
   * @method toJSON
   *
   * @return {Object}
   */
  toJSON () {
    return new this.constructor.Serializer(this, null, true).toJSON()
  }
}

module.exports = BaseModel
