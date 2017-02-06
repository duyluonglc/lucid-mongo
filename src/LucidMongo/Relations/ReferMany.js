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
      let referKeys = _.clone(this.parent.get(this.toKey))
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

  /**
   * fetch
   *
   * @public
   *
   * @return {Array}
   */
  * fetch () {
    return yield this.relatedQuery.whereIn(this.fromKey, this.parentget(this.toKey)).fetch()
  }

  /**
   * find
   *
   * @public
   *
   * @return {Object}
   */
  * find (id) {
    return yield this.relatedQuery.whereIn(this.fromKey, this.parent.get(this.toKey)).find(id)
  }

  /**
   * fetch
   *
   * @public
   *
   * @return {Object}
   */
  * first () {
    return yield this.relatedQuery.whereIn(this.fromKey, this.parent.get(this.toKey)).first()
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

  /**
   * attach method will add relationship to the pivot collection
   * with current instance and related model values
   *
   * @param  {Array|Object} references
   * @return {Number}
   *
   * @example
   * user.roles().attach(1)
   * user.roles().attach(role1)
   * user.roles().attach([1,2])
   * user.roles().attach([role1, role2])
   *
   * @public
   */
  * attach (references) {
    if (this.parent.isNew()) {
      throw CE.ModelRelationException.unSavedTarget('attach', this.parent.constructor.name, this.related.name)
    }

    // if (!_.isArray(references) && !_.isObject(references)) {
    //   throw CE.InvalidArgumentException.invalidParameter('attach expects an array of values or a plain object')
    // }

    if (!this.parent[this.fromKey]) {
      logger.warn(`Trying to attach values with ${this.fromKey} as primaryKey, whose value is falsy`)
    }

    let saveReferences = _.isArray(this.parent.get(this.toKey)) ? _.clone(this.parent.get(this.toKey)) : []
    if (_.isArray(references)) {
      references = _.map(references, function (reference) {
        return _.isObject(reference) ? reference[this.fromKey] : reference
      })
    } else if (_.isObject(references)) {
      references = [references[this.fromKey]]
    } else {
      references = [references]
    }
    saveReferences = _.union(_.concat(saveReferences, references))
    return yield this.parent.set(this.toKey, saveReferences).save()
  }

  /**
   * removes the relationship stored inside a pivot collection. If
   * references are not defined all relationships will be
   * deleted
   * @method detach
   * @param  {Array} [references]
   * @return {Number}
   *
   * @public
   */
  * detach (references) {
    if (this.parent.isNew()) {
      throw CE.ModelRelationException.unSavedTarget('detach', this.parent.constructor.name, this.related.name)
    }

    // if (!_.isArray(references) && !_.isObject(references)) {
    //   throw CE.InvalidArgumentException.invalidParameter('attach expects an array of values or a plain object')
    // }

    if (!this.parent[this.fromKey]) {
      logger.warn(`Trying to detach values with ${this.fromKey} as primaryKey, whose value is falsy`)
    }

    let saveReferences = _.isArray(this.parent.get(this.toKey)) ? _.clone(this.parent.get(this.toKey)) : []
    if (references !== undefined) {
      if (_.isArray(references)) {
        references = _.map(references, function (reference) {
          return _.isObject(reference) ? reference[this.fromKey] : reference
        })
      } else if (_.isObject(references)) {
        references = [references[this.fromKey]]
      } else {
        references = [references]
      }
      saveReferences = _.difference(saveReferences, references)
    } else {
      saveReferences = []
    }
    return yield this.parent.set(this.toKey, saveReferences).save()
  }

  /**
   * shorthand for detach and then attach
   *
   * @param  {Array} [references]
   * @return {Number}
   *
   * @public
   */
  * sync (references) {
    if (this.parent.isNew()) {
      throw CE.ModelRelationException.unSavedTarget('sync', this.parent.constructor.name, this.related.name)
    }
    let saveReferences = []
    if (references !== undefined) {
      if (_.isArray(references)) {
        saveReferences = _.map(references, function (reference) {
          return _.isObject(reference) ? reference[this.fromKey] : reference
        })
      } else if (_.isObject(references)) {
        saveReferences = [references[this.fromKey]]
      } else {
        saveReferences = [references]
      }
      saveReferences = _.difference(saveReferences, references)
    }
    return yield this.parent.set(this.toKey, saveReferences).save()
  }

  /**
   * detach item from references and delete item
   *
   * @param  {Object} [reference]
   * @return {Number}
   *
   * @public
   */
  * delete (reference) {
    if (this.parent.isNew()) {
      throw CE.ModelRelationException.unSavedTarget('delete', this.parent.constructor.name, this.related.name)
    }
    if (!reference) {
      throw CE.InvalidArgumentException.invalidParameter('delete expects a primary key or instance of related')
    }
    yield this.detach(reference)
    if (_.isObject(reference)) {
      return yield reference.delete()
    } else {
      return yield this.relatedQuery.where(this.fromKey, reference).delete()
    }
  }

  /**
   * detach all item from references and delete them
   *
   * @return {Number}
   *
   * @public
   */
  * deleteAll () {
    if (this.parent.isNew()) {
      throw CE.ModelRelationException.unSavedTarget('deleteAll', this.parent.constructor.name, this.related.name)
    }
    const references = this.target.get(this.toKey)
    yield this.detach()
    return yield this.relatedQuery.whereIn(this.fromKey, references).delete()
  }

}

module.exports = ReferMany
