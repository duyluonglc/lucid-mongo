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
const GE = require('@adonisjs/generic-exceptions')
// const util = require('../../../lib/util')

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
  constructor (parentInstance, RelatedModel, determiner, localKey, primaryKey) {
    super(parentInstance, RelatedModel)
    this.primaryKey = primaryKey || RelatedModel.primaryKey
    this.localKey = localKey || 'parent_id'
    this.determiner = determiner || 'determiner'
  }

  /**
   * Persists the parent model instance if it's not
   * persisted already. This is done before saving
   * the related instance
   *
   * @method _persistParentIfRequired
   *
   * @return {void}
   *
   * @private
   */
  async _persistParentIfRequired () {
    if (this.parentInstance.isNew) {
      await this.parentInstance.save()
    }
  }

  /**
   * Returns an array of values to be used for running
   * whereIn query when eagerloading relationships.
   *
   * @method mapValues
   *
   * @param  {Array}  modelInstances - An array of model instances
   *
   * @return {Array}
   */
  mapValues (modelInstances) {
    return _.map(modelInstances, (modelInstance) => modelInstance[this.primaryKey])
  }

  /**
   * Takes an array of related instances and returns an array
   * for each parent record.
   *
   * @method group
   *
   * @param  {Array} relatedInstances
   *
   * @return {Object} @multiple([key=String, values=Array, defaultValue=Null])
   */
  group (relatedInstances) {
    const Serializer = this.RelatedModel.resolveSerializer()

    const transformedValues = _.transform(relatedInstances, (result, relatedInstance) => {
      const foreignKeyValue = relatedInstance[this.localKey]
      const existingRelation = _.find(result, (row) => String(row.identity) === String(foreignKeyValue))

      /**
       * If there is already an existing instance for same parent
       * record. We should override the value and do WARN the
       * user since hasOne should never have multiple
       * related instance.
       */
      if (existingRelation) {
        existingRelation.value.addRow(relatedInstance)
        return result
      }

      result.push({
        identity: foreignKeyValue,
        value: new Serializer([relatedInstance])
      })
      return result
    }, [])

    return { key: this.primaryKey, values: transformedValues, defaultValue: new Serializer([]) }
  }

  /**
   * Returns the eagerLoad query for the relationship
   *
   * @method eagerLoad
   * @async
   *
   * @param  {Array}          rows
   *
   * @return {Object}
   */
  async eagerLoad (rows) {
    const relatedInstances = await this.relatedQuery
      .where(this.determiner, this.parentInstance.constructor.name)
      .whereIn(this.localKey, this.mapValues(rows)).fetch()
    return this.group(relatedInstances.rows)
  }

  _decorateQuery () {
    this.relatedQuery
      .where(this.determiner, this.parentInstance.constructor.name)
      .where(this.localKey, this.parentInstance.primaryKeyValue)
  }

  /**
   * Save related instance
   *
   * @param {RelatedModel} relatedInstance
   * @returns
   *
   * @memberOf MorphMany
   */
  async save (relatedInstance) {
    if (relatedInstance instanceof this.RelatedModel === false) {
      throw GE.ModelRelationException.relationMisMatch('save accepts an instance of related model')
    }
    await this._persistParentIfRequired()
    relatedInstance[this.determiner] = this.parentInstance.constructor.name
    relatedInstance[this.localKey] = this.parentInstance[this.primaryKey]
    return relatedInstance.save()
  }

  /**
   * Create related instance
   *
   * @param {Object} payload
   * @returns {Promise}
   *
   * @memberOf MorphMany
   */
  async create (payload) {
    await this._persistParentIfRequired()
    const relatedInstance = new this.RelatedModel(payload)
    await this.save(relatedInstance)
    return relatedInstance
  }

  /**
   * Creates an array of model instances in parallel
   *
   * @method createMany
   *
   * @param  {Array}   arrayOfPayload
   *
   * @return {Array}
   */
  async createMany (arrayOfPayload) {
    if (!Array.isArray(arrayOfPayload)) {
      throw GE
        .InvalidArgumentException
        .invalidParameter('morphMany.createMany expects an array of values', arrayOfPayload)
    }

    await this._persistParentIfRequired()
    return Promise.all(arrayOfPayload.map((payload) => this.create(payload)))
  }

  /**
   * Creates an array of model instances in parallel
   *
   * @method saveMany
   *
   * @param  {Array}   arrayOfRelatedInstances
   *
   * @return {Array}
   */
  async saveMany (arrayOfRelatedInstances) {
    if (!Array.isArray(arrayOfRelatedInstances)) {
      throw GE
        .InvalidArgumentException
        .invalidParameter('morphMany.saveMany expects an array of related model instances', arrayOfRelatedInstances)
    }

    await this._persistParentIfRequired()
    return Promise.all(arrayOfRelatedInstances.map((relatedInstance) => this.save(relatedInstance)))
  }
}

module.exports = MorphMany
