'use strict'

/*
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const test = require('japa')
const chance = require('chance').Chance()
const _ = require('lodash')
const fs = require('fs-extra')
const path = require('path')
const { Config } = require('@adonisjs/sink')
const Database = require('../../src/Database')
const DatabaseManager = require('../../src/Database/Manager')
const helpers = require('./helpers')

test.group('Database | QueryBuilder', (group) => {
  group.before(async () => {
    await fs.ensureDir(path.join(__dirname, './tmp'))
    this.database = new Database(helpers.getConfig())
    await helpers.createCollections(this.database)
  })

  group.after(async () => {
    await helpers.dropCollections(this.database)
    this.database.close()
    try {
      await fs.remove(path.join(__dirname, './tmp'))
    } catch (error) {
      if (process.platform !== 'win32' || error.code !== 'EBUSY') {
        throw error
      }
    }
  }).timeout(0)

  test('destroy database connection', async (assert) => {
    await this.database.close()
    assert.plan(1)
    try {
      await this.database.setCollection('users').find()
    } catch ({ message }) {
      assert.equal(message, 'Topology was destroyed')
      this.database = new Database(helpers.getConfig())
    }
  })

  test('paginate results', async (assert) => {
    const users = _.map(_.range(10), () => {
      return { username: chance.word() }
    })
    await this.database.setCollection('users').insert(users)
    const result = await this.database.setCollection('users').paginate(1, 5)
    assert.equal(result.perPage, 5)
    assert.equal(result.total, 10)
    assert.equal(result.page, 1)
    assert.equal(result.lastPage, 2)
    assert.isAtMost(result.data.length, result.perPage)
    await this.database.setCollection('users').delete()
  })

  test('paginate results when records are less than perPage', async (assert) => {
    const users = _.map(_.range(4), () => {
      return { username: chance.word() }
    })
    await this.database.setCollection('users').insert(users)
    const result = await this.database.setCollection('users').paginate(1, 5)
    assert.equal(result.perPage, 5)
    assert.equal(result.total, 4)
    assert.equal(result.page, 1)
    assert.equal(result.lastPage, 1)
    assert.isAtMost(result.data.length, result.perPage)
    await this.database.setCollection('users').delete()
  })

  test('throw exception when proxy property is not a method', (assert) => {
    const fn = () => this.database.foo()
    assert.throw(fn, 'Database.foo is not a function')
  })
})

test.group('Database | Manager', () => {
  test('get instance of database using connection method', (assert) => {
    const config = new Config()
    config.set('database', {
      connection: 'testing',
      testing: helpers.getConfig()
    })
    const db = new DatabaseManager(config).connection()
    assert.instanceOf(db, Database)
  })

  // test('throw exception when unable to connect to database', async (assert) => {
  //   const config = new Config()
  //   config.set('database', {
  //     connection: 'testing',
  //     testing: {}
  //   })
  //   const db = () => new DatabaseManager(config).connection()
  //   assert.throw(db, 'knex: Required configuration option \'client\' is missing')
  // })

  test('throw exception when connection does not exists', (assert) => {
    const config = new Config()
    config.set('database', {
      connection: 'testing',
      testing: {}
    })
    const db = () => new DatabaseManager(config).connection('foo')
    assert.throw(db, 'E_MISSING_DB_CONNECTION: Missing database connection {foo}. Make sure you define it inside config/database.js file')
  })

  test('proxy database properties', (assert) => {
    const config = new Config()
    config.set('database', {
      connection: 'testing',
      testing: helpers.getConfig()
    })
    assert.isNull(new DatabaseManager(config)._globalTrx)
  })

  test('reuse existing database connection', (assert) => {
    const config = new Config()
    config.set('database', {
      connection: 'testing',
      testing: helpers.getConfig()
    })
    const dbManager = new DatabaseManager(config)
    dbManager.connection()
    assert.lengthOf(Object.keys(dbManager._connectionPools), 1)

    dbManager.connection()
    assert.lengthOf(Object.keys(dbManager._connectionPools), 1)
  })
})
