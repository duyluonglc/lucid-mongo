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
const BaseRelation = require('./BaseRelation')
const CE = require('../../Exceptions')

class MorphMany extends BaseRelation {
  /**
   * Creates an instance of MorphMany.
   *
   * @param {String} parent
   * @param {String} related
   * @param {String} determiner
   * @param {String} foreignKey
   * @param {String} primaryKey
   *
   * @memberOf MorphMany
   */
  constructor (parent, related, determiner, foreignKey, primaryKey) {
    super(parent, related)
    this.fromKey = primaryKey || this.parent.constructor.primaryKey
    this.toKey = foreignKey || 'parentId'
    this.determiner = determiner || 'parentType'
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
      .where(this.determiner, this.parent.constructor.name)
      .whereIn(this.toKey, values).fetch()

    return results.groupBy((item) => {
      return item[this.toKey]
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
      .where(this.determiner, this.parent.constructor.name)
      .where(this.toKey, value).fetch()
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
    relatedInstance.set(this.determiner, this.parent.constructor.name)
    relatedInstance.set(this.toKey, this.parent[this.fromKey])
    return yield relatedInstance.save()
  }
}

module.exports = MorphMany
