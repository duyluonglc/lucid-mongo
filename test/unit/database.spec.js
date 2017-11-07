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
      await this.database.collection('users').find()
    } catch ({ message }) {
      assert.equal(message, 'Topology was destroyed')
      this.database = new Database(helpers.getConfig())
    }
  })

  test('query with where conditions is object', (assert) => {
    this.database.collection('users').where({ name: 'vik' }).where({ age: { gt: 30 } })
    assert.deepEqual(this.database.queryBuilder._conditions, { name: 'vik', age: { $gt: 30 } })
  })

  test('query using mquery where', (assert) => {
    this.database.collection('users').where('name').eq('vik').where('age').gte(30)
    assert.deepEqual(this.database.queryBuilder._conditions, { name: 'vik', age: { $gte: 30 } })
  })

  test('query where with 3 params', (assert) => {
    this.database.collection('users').where('name', '=', 'vik').where('age', '<>', 30)
    assert.deepEqual(this.database.queryBuilder._conditions, { name: 'vik', age: { $ne: 30 } })
  })

  test('query with limit, skip', (assert) => {
    this.database.collection('users').where('name', 'vik').limit(10).skip(20)
    assert.deepEqual(this.database.queryBuilder.options, { limit: 10, skip: 20 })
  })

  test('query with sort', (assert) => {
    this.database.collection('users').where('name', 'vik').sort({ name: 'asc', age: -1 })
    assert.deepEqual(this.database.queryBuilder.options, { sort: { name: 1, age: -1 } })
    this.database.collection('users').where('name', 'vik').sort('-name age')
    assert.deepEqual(this.database.queryBuilder.options, { sort: { name: -1, age: 1 } })
  })

  test('find method', async (assert) => {
    const users = _.map(_.range(4), () => {
      return { username: chance.word() }
    })
    await this.database.collection('users').insert(users)
    const users1 = await this.database.collection('users').find()
    assert.lengthOf(users1, 4)
    await this.database.collection('users').delete()
    const users2 = await this.database.collection('users').find()
    assert.lengthOf(users2, 0)
  })

  test('findOne method', async (assert) => {
    await this.database.collection('users').insert({ name: 'vik' })
    const user = await this.database.collection('users').findOne()
    assert.equal(user.name, 'vik')
    await this.database.collection('users').delete()
  })

  test('first method', async (assert) => {
    await this.database.collection('users').insert({ name: 'vik' })
    const user = await this.database.collection('users').first()
    assert.equal(user.name, 'vik')
    await this.database.collection('users').delete()
  })

  test('pluck method', async (assert) => {
    await this.database.collection('users').insert({ name: 'vik' })
    const names = await this.database.collection('users').pluck('name')
    assert.equal(names[0], 'vik')
    await this.database.collection('users').delete()
  })

  test('update method', async (assert) => {
    await this.database.collection('users').insert({ name: 'vik' })
    await this.database.collection('users').update({ name: 'nik' })
    const user = await this.database.collection('users').first()
    assert.equal(user.name, 'nik')
    await this.database.collection('users').delete()
  })

  test('count method', async (assert) => {
    const users = [{ name: 'vik' }, { name: 'vik' }, { name: 'nik' }, { name: 'nik' }]
    await this.database.collection('users').insert(users)
    const count = await this.database.collection('users').count()
    assert.equal(count, 4)
    const count2 = await this.database.collection('users').count('name')
    assert.deepEqual(count2, [{ _id: 'nik', count: 2 }, { _id: 'vik', count: 2 }])
    await this.database.collection('users').delete()
  })

  test('sum method', async (assert) => {
    const users = [{ name: 'vik', score: 10 }, { name: 'vik', score: 10 }, { name: 'nik', score: 10 }, { name: 'nik', score: 10 }]
    await this.database.collection('users').insert(users)
    const sum = await this.database.collection('users').sum('score')
    assert.equal(sum, 40)
    const sum2 = await this.database.collection('users').sum('score', 'name')
    assert.deepEqual(sum2, [{ _id: 'nik', sum: 20 }, { _id: 'vik', sum: 20 }])
    await this.database.collection('users').delete()
  })

  test('avg method', async (assert) => {
    const users = [{ name: 'vik', score: 10 }, { name: 'vik', score: 10 }, { name: 'nik', score: 10 }, { name: 'nik', score: 10 }]
    await this.database.collection('users').insert(users)
    const avg = await this.database.collection('users').avg('score')
    assert.equal(avg, 10)
    const avg2 = await this.database.collection('users').avg('score', 'name')
    assert.deepEqual(avg2, [{ _id: 'nik', avg: 10 }, { _id: 'vik', avg: 10 }])
    await this.database.collection('users').delete()
  })

  test('max method', async (assert) => {
    const users = [{ name: 'vik', score: 10 }, { name: 'vik', score: 30 }, { name: 'nik', score: 30 }, { name: 'nik', score: 40 }]
    await this.database.collection('users').insert(users)
    const max = await this.database.collection('users').max('score')
    assert.equal(max, 40)
    const max2 = await this.database.collection('users').max('score', 'name')
    assert.deepEqual(max2, [{ _id: 'nik', max: 40 }, { _id: 'vik', max: 30 }])
    await this.database.collection('users').delete()
  })

  test('min method', async (assert) => {
    const users = [{ name: 'vik', score: 10 }, { name: 'vik', score: 30 }, { name: 'nik', score: 30 }, { name: 'nik', score: 40 }]
    await this.database.collection('users').insert(users)
    const min = await this.database.collection('users').min('score')
    assert.equal(min, 10)
    const min2 = await this.database.collection('users').min('score', 'name')
    assert.deepEqual(min2, [{ _id: 'nik', min: 30 }, { _id: 'vik', min: 10 }])
    await this.database.collection('users').delete()
  })

  test('distinct method', async (assert) => {
    const users = [{ name: 'vik', score: 10 }, { name: 'vik', score: 30 }, { name: 'nik', score: 30 }, { name: 'nik', score: 40 }]
    await this.database.collection('users').insert(users)
    const names = await this.database.collection('users').distinct('name')
    assert.deepEqual(names, ['vik', 'nik'])
    const names2 = await this.database.collection('users').where({ score: { lt: 30 } }).distinct('name')
    assert.deepEqual(names2, ['vik'])
    await this.database.collection('users').delete()
  })

  test('paginate results', async (assert) => {
    const users = _.map(_.range(10), () => {
      return { username: chance.word() }
    })
    await this.database.collection('users').insert(users)
    const result = await this.database.collection('users').paginate(1, 5)
    assert.equal(result.perPage, 5)
    assert.equal(result.total, 10)
    assert.equal(result.page, 1)
    assert.equal(result.lastPage, 2)
    assert.isAtMost(result.data.length, result.perPage)
    await this.database.collection('users').delete()
  })

  test('paginate results when records are less than perPage', async (assert) => {
    const users = _.map(_.range(4), () => {
      return { username: chance.word() }
    })
    await this.database.collection('users').insert(users)
    const result = await this.database.collection('users').paginate(1, 5)
    assert.equal(result.perPage, 5)
    assert.equal(result.total, 4)
    assert.equal(result.page, 1)
    assert.equal(result.lastPage, 1)
    assert.isAtMost(result.data.length, result.perPage)
    await this.database.collection('users').delete()
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
