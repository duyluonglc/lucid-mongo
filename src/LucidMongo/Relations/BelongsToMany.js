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
 * primaryKey           -    user.primaryKey    -    id
 * relatedPrimaryKey    -    post.primaryKey    -    id
 * foreignKey           -    user.foreignKey    -    user_id
 * relatedForeignKey    -    post.foreignKey    -    post_id
 *
*/

const _ = require('lodash')
const GE = require('@adonisjs/generic-exceptions')
const { ioc } = require('../../../lib/iocResolver')

const BaseRelation = require('./BaseRelation')
const util = require('../../../lib/util')
const CE = require('../../Exceptions')
const PivotModel = require('../Model/PivotModel')

/**
 * BelongsToMany class builds relationship between
 * two models with the help of pivot collection/model
 *
 * @class BelongsToMany
 * @constructor
 */
class BelongsToMany extends BaseRelation {
  constructor (parentInstance, relatedModel, primaryKey, foreignKey, relatedPrimaryKey, relatedForeignKey) {
    super(parentInstance, relatedModel, primaryKey, foreignKey)

    this.relatedForeignKey = relatedForeignKey
    this.relatedPrimaryKey = relatedPrimaryKey

    /**
     * Since user can define a fully qualified model for
     * pivot collection, we store it under this variable.
     *
     * @type {[type]}
     */
    this._PivotModel = null

    /**
     * Settings related to pivot collection only
     *
     * @type {Object}
     */
    this._pivot = {
      collection: util.makePivotCollectionName(parentInstance.constructor.name, relatedModel.name),
      withTimestamps: false,
      withFields: []
    }

    this._relatedFields = []

    /**
     * Here we store the existing pivot rows, to make
     * sure we are not inserting duplicates.
     *
     * @type {Array}
     */
    this._existingPivotInstances = []
  }

  // /**
  //  * The colums to be selected from the related
  //  * query
  //  *
  //  * @method select
  //  *
  //  * @param  {Array} columns
  //  *
  //  * @chainable
  //  */
  // select (columns) {
  //   this._relatedFields = Array.isArray(columns) ? columns : _.toArray(arguments)
  //   return this
  // }

  /**
   * Returns the pivot collection name. The pivot model is
   * given preference over the default collection name.
   *
   * @attribute $pivotCollection
   *
   * @return {String}
   */
  get $pivotCollection () {
    return this._PivotModel ? this._PivotModel.collection : this._pivot.collection
  }

  /**
   * The pivot columns to be selected
   *
   * @attribute $pivotColumns
   *
   * @return {Array}
   */
  get $pivotColumns () {
    return [this.relatedForeignKey, this.foreignKey].concat(this._pivot.withFields)
  }

  /**
   * Returns the name of select statement on pivot collection
   *
   * @method _selectForPivot
   *
   * @param  {String}        field
   *
   * @return {String}
   *
   * @private
   */
  _selectForPivot (field) {
    return `${field} as pivot_${field}`
  }

  /**
   * Adds a where clause on pivot collection by prefixing
   * the pivot collection name.
   *
   * @method _whereForPivot
   *
   * @param  {String}       operator
   * @param  {String}       key
   * @param  {...Spread}    args
   *
   * @return {void}
   *
   * @private
   */
  _whereForPivot (method, key, ...args) {
    this.pivotQuery()[method](key, ...args)
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
    this.wherePivot(this.foreignKey, this.$primaryKeyValue)
  }

  /**
   * Newup the pivot model set by user or the default
   * pivot model
   *
   * @method _newUpPivotModel
   *
   * @return {Object}
   *
   * @private
   */
  _newUpPivotModel () {
    return new (this._PivotModel || PivotModel)()
  }

  /**
   * The pivot collection values are sideloaded, so we need to remove
   * them sideload and instead set it as a relationship on
   * model instance
   *
   * @method _addPivotValuesAsRelation
   *
   * @param  {Object}                  row
   *
   * @private
   */
  _addPivotValuesAsRelation (row) {
    const pivotAttributes = {}

    /**
     * Removing pivot key/value pair from sideloaded object.
     * This is only quirky part.
     */
    row.$sideLoaded = _.omitBy(row.$sideLoaded, (value, key) => {
      if (key.startsWith('pivot_')) {
        pivotAttributes[key.replace('pivot_', '')] = value
        return true
      }
    })

    const pivotModel = this._newUpPivotModel()
    pivotModel.newUp(pivotAttributes)
    row.setRelated('pivot', pivotModel)
  }

  /**
   * Saves the relationship to the pivot collection
   *
   * @method _attachSingle
   * @async
   *
   * @param  {Number|String}      value
   * @param  {Function}           [pivotCallback]
   *
   * @return {Object}                    Instance of pivot model
   *
   * @private
   */
  async _attachSingle (value, pivotCallback) {
    /**
     * The relationship values
     *
     * @type {Object}
     */
    const pivotValues = {
      [this.relatedForeignKey]: value,
      [this.foreignKey]: this.$primaryKeyValue
    }

    const pivotModel = this._newUpPivotModel()
    this._existingPivotInstances.push(pivotModel)
    pivotModel.fill(pivotValues)

    /**
     * Set $collection, $timestamps, $connection when there
     * is no pre-defined pivot model.
     */
    if (!this._PivotModel) {
      pivotModel.$collection = this.$pivotCollection
      pivotModel.$connection = this.RelatedModel.connection
      pivotModel.$withTimestamps = this._pivot.withTimestamps
    }

    /**
     * If pivot callback is defined, do call it. This gives
     * chance to the user to set additional fields to the
     * model.
     */
    if (typeof (pivotCallback) === 'function') {
      pivotCallback(pivotModel)
    }

    await pivotModel.save()
    return pivotModel
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
   * Loads the pivot relationship and then caches
   * it inside memory, so that more calls to
   * this function are not hitting database.
   *
   * @method _loadAndCachePivot
   * @async
   *
   * @return {void}
   *
   * @private
   */
  async _loadAndCachePivot () {
    if (_.size(this._existingPivotInstances) === 0) {
      const pivotQuery = this.pivotQuery().where(this.foreignKey, this.$primaryKeyValue)
      this._existingPivotInstances = (await pivotQuery.fetch()).rows
    }
  }

  /**
   * Returns the existing pivot instance for a given
   * value.
   *
   * @method _getPivotInstance
   *
   * @param  {String|Number}          value
   *
   * @return {Object|Null}
   *
   * @private
   */
  _getPivotInstance (value) {
    return _.find(this._existingPivotInstances, (instance) => String(instance[this.relatedForeignKey]) === String(value))
  }

  /**
   * Define a fully qualified model to be used for
   * making pivot collection queries and using defining
   * pivot collection settings.
   *
   * @method pivotModel
   *
   * @param  {Model}   pivotModel
   *
   * @chainable
   */
  pivotModel (pivotModel) {
    this._PivotModel = typeof (pivotModel) === 'string' ? ioc.use(pivotModel) : pivotModel
    return this
  }

  /**
   * Define the pivot collection
   *
   * @method pivotCollection
   *
   * @param  {String}   collection
   *
   * @chainable
   */
  pivotCollection (collection) {
    if (this._PivotModel) {
      throw CE.ModelRelationException.pivotModelIsDefined('pivotCollection')
    }

    this._pivot.collection = collection
    return this
  }

  /**
   * Make sure `created_at` and `updated_at` timestamps
   * are being used
   *
   * @method withTimestamps
   *
   * @chainable
   */
  withTimestamps () {
    if (this._PivotModel) {
      throw CE.ModelRelationException.pivotModelIsDefined('withTimestamps')
    }

    this._pivot.withTimestamps = true
    return this
  }

  /**
   * Fields to be selected from pivot collection
   *
   * @method withPivot
   *
   * @param  {Array}  fields
   *
   * @chainable
   */
  withPivot (fields) {
    fields = Array.isArray(fields) ? fields : [fields]
    this._pivot.withFields = this._pivot.withFields.concat(fields)
    return this
  }

  /**
   * Make a where clause on the pivot collection
   *
   * @method whereInPivot
   *
   * @param  {String}     key
   * @param  {...Spread}  args
   *
   * @chainable
   */
  whereInPivot (key, ...args) {
    this._whereForPivot('whereIn', key, ...args)
    return this
  }

  /**
   * Make a orWhere clause on the pivot collection
   *
   * @method orWherePivot
   *
   * @param  {String}     key
   * @param  {...Spread}  args
   *
   * @chainable
   */
  orWherePivot (key, ...args) {
    this._whereForPivot('orWhere', key, ...args)
    return this
  }

  /**
   * Where clause on pivot collection
   *
   * @method wherePivot
   *
   * @param  {String}    key
   * @param  {...Spread} args
   *
   * @chainable
   */
  wherePivot (key, ...args) {
    this._whereForPivot('where', key, ...args)
    return this
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
    this.whereInPivot(this.foreignKey, mappedRows)

    const pivotInstances = await this.pivotQuery().fetch()
    const foreignKeyValues = _.map(pivotInstances.rows, this.relatedForeignKey)
    const relatedInstances = await this.relatedQuery.whereIn(this.relatedPrimaryKey, foreignKeyValues).fetch()
    const result = []
    rows.map(modelInstance => {
      const modelPivots = _.filter(pivotInstances.rows, pivot => {
        return String(pivot[this.foreignKey]) === String(modelInstance.primaryKeyValue)
      })
      modelPivots.map(pivot => {
        relatedInstances.rows.map(related => {
          if (String(related.primaryKeyValue) === String(pivot[this.relatedForeignKey])) {
            const newRelated = new this.RelatedModel()
            newRelated.newUp(related.$attributes)
            newRelated.$sideLoaded[`pivot_${this.foreignKey}`] = modelInstance.primaryKeyValue
            newRelated.setRelated('pivot', pivot)
            result.push(newRelated)
          }
        })
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
    return _.transform(modelInstances, (result, modelInstance) => {
      if (modelInstance[this.primaryKey]) {
        result.push(modelInstance[this.primaryKey])
      }
      return result
    }, [])
  }

  /**
   * Groups related instances with their foriegn keys
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
      const foreignKeyValue = relatedInstance.$sideLoaded[`pivot_${this.foreignKey}`]
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
   * Fetch over the related rows
   *
   * @return {Serializer}
   */
  async fetch () {
    this._decorateQuery()
    const pivotInstances = await this.pivotQuery().fetch()
    const foreignKeyValues = _.map(pivotInstances.rows, this.relatedForeignKey)
    const result = await this.relatedQuery.whereIn(this.relatedPrimaryKey, foreignKeyValues).fetch()
    result.rows.forEach(related => {
      const pivot = _.find(pivotInstances.rows, pivot => String(pivot[this.relatedForeignKey]) === String(related[this.relatedPrimaryKey]))
      related.setRelated('pivot', pivot)
    })
    return result
  }

  /**
   * First related rows
   *
   * @return {Object}
   */
  async first () {
    this._decorateQuery()
    const pivotInstances = await this.pivotQuery().fetch()
    const foreignKeyValues = _.map(pivotInstances.rows, this.relatedForeignKey)
    const related = await this.relatedQuery.whereIn(this.relatedPrimaryKey, foreignKeyValues).first()

    if (!related) {
      return null
    }

    const pivot = _.find(pivotInstances.rows, pivot => String(pivot[this.relatedForeignKey]) === String(related[this.relatedPrimaryKey]))
    related.setRelated('pivot', pivot)
    return related
  }

  /**
   * @method count
   *
   * @return {Object|Number}
   */
  async count (...args) {
    this._decorateQuery()
    const pivotInstances = await this.pivotQuery().fetch()
    const foreignKeyValues = _.map(pivotInstances.rows, this.relatedForeignKey)
    return this.relatedQuery.whereIn(this.relatedPrimaryKey, foreignKeyValues).count(...args)
  }

  /**
   * @method max
   *
   * @return {Object|Number}
   */
  async max (...args) {
    this._decorateQuery()
    const pivotInstances = await this.pivotQuery().fetch()
    const foreignKeyValues = _.map(pivotInstances.rows, this.foreignKey)
    return this.relatedQuery.whereIn(this.relatedPrimaryKey, foreignKeyValues).max(...args)
  }

  /**
   * @method min
   *
   * @return {Object|Number}
   */
  async min (...args) {
    this._decorateQuery()
    const pivotInstances = await this.pivotQuery().fetch()
    const foreignKeyValues = _.map(pivotInstances.rows, this.foreignKey)
    return this.relatedQuery.whereIn(this.relatedPrimaryKey, foreignKeyValues).min(...args)
  }

  /**
   * @method sum
   *
   * @return {Object|Number}
   */
  async sum (...args) {
    this._decorateQuery()
    const pivotInstances = await this.pivotQuery().fetch()
    const foreignKeyValues = _.map(pivotInstances.rows, this.foreignKey)
    return this.relatedQuery.whereIn(this.relatedPrimaryKey, foreignKeyValues).sum(...args)
  }

  /**
   * @method avg
   *
   * @return {Object|Number}
   */
  async avg (...args) {
    this._decorateQuery()
    const pivotInstances = await this.pivotQuery().fetch()
    const foreignKeyValues = _.map(pivotInstances.rows, this.foreignKey)
    return this.relatedQuery.whereIn(this.relatedPrimaryKey, foreignKeyValues).avg(...args)
  }

  /**
   * Returns the query for pivot collection
   *
   * @method pivotQuery
   *
   * @param {Boolean} selectFields
   *
   * @return {Object}
   */
  pivotQuery (selectFields = true) {
    if (!this._pivotQuery) {
      this._pivotQuery = this._PivotModel
        ? this._PivotModel.query()
        : new PivotModel().query(this.$pivotCollection, this.RelatedModel.$connection)
      if (selectFields) {
        this._pivotQuery.select(this.$pivotColumns)
      }
    }
    return this._pivotQuery
  }

  /**
   * Adds a where clause to limit the select search
   * to related rows only.
   *
   * @method relatedWhere
   *
   * @param  {Boolean}     count
   *
   * @return {Object}
   */
  relatedWhere (count) {
    this._makeJoinQuery()
    this.relatedQuery.whereRaw(`${this.$primaryCollection}.${this.primaryKey} = ${this.$pivotCollection}.${this.foreignKey}`)

    /**
     * Add count clause if count is required
     */
    if (count) {
      this.relatedQuery.count('*')
    }

    return this.relatedQuery.query
  }

  addWhereOn (context) {
    this._makeJoinQuery()
    context.on(`${this.$primaryCollection}.${this.primaryKey}`, '=', `${this.$pivotCollection}.${this.foreignKey}`)
  }

  /**
   * Attach existing rows inside pivot collection as a relationship
   *
   * @method attach
   *
   * @param  {Number|String|Array} relatedPrimaryKeyValue
   * @param  {Function} [pivotCallback]
   *
   * @return {Promise}
   */
  async attach (references, pivotCallback = null) {
    await this._loadAndCachePivot()
    const rows = !Array.isArray(references) ? [references] : references

    return Promise.all(rows.map((row) => {
      const pivotInstance = this._getPivotInstance(row)
      return pivotInstance ? Promise.resolve(pivotInstance) : this._attachSingle(row, pivotCallback)
    }))
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
    this._decorateQuery()
    const pivotInstances = await this.pivotQuery().fetch()
    const foreignKeyValues = _.map(pivotInstances.rows, this.foreignKey)
    const ids = await this.relatedQuery
      .whereIn(this.relatedPrimaryKey, foreignKeyValues).ids()
    const effectedRows = await this.relatedQuery
      .whereIn(this.relatedPrimaryKey, foreignKeyValues)
      .delete()
    await this.detach(ids)
    return effectedRows
  }

  /**
   * Update related rows
   *
   * @method update
   *
   * @param  {Object} values
   *
   * @return {Number}        Number of effected rows
   */
  async update (values) {
    this._decorateQuery()
    const pivotInstances = await this.pivotQuery().fetch()
    const foreignKeyValues = _.map(pivotInstances.rows, this.foreignKey)
    return this.relatedQuery
      .whereIn(this.relatedPrimaryKey, foreignKeyValues)
      .update(values)
  }

  /**
   * Detach existing relations from the pivot collection
   *
   * @method detach
   * @async
   *
   * @param  {Array} references
   *
   * @return {Number}  The number of effected rows
   */
  async detach (references) {
    await this._loadAndCachePivot()
    const query = this.pivotQuery(false)
      .where(this.foreignKey, this.$primaryKeyValue)
    if (references) {
      const rows = !Array.isArray(references) ? [references] : references
      query.whereIn(this.relatedForeignKey, rows)
      this._existingPivotInstances = _.filter(this._existingPivotInstances, pivotInstance => {
        return !_.find(rows, row => String(row) === String(pivotInstance[this.relatedForeignKey]))
      })
    } else {
      this._existingPivotInstances = []
    }
    return query.delete()
  }

  /**
   * Calls `detach` and `attach` together.
   *
   * @method sync
   *
   * @param  {Number|String|Array} relatedPrimaryKeyValue
   * @param  {Function} [pivotCallback]
   *
   * @return {void}
   */
  async sync (references, pivotCallback) {
    await this._loadAndCachePivot()
    const query = this.pivotQuery(false)
    query.where(this.foreignKey, this.$primaryKeyValue)
    if (references) {
      const rows = !Array.isArray(references) ? [references] : references
      query.whereNotIn(this.relatedForeignKey, rows)
      references = _.filter(rows, row => {
        return !_.find(this._existingPivotInstances, pivotInstance => {
          return String(pivotInstance[this.relatedForeignKey]) === String(row)
        })
      })
      this._existingPivotInstances = _.filter(this._existingPivotInstances, pivotInstance => {
        return !_.find(rows, row => String(row) === String(pivotInstance[this.relatedForeignKey]))
      })
    } else {
      this._existingPivotInstances = []
    }

    await query.delete()
    if (!references || !references.length) {
      return false
    }

    return this.attach(references, pivotCallback)
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
  async save (relatedInstance, pivotCallback) {
    await this._persistParentIfRequired()

    /**
     * Only save related instance when not persisted already. This is
     * only required in belongsToMany since relatedInstance is not
     * made dirty by this method.
     */
    if (relatedInstance.isNew || relatedInstance.isDirty) {
      await relatedInstance.save()
    }

    /**
     * Attach the pivot rows
     */
    const pivotRows = await this.attach(relatedInstance[this.relatedPrimaryKey], pivotCallback)

    /**
     * Set saved pivot row as a relationship
     */
    relatedInstance.setRelated('pivot', pivotRows[0])
  }

  /**
   * Save multiple relationships to the database. This method
   * will run queries in parallel
   *
   * @method saveMany
   * @async
   *
   * @param  {Array}    arrayOfRelatedInstances
   * @param  {Function} [pivotCallback]
   *
   * @return {void}
   */
  async saveMany (arrayOfRelatedInstances, pivotCallback) {
    if (!Array.isArray(arrayOfRelatedInstances)) {
      throw GE
        .InvalidArgumentException
        .invalidParameter('belongsToMany.saveMany expects an array of related model instances', arrayOfRelatedInstances)
    }

    await this._persistParentIfRequired()
    return Promise.all(arrayOfRelatedInstances.map((relatedInstance) => this.save(relatedInstance, pivotCallback)))
  }

  /**
   * Creates a new related model instance and persist
   * the relationship inside pivot collection
   *
   * @method create
   * @async
   *
   * @param  {Object}   row
   * @param  {Function} [pivotCallback]
   *
   * @return {Object}               Instance of related model
   */
  async create (row, pivotCallback) {
    await this._persistParentIfRequired()

    const relatedInstance = new this.RelatedModel()
    relatedInstance.fill(row)
    await this.save(relatedInstance, pivotCallback)

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
   * @param  {Function}   pivotCallback
   *
   * @return {Array}
   */
  async createMany (rows, pivotCallback) {
    if (!Array.isArray(rows)) {
      throw GE
        .InvalidArgumentException
        .invalidParameter('belongsToMany.createMany expects an array of related model instances', rows)
    }

    await this._persistParentIfRequired()
    return Promise.all(rows.map((relatedInstance) => this.create(relatedInstance, pivotCallback)))
  }
}

module.exports = BelongsToMany
