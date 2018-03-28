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

class EmbedsMany extends BaseRelation {
  constructor (parentInstance, RelatedModel, primaryKey, foreignKey) {
    super(parentInstance, RelatedModel)
    this.primaryKey = primaryKey || this.parentInstance.constructor.primaryKey
    this.foreignKey = foreignKey || util.makeEmbedsName(this.RelatedModel.name)
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
       * If there is an existing relation, add row to
       * the relationship
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
    const relatedInstances = []
    rows.map(row => {
      _.map(row.$attributes[this.foreignKey], embed => {
        const relatedInstance = this._mapRowToInstance(embed)
        relatedInstance.$sideLoaded[`embed_${this.foreignKey}`] = row.primaryKeyValue
        relatedInstances.push(relatedInstance)
      })
    })
    return this.group(relatedInstances)
  }

  /**
   * Save related instance
   *
   * @param {relatedInstance} relatedInstance
   * @returns
   *
   * @memberOf EmbedsMany
   */
  async save (relatedInstance) {
    if (relatedInstance instanceof this.RelatedModel === false) {
      throw CE.ModelRelationException.relationMisMatch('save accepts an instance of related model')
    }

    await this._persistParentIfRequired()

    let embeds = this.parentInstance.$attributes[this.foreignKey]
      ? _.cloneDeep(this.parentInstance.$attributes[this.foreignKey])
      : []

    if (!Array.isArray(embeds)) {
      embeds = [embeds]
    }

    if (!relatedInstance.primaryKeyValue) {
      await this.RelatedModel.$hooks.before.exec('create', relatedInstance)
      relatedInstance.primaryKeyValue = new ObjectID()
      relatedInstance._setCreatedAt(relatedInstance.$attributes)
      relatedInstance._setUpdatedAt(relatedInstance.$attributes)
      embeds.push(relatedInstance._formatFields(relatedInstance.$attributes))
      this.parentInstance[this.foreignKey] = embeds
      await this.parentInstance.save()
      relatedInstance._syncOriginals()
      await this.RelatedModel.$hooks.after.exec('create', relatedInstance)
    } else {
      await this.RelatedModel.$hooks.before.exec('update', relatedInstance)
      relatedInstance._setUpdatedAt(relatedInstance.$attributes)
      embeds = embeds.map(embed => {
        return String(embed[this.primaryKey]) === String(relatedInstance.primaryKeyValue)
          ? relatedInstance._formatFields(relatedInstance.$attributes) : embed
      })
      this.parentInstance[this.foreignKey] = embeds
      await this.parentInstance.save()
      relatedInstance._syncOriginals()
      await this.RelatedModel.$hooks.after.exec('update', relatedInstance)
    }
    return relatedInstance
  }

  /**
   * @method create
   *
   * @param {Object} values
   * @returns relatedInstance
   * @memberof EmbedsMany
   */
  create (values) {
    const relatedInstance = new this.RelatedModel(values)
    return this.save(relatedInstance)
  }

  /**
   * Remove related instance
   *
   * @param {String|Array} id
   * @returns
   *
   * @memberOf EmbedsMany
   */
  async delete (references) {
    await this._persistParentIfRequired()
    if (!references) {
      throw CE.InvalidArgumentException.invalidParameter('delete expects a primary key or array of primary key')
    }

    let embeds = _.clone(this.parentInstance.$attributes[this.foreignKey]) || []
    if (!Array.isArray(embeds)) {
      embeds = [embeds]
    }
    references = Array.isArray(references) ? references : [references]
    references.forEach(reference => {
      _.remove(embeds, embed => String(embed[this.primaryKey]) === String(reference))
    })
    this.parentInstance.set(this.foreignKey, embeds)
    return this.parentInstance.save()
  }

  /**
   * delete all references
   *
   * @return {Number}
   *
   * @public
   */
  async deleteAll () {
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
    const embeds = this.parentInstance.$attributes[this.foreignKey]
    return new this.RelatedModel.Serializer(_.map(embeds, embed => {
      return this._mapRowToInstance(embed)
    }))
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
   * find
   *
   * @public
   *
   * @return {Object}
   */
  find (id) {
    const embeds = this.parentInstance.$attributes[this.foreignKey]
    const result = _.find(embeds, embed => String(embed[this.primaryKey]) === String(id))
    return result ? this._mapRowToInstance(result) : null
  }

  /**
   * fetch
   *
   * @public
   *
   * @return {Object}
   */
  first () {
    const embeds = this.parentInstance.$attributes[this.foreignKey]
    const result = _.first(embeds)
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

module.exports = EmbedsMany
