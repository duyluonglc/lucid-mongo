'use strict'

const FieldTypes = exports = module.exports = {}
const moment = require('moment')
const GeoPoint = require('geopoint')
const _ = require('lodash')

/**
 *
 * @method getValueWithType
 *
 * @param  {Object}           values
 * @return {Object}
 *
 * @public
 */
FieldTypes.getValueWithType = function (key, value) {
  if (this.constructor.dateFields && this.constructor.dateFields.indexOf(key) > -1) {
    return moment(value)
  }
  if (this.constructor.geoFields && this.constructor.geoFields.indexOf(key) > -1) {
    return new GeoPoint(value.lat, value.lng)
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
  if (this.constructor.dateFields && this.constructor.dateFields.indexOf(key) > -1 && moment.isMoment(value)) {
    return this.formatDate(value)
  }
  if (this.constructor.geoFields && this.constructor.geoFields.indexOf(key) > -1 && value instanceof GeoPoint) {
    return {
      lat: value.latitude(),
      lng: value.longitude()
    }
  }
  return value
}

/**
 *
 * @method getStoreAbleValues
 *
 * @param  {Object}           values
 * @return {Object}
 *
 * @public
 */
FieldTypes.getStoreAbleValues = function (values) {
  return _(values).transform((result, value, key) => {
    if (this.constructor.dateFields && this.constructor.dateFields.indexOf(key) > -1) {
      result[key] = value.toISOString()
    } else if (this.constructor.geoFields && this.constructor.geoFields.indexOf(key) > -1) {
      result[key] = {
        type: 'Point',
        coordinates: [
          value.longitude(),
          value.latitude()
        ]
      }
    } else {
      result[key] = value
    }
  }).value()
}

/**
 *
 * @method fillDataFromDb
 *
 * @param  {Object}           values
 * @return {Object}
 *
 * @public
 */
FieldTypes.fillDataFromDb = function (values) {
  _.map(values, (value, key) => {
    if (this.constructor.dateFields && this.constructor.dateFields.indexOf(key) > -1) {
      this.attributes[key] = moment(value)
    } else if (this.constructor.geoFields && this.constructor.geoFields.indexOf(key) > -1 &&
      _.isObject(value) && _.isArray(value.coordinates)) {
      this.attributes[key] = new GeoPoint(value.coordinates[1], value.coordinates[0])
    } else {
      this.attributes[key] = value
    }
  })
  return this
}
