'use strict'

/**
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

require('harmony-reflect')
const Ioc = require('adonis-fold').Ioc
const EagerLoad = require('../Relations').EagerLoad
const proxyHandler = require('./proxyHandler')
const mquery = require('mquery')

/**
 * Query builder instance will be used for creating fluent queries.
 * It is database provider with couple of extra methods on top
 * of it.
 *
 * @class
 */
class QueryBuilder {
  constructor(HostModel) {
    this.HostModel = HostModel
    this.queryBuilder = mquery()
    this.modelQueryBuilder = mquery()
    this.avoidTrashed = false
    this.eagerLoad = new EagerLoad()
    return new Proxy(this, proxyHandler)
  }

  * connect() {
    const Database = Ioc.use('Adonis/Src/Database')
    const connection = yield Database.connection(this.HostModel.connection)
    const collection = connection.collection(this.HostModel.table)
    this.modelQueryBuilder.collection(collection)
    return connection
  }

}

module.exports = QueryBuilder
