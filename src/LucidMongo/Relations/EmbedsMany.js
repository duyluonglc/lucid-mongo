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
const uuid = use('uuid')
const _ = use('lodash')
const CE = require('../../Exceptions')
const CatLog = require('cat-log')
const logger = new CatLog('adonis:lucid')

class EmbedMany extends Relation {

  constructor (parent, related, primaryKey, foreignKey) {
    super(parent, related)
    this.fromKey = primaryKey || this.parent.constructor.primaryKey
    this.toKey = foreignKey || this.parent.related.foreignKey
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
    if (typeof (scopeMethod) === 'function') {
      scopeMethod(this.relatedQuery)
    }

    return _(results).keyBy(this.fromKey).mapValues((value) => {
      return helpers.toCollection(_.map(value[this.toKey], embed => {
        const RelatedModel = this.related
        const modelInstance = new RelatedModel()
        modelInstance.attributes = embed
        modelInstance.exists = true
        modelInstance.original = _.clone(modelInstance.attributes)
        return modelInstance
      }))
    }).value()
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
    const response = {}
    response[value] = helpers.toCollection(_.map(result[this.toKey], embed => {
      const RelatedModel = this.related
      const modelInstance = new RelatedModel()
      modelInstance.attributes = embed
      modelInstance.exists = true
      modelInstance.original = _.clone(modelInstance.attributes)
      return modelInstance
    }))
    return response
  }

  /**
   * Save related instance
   *
   * @param {any} relatedInstance
   * @returns
   *
   * @memberOf EmbedMany
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
    let embedItems = _.clone(this.parent.attributes[this.toKey])
    if (!embedItems || !_.isArray(embedItems)) {
      embedItems = []
    }
    if (!relatedInstance[this.fromKey]) {
      relatedInstance[this.fromKey] = uuid.v4()
      embedItems.push(relatedInstance.toJSON())
    } else {
      embedItems = embedItems.map(item => {
        return item[this.fromKey] === relatedInstance[this.fromKey] ? relatedInstance.toJSON() : item
      })
    }
    this.parent.set(this.toKey, embedItems)
    yield this.parent.save()
    return relatedInstance
  }
}

module.exports = EmbedMany
