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
const _ = require('lodash')
const CE = require('../../Exceptions')
const CatLog = require('cat-log')
const logger = new CatLog('adonis:lucid')

class ReferMany extends Relation {

  constructor (parent, related, primaryKey, foreignKey) {
    super(parent, related)
    this.fromKey = primaryKey || this.parent.constructor.primaryKey
    this.toKey = foreignKey || this.related.constructor.foreignKey
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
    const referValues = _(results).map(result => result[this.toKey]).flatten().value()
    const relatedResults = yield this.relatedQuery.whereIn(this.fromKey, referValues).fetch()

    const response = {}
    relatedResults.forEach(item => {
      const matchParents = _(results).filter(result => {
        return _(result[this.toKey]).map(String).includes(String(item[this.fromKey]))
      })

      matchParents.forEach(matchParent => {
        const parentId = matchParent[this.fromKey]
        response[parentId] = (response[parentId] || _([])).concat(item)
      })
    })
    console.log(response)
    return response
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
    const results = yield this.relatedQuery.whereIn(this.fromKey, result[this.toKey]).fetch()
    const response = {}
    response[value] = results
    return response
  }

  /**
   * Save related instance
   *
   * @param {any} relatedInstance
   * @returns
   *
   * @memberOf referMany
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

    if (relatedInstance.isNew()) {
      yield relatedInstance.save()
      console.log(relatedInstance)
      let referKeys = _.clone(this.parent.attributes[this.toKey])
      if (!referKeys || !_.isArray(referKeys)) {
        referKeys = []
      }
      referKeys.push(relatedInstance[this.fromKey])
      this.parent.set(this.toKey, referKeys)
      yield this.parent.save()
    } else {
      yield relatedInstance.save()
    }

    return relatedInstance
  }
}

module.exports = ReferMany
