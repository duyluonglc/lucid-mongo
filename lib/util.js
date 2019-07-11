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
const pluralize = require('pluralize')

const util = exports = module.exports = {}

/**
 * Makes the collection name from the model name
 *
 * @method makeCollectionName
 *
 * @param  {String}      modelName
 *
 * @return {String}
 */
util.makeCollectionName = (modelName, camelCase = false) => camelCase
  ? _.camelCase(pluralize(modelName))
  : _.snakeCase(pluralize(modelName))

/**
 * Makes the setter name for a given field name
 *
 * @method
 *
 * @param  {String} fieldName
 *
 * @return {String}
 */
util.getSetterName = (fieldName) => `set${_.upperFirst(_.camelCase(fieldName))}`

/**
 * Makes the getter name for a given field name
 *
 * @method
 *
 * @param  {String} fieldName
 *
 * @return {String}
 */
util.getGetterName = (fieldName) => `get${_.upperFirst(_.camelCase(fieldName))}`

/**
 * Makes the scope name for a given field.
 *
 * @method
 *
 * @param  {String} fieldName
 *
 * @return {String}
 */
util.makeScopeName = (fieldName) => `scope${_.upperFirst(fieldName)}`

/**
 * Makes the foreignkey for the a given model name
 *
 * @method
 *
 * @param  {String} fieldName
 *
 * @return {String}
 */
util.makeForeignKey = (fieldName, camelCase = false) => camelCase
  ? `${_.camelCase(pluralize.singular(fieldName))}Id`
  : `${_.snakeCase(pluralize.singular(fieldName))}_id`

/**
 * Returns the event name and cycle for a given event
 *
 * @method
 *
 * @param  {String} eventName
 *
 * @return {Array}
 */
util.getCycleAndEvent = (eventName) => {
  const tokens = eventName.match(/^(before|after)(\w+)/)

  if (!tokens) {
    return []
  }

  return [tokens[1], tokens[2].toLowerCase()]
}

/**
 * Makes the pivot collection by concating both the names with _ and first
 * converting them to snake case and singular form
 *
 * @method makePivotCollectionName
 *
 * @param  {String}           modelName
 * @param  {String}           relatedModelName
 *
 * @return {String}
 */
util.makePivotCollectionName = function (modelName, relatedModelName, camelCase = false) {
  modelName = _.camelCase(pluralize.singular(modelName))
  relatedModelName = camelCase
    ? _.upperFirst(_.camelCase(pluralize.singular(relatedModelName)))
    : _.snakeCase(pluralize.singular(relatedModelName))
  return _.sortBy([modelName, relatedModelName]).join(camelCase ? '' : '_')
}

/**
 * Makes the embed name
 *
 * @method makeEmbedName
 *
 * @param  {String}           modelName
 *
 * @return {String}
 */
util.makeEmbedName = function (modelName, camelCase = false) {
  return camelCase ? _.camelCase(pluralize.singular(modelName)) : _.snakeCase(pluralize.singular(modelName))
}

/**
 * Makes the embeds name
 *
 * @method makeEmbedsName
 *
 * @param  {String}           modelName
 *
 * @return {String}
 */
util.makeEmbedsName = function (modelName, camelCase = false) {
  return camelCase ? _.camelCase(pluralize.plural(modelName)) : _.snakeCase(pluralize.plural(modelName))
}

/**
 * make meta data for paginated results.
 *
 * @method makePaginateMeta
 *
 * @param  {Number}         total
 * @param  {Number}         page
 * @param  {Number}         perPage
 * @return {Object}
 *
 * @public
 */
util.makePaginateMeta = function (total, page, perPage) {
  const resultSet = {
    total: total,
    page: page,
    perPage: perPage,
    lastPage: 0,
    data: []
  }
  if (total > 0) {
    resultSet.lastPage = Math.ceil(total / perPage)
  }
  return resultSet
}
