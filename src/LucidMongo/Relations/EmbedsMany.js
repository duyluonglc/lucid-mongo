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
const inflect = use('inflect')
const uuid = use('uuid')
const _ = use('lodash')
const CE = require('../../Exceptions')
const CatLog = require('cat-log')
const logger = new CatLog('adonis:lucid')

class EmbedMany extends Relation {

  constructor (parent, related, primaryKey, foreignKey) {
    super(parent, related)
    this.fromKey = primaryKey || this.parent.constructor.primaryKey
    this.toKey = foreignKey || inflect.camelize(inflect.pluralize(this.related.name), false)
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
    let embedItems = this.parent.get(this.toKey) ? _.clone(this.parent.get(this.toKey)) : []
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

  /**
   * Remove related instance
   *
   * @param {any} id
   * @returns
   *
   * @memberOf EmbedMany
   */
  * delete (references) {
    if (this.parent.isNew()) {
      throw CE.ModelRelationException.unSavedTarget('delete', this.parent.constructor.name, this.references.name)
    }
    if (!references) {
      throw CE.InvalidArgumentException.invalidParameter('delete expects a primary key or array of primary key')
    }
    if (!this.parent[this.fromKey]) {
      logger.warn(`Trying to save relationship with ${this.fromKey} as primaryKey, whose value is falsy`)
    }
    let embedItems = _.clone(this.parent.get(this.toKey))
    if (!embedItems || !_.isArray(embedItems)) {
      embedItems = []
    }

    if (_.isArray(references)) {
      references.forEach(reference => {
        _.remove(embedItems, item => item[this.fromKey] === (_.isObject(reference) ? reference[this.fromKey] : reference))
      })
    } else {
      _.remove(embedItems, item => item[this.fromKey] === (_.isObject(references) ? references[this.fromKey] : references))
    }
    this.parent.set(this.toKey, embedItems)
    return yield this.parent.save()
  }

  /**
   * delete all references
   *
   * @return {Number}
   *
   * @public
   */
  * deleteAll () {
    if (this.parent.isNew()) {
      throw CE.ModelRelationException.unSavedTarget('deleteAll', this.parent.constructor.name, this.related.name)
    }

    this.parent.unset(this.toKey)
    return yield this.parent.save()
  }

  /**
   * fetch
   *
   * @public
   *
   * @return {Array}
   */
  * fetch () {
    return helpers.toCollection(_.map(this.parent.get(this.toKey), embed => {
      const RelatedModel = this.related
      const modelInstance = new RelatedModel()
      modelInstance.attributes = embed
      modelInstance.exists = true
      modelInstance.original = _.clone(modelInstance.attributes)
      return modelInstance
    }))
  }

  /**
   * find
   *
   * @public
   *
   * @return {Object}
   */
  * find (id) {
    return this.fetch().find(item => item[this.fromKey] === id)
  }

  /**
   * fetch
   *
   * @public
   *
   * @return {Object}
   */
  * first () {
    return this.fetch().head()
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
}

module.exports = EmbedMany
