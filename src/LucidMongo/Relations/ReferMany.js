'use strict'

/*
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 *
 * ==== Keys for User and Post model
 * relatedPrimaryKey    -    post.primaryKey    -    id
 * relatedForeignKey    -    post.foreignKey    -    post_id
 *
*/

const _ = require('lodash')
const GE = require('@adonisjs/generic-exceptions')
const pluralize = require('pluralize')
const BaseRelation = require('./BaseRelation')

/**
 * ReferMany class builds relationship between
 * two models with the help of pivot collection/model
 *
 * @class ReferMany
 * @constructor
 */
class ReferMany extends BaseRelation {
  constructor (parentInstance, RelatedModel, primaryKey, foreignKey) {
    super(parentInstance, RelatedModel, primaryKey, foreignKey)
    this.relatedQuery = RelatedModel.query()
    this.foreignKey = pluralize.plural(foreignKey)
  }

  /**
   * Decorates the query for read/update/delete
   * operations
   *
   * @method _decorateQuery
   *
   * @return {void}
   *
   * @private
   */
  _decorateQuery () {
    this.relatedQuery.whereIn(this.primaryKey, this.parentInstance[this.foreignKey] || [])
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
    const mappedRows = this.mapValues(rows)
    if (!mappedRows || !mappedRows.length) {
      return this.group([])
    }
    const relatedInstances = await this.relatedQuery.whereIn(this.primaryKey, mappedRows).fetch()
    const result = []
    rows.map(modelInstance => {
      relatedInstances.rows.map(related => {
        const foreignKeys = modelInstance[this.foreignKey] || []
        if (foreignKeys.map(String).includes(String(related.primaryKeyValue))) {
          const newRelated = new this.RelatedModel()
          newRelated.newUp(related.$attributes)
          newRelated.$sideLoaded[`refer_${this.foreignKey}`] = modelInstance.primaryKeyValue
          result.push(newRelated)
        }
      })
    })
    return this.group(result)
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
    return _.flatten(_.map(modelInstances, (modelInstance) => modelInstance[this.foreignKey] || []))
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
      const foreignKeyValue = relatedInstance.$sideLoaded[`refer_${this.foreignKey}`]
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
   * Method called when eagerloading for a single
   * instance
   *
   * @method load
   * @async
   *
   * @return {Promise}
   */
  load () {
    return this.fetch()
  }

  /**
   * Attach existing rows
   *
   * @method attach
   *
   * @param  {Number|String|Array} relatedPrimaryKeyValue
   *
   * @return {Promise}
   */
  attach (references) {
    const rows = !Array.isArray(references) ? [references] : references
    const relates = this.parentInstance[this.foreignKey] || []
    this.parentInstance.$attributes[this.foreignKey] = _.unionBy(relates, rows, String)
    return this.parentInstance.save()
  }

  /**
   * Delete related model rows in bulk and also detach
   * them from the pivot collection.
   *
   * NOTE: This method will run 3 queries in total. First is to
   * fetch the related rows, next is to delete them and final
   * is to remove the relationship from pivot collection.
   *
   * @method delete
   * @async
   *
   * @return {Number} Number of effected rows
   */
  async delete () {
    const foreignKeyValues = await this.ids()
    const effectedRows = await this.RelatedModel
      .query()
      .whereIn(this.RelatedModel.primaryKey, foreignKeyValues)
      .delete()

    await this.detach(foreignKeyValues)
    return effectedRows
  }

  /**
   * Detach existing relations from relates
   *
   * @method detach
   * @async
   *
   * @param  {Array} references
   *
   * @return {Number}  The number of effected rows
   */
  detach (references) {
    if (references) {
      references = !Array.isArray(references) ? [String(references)] : _.map(references, String)
      let relates = this.parentInstance.$attributes[this.foreignKey]
      relates = _.filter(relates, relate => !references.includes(String(relate)))
      this.parentInstance.$attributes[this.foreignKey] = relates
    } else {
      this.parentInstance.$attributes[this.foreignKey] = []
    }
    return this.parentInstance.save()
  }

  /**
   * Save the related model instance and setup the relationship
   * inside pivot collection
   *
   * @method save
   *
   * @param  {Object} relatedInstance
   * @param  {Function} pivotCallback
   *
   * @return {void}
   */
  async save (relatedInstance) {
    await this._persistParentIfRequired()

    /**
     * Only save related instance when not persisted already. This is
     * only required in referMany since relatedInstance is not
     * made dirty by this method.
     */
    if (relatedInstance.isNew || relatedInstance.isDirty) {
      await relatedInstance.save()
    }

    /**
     * Attach the primaryKeyValue
     */
    return this.attach(relatedInstance.primaryKeyValue)
  }

  /**
   * Save multiple relationships to the database. This method
   * will run queries in parallel
   *
   * @method saveMany
   * @async
   *
   * @param  {Array}    arrayOfRelatedInstances
   *
   * @return {void}
   */
  async saveMany (arrayOfRelatedInstances) {
    if (!Array.isArray(arrayOfRelatedInstances)) {
      throw GE
        .InvalidArgumentException
        .invalidParameter('referMany.saveMany expects an array of related model instances', arrayOfRelatedInstances)
    }

    await this._persistParentIfRequired()
    return Promise.all(arrayOfRelatedInstances.map((relatedInstance) => this.save(relatedInstance)))
  }

  /**
   * Creates a new related model instance and persist
   * the relationship inside pivot collection
   *
   * @method create
   * @async
   *
   * @param  {Object}   row
   *
   * @return {Object}               Instance of related model
   */
  async create (row) {
    await this._persistParentIfRequired()

    const relatedInstance = new this.RelatedModel()
    relatedInstance.fill(row)
    await this.save(relatedInstance)

    return relatedInstance
  }

  /**
   * Creates multiple related relationships. This method will
   * call all queries in parallel
   *
   * @method createMany
   * @async
   *
   * @param  {Array}   rows
   *
   * @return {Array}
   */
  async createMany (rows) {
    if (!Array.isArray(rows)) {
      throw GE
        .InvalidArgumentException
        .invalidParameter('referMany.createMany expects an array of related model instances', rows)
    }

    await this._persistParentIfRequired()
    return Promise.all(rows.map((relatedInstance) => this.create(relatedInstance)))
  }
}

module.exports = ReferMany
