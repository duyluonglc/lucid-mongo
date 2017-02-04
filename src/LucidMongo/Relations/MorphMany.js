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
const helpers = require('../QueryBuilder/helpers')
const CE = require('../../Exceptions')
const logger = new CatLog('adonis:lucid')

class MorphMany extends Relation {

  constructor (parent, related, determine, primaryKey, foreignKey) {
    super(parent, related)
    this.fromKey = primaryKey || this.parent.constructor.primaryKey
    this.toKey = foreignKey || this.parent.constructor.foreignKey
    this.determine = determine || 'parent'
  }

  /**
   * will eager load the relation for multiple values on related
   * model and returns an object with values grouped by foreign
   * key.
   *
   * @param {Array} values
   * @return {Object}
   *
   * @public
   *
   */
  * eagerLoad (values, scopeMethod) {
    if (typeof (scopeMethod) === 'function') {
      scopeMethod(this.relatedQuery)
    }
    const results = yield this.relatedQuery
      .where(`${this.determine}_type`, this.parent.constructor.name)
      .whereIn(`${this.determine}_id`, values).fetch()

    return results.groupBy((item) => {
      return item[`${this.determine}_id`]
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
   * @return {Object}
   *
   * @public
   *
   */
  * eagerLoadSingle (value, scopeMethod) {
    if (typeof (scopeMethod) === 'function') {
      scopeMethod(this.relatedQuery)
    }
    const results = yield this.relatedQuery
      .where(`${this.determine}_type`, this.parent.constructor.name)
      .where(`${this.determine}_id`, value).fetch()
    const response = {}
    response[value] = results
    return response
  }

  /**
   * Save related instance
   *
   * @param {any} relatedInstance
   * @returns
   *
   * @memberOf MorphMany
   */
  * save (relatedInstance) {
    if (relatedInstance instanceof this.related === false) {
      throw CE.ModelRelationException.relationMisMatch('save accepts an instance of related model')
    }
    if (this.parent.isNew()) {
      throw CE.ModelRelationException.unSavedTarget('save', this.parent.constructor.name, this.related.name)
    }
    if (!this.parent[this.fromKey]) {
      logger.warn(`Trying to save relationship with ${this.fromKey} as primaryKey, whose value is falsy`)
    }
    relatedInstance.set(`${this.determine}_type`, this.parent.constructor.name)
    relatedInstance.set(`${this.determine}_id`, this.parent[this.fromKey])
    return yield relatedInstance.save()
  }
}

module.exports = MorphMany
