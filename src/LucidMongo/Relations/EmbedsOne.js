'use strict'

/**
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const _ = require('lodash')
const BaseRelation = require('./BaseRelation')
const util = require('../../../lib/util')
const CE = require('../../Exceptions')
const ObjectID = require('mongodb').ObjectID

class EmbedsOne extends BaseRelation {
  constructor (parentInstance, RelatedModel, primaryKey, foreignKey) {
    super(parentInstance, RelatedModel)
    this.primaryKey = primaryKey || this.parentInstance.constructor.primaryKey
    this.foreignKey = foreignKey || util.makeEmbedName(this.RelatedModel.name)
  }

  /**
   * Persists the parent model instance if it's not
   * persisted already. This is done before saving
   * the related instance
   *
   * @method _persistParentIfRequired
   * @async
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
   * Groups related instances with their foreign keys
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
      const foreignKeyValue = relatedInstance.$sideLoaded[`embed_${this.foreignKey}`]
      const existingRelation = _.find(result, (row) => String(row.identity) === String(foreignKeyValue))

      /**
       * If there is already an existing instance for same parent
       * record. We should override the value and do WARN the
       * user since hasOne should never have multiple
       * related instance.
       */
      if (existingRelation) {
        existingRelation.value = relatedInstance
        return result
      }

      result.push({
        identity: foreignKeyValue,
        value: relatedInstance
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
    const relatedInstances = []
    rows.map(row => {
      if (row.$attributes[this.foreignKey]) {
        const relatedInstance = this._mapRowToInstance(row.$attributes[this.foreignKey])
        relatedInstance.$sideLoaded[`embed_${this.foreignKey}`] = row.primaryKeyValue
        relatedInstances.push(relatedInstance)
      }
    })

    return this.group(relatedInstances)
  }

  /**
   * Save related instance
   *
   * @param {relatedInstance} relatedInstance
   * @returns relatedInstance
   *
   * @memberOf EmbedsOne
   */
  async save (relatedInstance) {
    if (relatedInstance instanceof this.RelatedModel === false) {
      throw CE.ModelRelationException.relationMisMatch('save accepts an instance of related model')
    }

    await this._persistParentIfRequired()

    if (!relatedInstance.primaryKeyValue) {
      await this.RelatedModel.$hooks.before.exec('create', relatedInstance)
      relatedInstance.primaryKeyValue = new ObjectID()
      relatedInstance._setCreatedAt(relatedInstance.$attributes)
      relatedInstance._setUpdatedAt(relatedInstance.$attributes)
      this.parentInstance.$attributes[this.foreignKey] = relatedInstance._formatFields(relatedInstance.$attributes)
      await this.parentInstance.save()
      await this.RelatedModel.$hooks.after.exec('create', relatedInstance)
    } else {
      await this.RelatedModel.$hooks.before.exec('update', relatedInstance)
      relatedInstance._setUpdatedAt(relatedInstance.$attributes)
      this.parentInstance.$attributes[this.foreignKey] = relatedInstance._formatFields(relatedInstance.$attributes)
      await this.parentInstance.save()
      await this.RelatedModel.$hooks.after.exec('update', relatedInstance)
    }
    return relatedInstance
  }

  /**
   * @method create
   *
   * @param {Object} values
   * @returns relatedInstance
   * @memberOf EmbedsOne
   */
  create (values) {
    const relatedInstance = new this.RelatedModel(values)
    return this.save(relatedInstance)
  }

  /**
   * Remove related instance
   *
   * @returns
   *
   * @memberOf EmbedsOne
   */
  async delete () {
    await this._persistParentIfRequired()

    this.parentInstance.unset(this.foreignKey)
    return this.parentInstance.save()
  }

  /**
   * fetch
   *
   * @public
   *
   * @return {Array}
   */
  fetch () {
    return this.first()
  }

  /**
   * Maps a single row to model instance
   *
   * @method _mapRowToInstance
   *
   * @param  {Object}          row
   *
   * @return {Model}
   */
  _mapRowToInstance (embed) {
    const modelInstance = new this.RelatedModel()

    /**
     * The omitBy function is used to remove sideLoaded data
     * from the actual values and set them as $sideLoaded
     * property on models
     */
    modelInstance.newUp(_.omitBy(embed, (value, field) => {
      if (this._sideLoaded.indexOf(field) > -1) {
        modelInstance.$sideLoaded[field] = value
        return true
      }
    }))

    return modelInstance
  }

  /**
   * fetch
   *
   * @public
   *
   * @return {Object}
   */
  first () {
    const result = this.parentInstance.$attributes[this.foreignKey]
    return result ? this._mapRowToInstance(result) : null
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

module.exports = EmbedsOne
