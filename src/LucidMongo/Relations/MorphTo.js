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
const CatLog = require('cat-log')
const logger = new CatLog('adonis:lucid')
const _ = require('lodash')

class MorphMany extends Relation {

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
  constructor (parent, modelPath, determiner, foreignKey, primaryKey) {
    super(parent, null)
    this.fromKey = primaryKey || this.parent.constructor.primaryKey
    this.toKey = foreignKey || 'parentId'
    this.modelPath = modelPath || 'App/Model'
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
  * eagerLoad (values, scopeMethod, results) {
    const groups = _.groupBy(results, this.determiner)
    let relates = {}
    for (let determiner in groups) {
      const groupResults = groups[determiner]
      const relatedModel = this._resolveModel(this.modelPath + '/' + determiner)
      // this.relatedQuery = relatedModel.query()
      const parentIds = _(groupResults).map(this.toKey).uniq().value()
      let groupParent = yield relatedModel.whereIn(this.fromKey, parentIds).fetch()
      for (let parent of groupParent.value()) {
        const subResults = _.filter(groupResults, result => String(result[this.toKey]) === String(parent[this.fromKey]))
        for (let result of subResults) {
          relates[result[this.fromKey]] = parent
        }
      }
    }
    return relates
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
  * eagerLoadSingle (value, scopeMethod, result) {
    if (typeof (scopeMethod) === 'function') {
      scopeMethod(this.relatedQuery)
    }
    const determiner = result[this.determiner]
    const relatedModel = this._resolveModel(this.modelPath + '/' + determiner)
    const relate = yield relatedModel.where(this.fromKey, result[this.toKey]).first()
    const response = {}
    response[value] = relate
    return response
  }

  /**
   * Save related instance is not support
   *
   * @param {any} relatedInstance
   * @returns
   *
   * @memberOf MorphMany
   */
  * save (relatedInstance) {
    throw CE.ModelRelationException.unSupportedMethod('paginate', this.constructor.name)
  }

  /**
   * belongsTo cannot have paginate, since it
   * maps one to one relationship
   *
   * @public
   *
   * @throws CE.ModelRelationException
   */
  paginate () {
    throw CE.ModelRelationException.unSupportedMethod('paginate', this.constructor.name)
  }

  /**
   *
   * @public
   *
   */
  * first () {
    const determiner = this.parent[this.determiner]
    const relatedModel = this._resolveModel(this.modelPath + '/' + determiner)
    return yield relatedModel.where(this.fromKey, this.parent[this.toKey]).first()
  }

  /**
   *
   * @public
   *
   */
  fetch () {
    return this.first()
  }
}

module.exports = MorphMany
