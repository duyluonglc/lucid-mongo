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
  if (this.constructor.dateFields && this.constructor.dateFields.indexOf(key) > -1) {
    return this.formatDate(value)
  }
  if (this.constructor.geoFields && this.constructor.geoFields.indexOf(key) > -1) {
    return {
      lat: value.latitude(),
      lng: value.longitude()
    }
  }
  return value
}

/**
 *
 * @method getStoreValues
 *
 * @param  {Object}           values
 * @return {Object}
 *
 * @public
 */
FieldTypes.getStoreValues = function (values) {
  return _(values).transform((result, value, key) => {
    if (this.constructor.dateFields && this.constructor.dateFields.indexOf(key) > -1) {
      result[key] = value.toISOString()
    }
    if (this.constructor.geoFields && this.constructor.geoFields.indexOf(key) > -1) {
      result[key] = {
        type: 'Point',
        coordinates: [
          value.longitude(),
          value.latitude()
        ]
      }
    }
  }).value()
}
