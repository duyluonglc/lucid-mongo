'use strict'

const FieldTypes = exports = module.exports = {}
const moment = require('moment')
const GeoPoint = require('geopoint')
const objectId = require('mongodb').ObjectID
const _ = require('lodash')

/**
 *
 * @method setValueWithType
 *
 * @param  {Object}           values
 * @return {Object}
 *
 * @public
 */
FieldTypes.setValueWithType = function (key, value) {
  if (_.includes(this.constructor.boolFields, key)) {
    return !!value
  } else if (_.includes(this.constructor.dateFields, key)) {
    return moment.utc(value)
  } else if (_.includes(this.constructor.geoFields, key)) {
    return new GeoPoint(value.lat, value.lng)
  } else if (_.includes(this.constructor.objectIdFields, key)) {
    if (_.isArray(value)) {
      return _.map(value, val => FieldTypes.setValueWithType(key, val))
    }
    return _.isString(value) && objectId.isValid(value) ? objectId(value) : value
  }
  return value
}

/**
 *
 * @method getFormatedField
 *
 * @param  {Object}           values
 * @return {Object}
 *
 * @public
 */
FieldTypes.getFormatedField = function (key, value) {
  if (_.includes(this.constructor.boolFields, key)) {
    return !!value
  } else if (_.includes(this.constructor.dateFields, key) && moment.isMoment(value)) {
    return this.formatDate(value)
  } else if (_.includes(this.constructor.geoFields, key) && value instanceof GeoPoint) {
    return {
      lat: value.latitude(),
      lng: value.longitude()
    }
  } else if (value instanceof objectId) {
    return String(value)
  }
  return value
}

/**
 *
 * @method getPersistanceValues
 *
 * @param  {Object}           values
 * @return {Object}
 *
 * @public
 */
FieldTypes.getPersistanceValues = function (values) {
  return _(values).transform((result, value, key) => {
    result[key] = this.getPersistanceValue(key, value)
  }).value()
}

FieldTypes.getPersistanceValue = function (key, value) {
  const self = this
  if (_.isArray(value)) {
    return _.map(value, val => self.getPersistanceValue(key, val))
  }
  if (_.includes(this.constructor.boolFields, key)) {
    return !!value
  } else if (this.getTimestampKey(key) || _.includes(this.constructor.dateFields, key)) {
    return moment.isMoment(value) ? value.toDate() : moment.utc(value).toDate()
  } else if (_.includes(this.constructor.geoFields, key) && value instanceof GeoPoint) {
    return {
      type: 'Point',
      coordinates: [
        value.longitude(),
        value.latitude()
      ]
    }
  } else if (_.includes(this.constructor.objectIdFields, key)) {
    return _.isString(value) && objectId.isValid(value) ? objectId(value) : value
  } else {
    return value
  }
}

/**
 *
 * @method parsePersistance
 *
 * @param  {Object}           values
 * @return {Object}
 *
 * @public
 */
FieldTypes.parsePersistance = function (values) {
  _.map(values, (value, key) => {
    if (_.includes(this.constructor.boolFields, key)) {
      this.attributes[key] = !!value
    } else if (this.getTimestampKey(key) || _.includes(this.constructor.dateFields, key)) {
      this.attributes[key] = value ? moment.utc(value) : value
    } else if (_.includes(this.constructor.geoFields, key) && _.isObject(value) && _.isArray(value.coordinates)) {
      this.attributes[key] = new GeoPoint(value.coordinates[1], value.coordinates[0])
    } else {
      this.attributes[key] = value
    }
  })
  return this
}
