'use strict'

/*
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

/**
 * BelongsToMany class builds relationship between
 * two models with the help of pivot collection/model
 *
 * @class BelongsToMany
 * @constructor
 */
class HasManyThrough extends BaseRelation {
  constructor (parentInstance, RelatedModel, relatedMethod, primaryKey, foreignKey) {
    super(parentInstance, RelatedModel, primaryKey, foreignKey)
    this.relatedMethod = relatedMethod
    this._relatedModelRelation = new RelatedModel()[relatedMethod]()
    this.relatedQuery = this._relatedModelRelation.relatedQuery
    this.throughQuery = RelatedModel.query()
    this._relatedFields = []
    this._throughFields = []
    this._fields = []
  }

  /**
   * The join query to target the right set of
   * rows
   *
   * @method _makeJoinQuery
   *
   * @return {void}
   *
   * @private
   */
  _makeJoinQuery () {
    const self = this
    this.relatedQuery.innerJoin(this.$foreignCollection, function () {
      self._relatedModelRelation.addWhereOn(this)
    })
  }

  /**
   * Selects fields with proper collection prefixes, also
   * all through model fields are set for sideloading,
   * so that model properties are not polluted.
   *
   * @method _selectFields
   *
   * @return {void}
   *
   * @private
   */
  _selectFields () {
    this.relatedQuery.select(this._relatedFields)
  }

  /**
   * Decorate the query for reads, updates and
   * deletes
   *
   * @method _decorateQuery
   *
   * @return {void}
   *
   * @private
   */
  _decorateQuery () {
    this._selectFields()
  }

  /**
   * Select fields from the primary collection
   *
   * @method select
   *
   * @param  {Array} columns
   *
   * @chainable
   */
  select (columns) {
    const columnsArray = Array.isArray(columns) ? columns : _.toArray(arguments)
    this._fields = this._fields.concat(columnsArray)
    return this
  }

  /**
   * Select fields from the through collection.
   *
   * @method selectThrough
   *
   * @param  {Array}      columns
   *
   * @chainable
   */
  selectThrough (columns) {
    const columnsArray = Array.isArray(columns) ? columns : _.toArray(arguments)
    this._throughFields = this._throughFields.concat(columnsArray)
    return this
  }

  /**
   * Select fields from the through collection.
   *
   * @method whereThrough
   *
   * @param  {Array}      args
   *
   * @chainable
   */
  whereThrough (...args) {
    this.throughQuery.where(...args)
    return this
  }

  /**
   * Select fields from the through collection.
   *
   * @method whereThrough
   *
   * @param  {Array}      args
   *
   * @chainable
   */
  whereInThrough (...args) {
    this.throughQuery.whereIn(...args)
    return this
  }

  /**
   * Select fields from the related collection
   *
   * @method selectRelated
   *
   * @param  {Array}      columns
   *
   * @chainable
   */
  selectRelated (columns) {
    const columnsArray = Array.isArray(columns) ? columns : _.toArray(arguments)
    this._relatedFields = this._relatedFields.concat(columnsArray)
    return this
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
    return _.transform(modelInstances, (result, modelInstance) => {
      if (modelInstance[this.primaryKey]) {
        result.push(modelInstance[this.primaryKey])
      }
      return result
    }, [])
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
    this._selectFields()
    const thoughInstances = await this.throughQuery
      .with(this.relatedMethod, builder => {
        builder.query._conditions = this.relatedQuery.query._conditions
        builder.query.options = this.relatedQuery.query.options
        builder.query._fields = this.relatedQuery.query._fields
      })
      .whereIn(this.foreignKey, mappedRows)
      .fetch()
    const relatedRows = []
    thoughInstances.rows.forEach(thoughInstance => {
      const relates = thoughInstance.getRelated(this.relatedMethod)
      if (relates instanceof this.relatedQuery.Model) {
        const newRelated = new this.relatedQuery.Model()
        newRelated.newUp(relates.$attributes)
        newRelated.$sideLoaded[`through_${this.foreignKey}`] = thoughInstance[this.foreignKey]
        relatedRows.push(newRelated)
      } else if (relates && relates.rows) {
        _.forEach(relates.rows, related => {
          const newRelated = new this.relatedQuery.Model()
          newRelated.newUp(related.$attributes)
          newRelated.$sideLoaded[`through_${this.foreignKey}`] = thoughInstance[this.foreignKey]
          relatedRows.push(newRelated)
        })
      }
    })
    return this.group(relatedRows)
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
      const foreignKeyValue = relatedInstance.$sideLoaded[`through_${this.foreignKey}`]
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
   * Adds `on` clause to the innerjoin context. This
   * method is mainly used by HasManyThrough
   *
   * @method addWhereOn
   *
   * @param  {Object}   context
   */
  relatedWhere (count) {
    this._makeJoinQuery()
    this.relatedQuery.whereRaw(`${this.$primaryCollection}.${this.primaryKey} = ${this.$foreignCollection}.${this.foreignKey}`)

    /**
     * Add count clause if count is required
     */
    if (count) {
      this.relatedQuery.count('*')
    }

    return this.relatedQuery.query
  }

  /**
   * Fetch over the related rows
   *
   * @return {Serializer}
   */
  async fetch () {
    const thoughInstances = await this.throughQuery
      .with(this.relatedMethod, builder => {
        builder.query._conditions = this.relatedQuery.query._conditions
        builder.query.options = this.relatedQuery.query.options
        builder.query._fields = this.relatedQuery.query._fields
      })
      .where(this.foreignKey, this.parentInstance.primaryKeyValue)
      .fetch()
    let relatedRows = []
    thoughInstances.rows.forEach(thoughInstance => {
      const relates = thoughInstance.getRelated(this.relatedMethod)
      if (relates instanceof this.relatedQuery.Model) {
        relatedRows.push(relates)
      } else if (relates && relates.rows) {
        relatedRows = _.concat(relatedRows, relates.rows)
      }
    })
    return new this.RelatedModel.Serializer(relatedRows)
  }

  /**
   * Fetch over the related rows
   *
   * @return {Object}
   */
  async first () {
    this.relatedQuery.limit(1)
    const result = await this.fetch()
    return result.first()
  }

  /**
   * @method count
   *
   * @return {Object|Number}
   */
  async count (...args) {
    throw CE.ModelRelationException.unSupportedMethod('saveMany', 'HasManyThrough')
  }

  /**
   * @method update
   *
   * @return {Object|Number}
   */
  async update (...args) {
    throw CE.ModelRelationException.unSupportedMethod('saveMany', 'HasManyThrough')
  }

  /**
   * @method delete
   *
   * @return {Object|Number}
   */
  async delete (...args) {
    throw CE.ModelRelationException.unSupportedMethod('saveMany', 'HasManyThrough')
  }

  /* istanbul ignore next */
  create () {
    throw CE.ModelRelationException.unSupportedMethod('create', 'HasManyThrough')
  }

  /* istanbul ignore next */
  save () {
    throw CE.ModelRelationException.unSupportedMethod('save', 'HasManyThrough')
  }

  /* istanbul ignore next */
  createMany () {
    throw CE.ModelRelationException.unSupportedMethod('createMany', 'HasManyThrough')
  }

  /* istanbul ignore next */
  saveMany () {
    throw CE.ModelRelationException.unSupportedMethod('saveMany', 'HasManyThrough')
  }
}

module.exports = HasManyThrough
