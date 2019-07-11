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
// const BaseRelation = require('./BaseRelation')
const CE = require('../../Exceptions')
const { ioc } = require('../../../lib/iocResolver')

class MorphTo {
  /**
   * Creates an instance of MorphTo.
   *
   * @param {String} parentInstance
   * @param {String} related
   * @param {String} determiner
   * @param {String} primaryKey
   * @param {String} foreignKey
   *
   * @memberOf MorphTo
   */
  constructor (parentInstance, modelPath, determiner, primaryKey, foreignKey) {
    // super(parentInstance, null)
    this.parentInstance = parentInstance
    this.primaryKey = primaryKey || this.parentInstance.constructor.primaryKey
    this.foreignKey = foreignKey || 'parent_id'
    this.modelPath = modelPath || 'App/Models'
    this.determiner = determiner || 'determiner'
  }

  /**
   * will eager load the relation for multiple values on related
   * model and returns an object with values grouped by foreign
   * key.
   *
   * @param {Array} rows
   * @return {Object}
   *
   * @public
   *
   */
  async eagerLoad (rows) {
    const groups = _.groupBy(rows, row => row.$attributes[this.determiner])
    const result = []
    for (const determiner in groups) {
      const groupRows = groups[determiner]
      const RelatedModel = ioc.use(`${this.modelPath}/${determiner}`)
      const relatedIds = _(groupRows).map(row => row.$attributes[this.foreignKey]).uniq().value()
      const relates = await RelatedModel.whereIn(this.primaryKey, relatedIds).fetch()
      for (const row of groupRows) {
        const related = _.find(relates.rows, related => {
          return row.$attributes[this.foreignKey] && String(related.primaryKeyValue) === String(row.$attributes[this.foreignKey])
        })
        if (related) {
          const newRelated = new RelatedModel()
          newRelated.newUp(related.$attributes)
          newRelated.$sideLoaded[`morph_${this.foreignKey}`] = row.primaryKeyValue
          result.push(newRelated)
        }
      }
    }
    return this.group(result)
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
    const transformedValues = _.transform(relatedInstances, (result, relatedInstance) => {
      const foreignKeyValue = relatedInstance.$sideLoaded[`morph_${this.foreignKey}`]
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
    return { key: this.primaryKey, values: transformedValues, defaultValue: null }
  }

  /**
   * Save related instance is not support
   *
   * @param {any} relatedInstance
   * @returns
   *
   * @memberOf MorphTo
   */
  async save (relatedInstance) {
    throw CE.ModelRelationException.unSupportedMethod('save', this.constructor.name)
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
    const relatedModel = ioc.use(`${this.modelPath}/${determiner}`)
    return relatedModel.where(this.primaryKey, this.parentInstance[this.foreignKey]).first()
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

module.exports = MorphTo
