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
   * @param {String} parentInstance
   * @param {String} related
   * @param {String} determiner
   * @param {String} localKey
   * @param {String} primaryKey
   *
   * @memberOf MorphMany
   */
  constructor (parentInstance, modelPath, determiner, localKey, primaryKey) {
    super(parentInstance, null)
    this.fromKey = primaryKey || this.parentInstance.constructor.primaryKey
    this.localKey = localKey || 'parent_id'
    this.modelPath = modelPath || 'App/Model'
    this.determiner = determiner || 'parent_type'
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
  async eagerLoad (values, scopeMethod, results) {
    const groups = _.groupBy(results, this.determiner)
    let relates = {}
    for (let determiner in groups) {
      const groupResults = groups[determiner]
      const relatedModel = this._resolveModel(this.modelPath + '/' + determiner)
      // this.relatedQuery = relatedModel.query()
      const parenIds = _(groupResults).map(this.localKey).uniq().value()
      let groupParent = await relatedModel.whereIn(this.fromKey, parenIds).fetch()
      for (let parentInstance of groupParent.value()) {
        const subResults = _.filter(groupResults, result => String(result[this.localKey]) === String(parentInstance[this.fromKey]))
        for (let result of subResults) {
          relates[result[this.fromKey]] = parentInstance
        }
      }
    }
    return relates
  }

  /**
   * Save related instance is not support
   *
   * @param {any} relatedInstance
   * @returns
   *
   * @memberOf MorphMany
   */
  async save (relatedInstance) {
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
  async paginate () {
    throw CE.ModelRelationException.unSupportedMethod('paginate', this.constructor.name)
  }

  /**
   *
   * @public
   *
   */
  first () {
    const determiner = this.parentInstance[this.determiner]
    const relatedModel = this._resolveModel(this.modelPath + '/' + determiner)
    return relatedModel.where(this.fromKey, this.parentInstance[this.localKey]).first()
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
