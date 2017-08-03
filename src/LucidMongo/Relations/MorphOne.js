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

class MorphOne extends BaseRelation {
  /**
   * Creates an instance of MorphOne.
   *
   * @param {String} parent
   * @param {String} related
   * @param {String} determiner
   * @param {String} foreignKey
   * @param {String} primaryKey
   *
   * @memberOf MorphOne
   */
  constructor (parent, related, determiner, foreignKey, primaryKey) {
    super(parent, related)
    this.fromKey = primaryKey || this.parent.constructor.primaryKey
    this.toKey = foreignKey || 'parentId'
    this.determiner = determiner || 'parentType'
  }

  /**
   * decorates the current query chain before execution
   */
  _decorateRead () {
    this.relatedQuery
      .where(this.determiner, this.parent.constructor.name)
      .where(this.toKey, this.parent[this.fromKey])
  }

  /**
   * empty placeholder to be used when unable to eagerload
   * relations. It needs to be an array of many to many
   * relationships.
   *
   * @method eagerLoadFallbackValue
   *
   * @return {Null}
   */
  get eagerLoadFallbackValue () {
    return null
  }

  /**
   * calls the fetch method on the related query builder
   *
   * @return {Object}
   *
   * @public
   */
  fetch () {
    return this.first()
  }

  /**
   * morphOne cannot have paginate, since it
   * maps one to one relationship
   *
   * @public
   *
   * @throws CE.ModelRelationException
   */
  paginate () {
    throw CE.ModelRelationException.unSupportedMethod(
      'paginate',
      this.constructor.name
    )
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
    if (typeof scopeMethod === 'function') {
      scopeMethod(this.relatedQuery)
    }
    const results = yield this.relatedQuery
      .where(this.determiner, this.parent.constructor.name)
      .whereIn(this.toKey, values)
      .fetch()

    return results
      .keyBy(item => {
        return item[this.toKey]
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
    if (typeof scopeMethod === 'function') {
      scopeMethod(this.relatedQuery)
    }
    const results = yield this.relatedQuery
      .where(this.determiner, this.parent.constructor.name)
      .where(this.toKey, value)
      .first()
    const response = {}
    response[value] = results
    return response
  }

  /**
   * morphOne cannot have createMany, since it
   * maps one to one relationship
   *
   * @public
   *
   * @throws CE.ModelRelationException
   */
  * createMany () {
    throw CE.ModelRelationException.unSupportedMethod(
      'createMany',
      this.constructor.name
    )
  }

  /**
   * morphOne cannot have saveMany, since it
   * maps one to one relationship
   *
   * @public
   *
   * @throws CE.ModelRelationException
   */
  * saveMany () {
    throw CE.ModelRelationException.unSupportedMethod(
      'saveMany',
      this.constructor.name
    )
  }

  /**
   * Save related instance
   *
   * @param {any} relatedInstance
   * @returns
   *
   * @memberOf MorphOne
   */
  * save (relatedInstance) {
    if (relatedInstance instanceof this.related === false) {
      throw CE.ModelRelationException.relationMisMatch(
        'save accepts an instance of related model'
      )
    }
    if (this.parent.isNew()) {
      throw CE.ModelRelationException.unSavedTarget(
        'save',
        this.parent.constructor.name,
        this.related.name
      )
    }
    if (!this.parent[this.fromKey]) {
      logger.warn(
        `Trying to save relationship with ${this.fromKey} as primaryKey, whose value is falsy`
      )
    }
    relatedInstance.set(this.determiner, this.parent.constructor.name)
    relatedInstance.set(this.toKey, this.parent[this.fromKey])
    return yield relatedInstance.save()
  }
}

module.exports = MorphOne
