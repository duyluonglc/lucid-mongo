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
  if (_.includes(this.constructor.boolFields, key)) {
    return !!value
  } else if (_.includes(this.constructor.dateFields, key)) {
    return moment(value)
  } else if (_.includes(this.constructor.geoFields, key)) {
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
  if (_.includes(this.constructor.boolFields, key)) {
    return !!value
  } else if (_.includes(this.constructor.dateFields, key) && moment.isMoment(value)) {
    return this.formatDate(value)
  } else if (_.includes(this.constructor.geoFields, key) && value instanceof GeoPoint) {
    return {
      lat: value.latitude(),
      lng: value.longitude()
    }
  }
  return value
}

/**
 *
 * @method getPersistanceFormat
 *
 * @param  {Object}           values
 * @return {Object}
 *
 * @public
 */
FieldTypes.getPersistanceFormat = function (values) {
  return _(values).transform((result, value, key) => {
    if (_.includes(this.constructor.boolFields, key)) {
      result[key] = !!value
    } else if (this.getTimestampKey(key) || _.includes(this.constructor.dateFields, key)) {
      result[key] = moment.isMoment(value) ? value.toDate() : value
    } else if (_.includes(this.constructor.geoFields, key) && value instanceof GeoPoint) {
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
      this.attributes[key] = value ? moment(value) : value
    } else if (_.includes(this.constructor.dateFields, key) && _.isObject(value) && _.isArray(value.coordinates)) {
      this.attributes[key] = new GeoPoint(value.coordinates[1], value.coordinates[0])
    } else {
      this.attributes[key] = value
    }
  })
  return this
}
