'use strict'

/*
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

require('../../lib/iocResolver').setFold(require('@adonisjs/fold'))
const test = require('japa')
const fs = require('fs-extra')
const path = require('path')
const moment = require('moment')
const GeoPoint = require('geo-point')
const ObjectID = require('mongodb').ObjectID
// const _ = require('lodash')
const { ioc } = require('@adonisjs/fold')
const { Config, setupResolver } = require('@adonisjs/sink')

const helpers = require('./helpers')
const Model = require('../../src/LucidMongo/Model')
const DatabaseManager = require('../../src/Database/Manager')

test.group('Field date format', (group) => {
  group.before(async () => {
    ioc.singleton('Adonis/Src/Database', function () {
      const config = new Config()
      config.set('database', {
        connection: 'testing',
        testing: helpers.getConfig()
      })
      return new DatabaseManager(config)
    })
    ioc.alias('Adonis/Src/Database', 'Database')

    await fs.ensureDir(path.join(__dirname, './tmp'))
    await helpers.createCollections(ioc.use('Database'))
    setupResolver()
  })

  group.afterEach(async () => {
    await ioc.use('Database').collection('users').delete()
  })

  group.after(async () => {
    await helpers.dropCollections(ioc.use('Database'))
    ioc.use('Database').close()
    try {
      await fs.remove(path.join(__dirname, './tmp'))
    } catch (error) {
      if (process.platform !== 'win32' || error.code !== 'EBUSY') {
        throw error
      }
    }
  }).timeout(0)

  test('Should parse the date field when assign', async (assert) => {
    class User extends Model {
      static get dates () {
        return ['last_login']
      }
    }
    User._bootIfNotBooted()
    const user = new User()
    user.last_login = '2018-01-01'
    assert.equal(moment.isMoment(user.$attributes.last_login), true)
    assert.equal(moment.utc('2018-01-01').isSame(user.last_login), true)
  })

  test('Should parse the date field when assign by constructor', async (assert) => {
    class User extends Model {
      static get dates () {
        return ['last_login']
      }
    }
    User._bootIfNotBooted()
    const user = new User({
      last_login: '2018-01-01'
    })
    assert.equal(moment.isMoment(user.$attributes.last_login), true)
    assert.equal(moment.utc('2018-01-01').isSame(user.last_login), true)
  })

  test('Should parse the date field when fill', async (assert) => {
    class User extends Model {
      static get dates () {
        return ['last_login']
      }
    }
    User._bootIfNotBooted()
    const user = new User()
    user.fill({
      last_login: '2018-01-01'
    })
    assert.equal(moment.isMoment(user.$attributes.last_login), true)
    assert.equal(moment.utc('2018-01-01').isSame(user.last_login), true)
  })

  test('Should store date field as date', async (assert) => {
    class User extends Model {
      static get dates () {
        return ['last_login']
      }
    }
    User._bootIfNotBooted()
    const user = await User.create({
      last_login: '2018-01-01'
    })
    assert.equal(moment.isMoment(user.$attributes.last_login), true)
    assert.equal(moment.utc('2018-01-01').isSame(user.last_login), true)
    const newUser = await ioc.use('Database').collection('users').findOne()
    assert.instanceOf(newUser.last_login, Date)
    assert.equal(moment.utc('2018-01-01').isSame(newUser.last_login), true)
  })

  test('Should update date field as date', async (assert) => {
    class User extends Model {
      static get dates () {
        return ['last_login']
      }
    }
    User._bootIfNotBooted()
    await User.create({
      last_login: '2018-01-01'
    })
    const user = await User.first()
    user.last_login = '2018-01-02'
    await user.save()
    assert.equal(moment.isMoment(user.$attributes.last_login), true)
    assert.equal(moment.utc('2018-01-02').isSame(user.last_login), true)
    const newUser = await ioc.use('Database').collection('users').findOne()
    assert.instanceOf(newUser.last_login, Date)
    assert.equal(moment.utc('2018-01-02').isSame(newUser.last_login), true)
  })

  test('Should convert date field as moment after fetch from database', async (assert) => {
    class User extends Model {
      static get dates () {
        return ['last_login']
      }
    }
    User._bootIfNotBooted()
    await User.createMany([
      {
        last_login: '2018-01-01'
      },
      {
        last_login: '2018-01-02'
      }
    ])
    const users = await User.all()
    assert.equal(moment.isMoment(users.first().$attributes.last_login), true)
    assert.equal(moment.utc('2018-01-01').isSame(users.first().last_login), true)
  })

  test('Should convert string params as date when build query 2 params', async (assert) => {
    class User extends Model {
      static get dates () {
        return ['last_login']
      }
    }
    User._bootIfNotBooted()
    const query = User.where('last_login', '2018-01-01')
    assert.instanceOf(query.query._conditions.last_login, Date)
    assert.equal(moment.utc('2018-01-01').isSame(query.query._conditions.last_login), true)
  })

  test('Should convert string params as date when build query object', async (assert) => {
    class User extends Model {
      static get dates () {
        return ['last_login']
      }
    }
    User._bootIfNotBooted()
    const query = User.where({ last_login: { $lt: '2018-01-01' } })
    assert.instanceOf(query.query._conditions.last_login.$lt, Date)
    assert.equal(moment.utc('2018-01-01').isSame(query.query._conditions.last_login.$lt), true)
  })

  test('Should convert string params as date when build query with chain method', async (assert) => {
    class User extends Model {
      static get dates () {
        return ['last_login']
      }
    }
    User._bootIfNotBooted()
    const query = User.where('last_login').lt('2018-01-01')
    assert.instanceOf(query.query._conditions.last_login.$lt, Date)
    assert.equal(moment.utc('2018-01-01').isSame(query.query._conditions.last_login.$lt), true)
  })

  test('Should convert moment params as date when build query', async (assert) => {
    class User extends Model {
      static get dates () {
        return ['last_login']
      }
    }
    User._bootIfNotBooted()
    const query = User.where({ last_login: { $gte: moment('2018-01-01') } })
    assert.instanceOf(query.query._conditions.last_login.$gte, Date)
    assert.equal(moment('2018-01-01').isSame(query.query._conditions.last_login.$gte), true)
  })

  test('Should keep date params when build query', async (assert) => {
    class User extends Model {
      static get dates () {
        return ['last_login']
      }
    }
    User._bootIfNotBooted()
    const query = User.where({ last_login: { $gte: new Date('2018-01-01') } })
    assert.instanceOf(query.query._conditions.last_login.$gte, Date)
    assert.equal(moment.utc('2018-01-01').isSame(query.query._conditions.last_login.$gte), true)
  })
})

test.group('Field geometry format', (group) => {
  group.before(async () => {
    ioc.singleton('Adonis/Src/Database', function () {
      const config = new Config()
      config.set('database', {
        connection: 'testing',
        testing: helpers.getConfig()
      })
      return new DatabaseManager(config)
    })
    ioc.alias('Adonis/Src/Database', 'Database')

    await fs.ensureDir(path.join(__dirname, './tmp'))
    await helpers.createCollections(ioc.use('Database'))
    setupResolver()
  })

  group.afterEach(async () => {
    await ioc.use('Database').collection('users').delete()
  })

  group.after(async () => {
    await helpers.dropCollections(ioc.use('Database'))
    ioc.use('Database').close()
    try {
      await fs.remove(path.join(__dirname, './tmp'))
    } catch (error) {
      if (process.platform !== 'win32' || error.code !== 'EBUSY') {
        throw error
      }
    }
  }).timeout(0)

  test('Should parse the geometry field when assign', async (assert) => {
    class User extends Model {
      static get geometries () {
        return ['location']
      }
    }
    User._bootIfNotBooted()
    const user = new User()
    user.location = {
      latitude: 1,
      longitude: 2
    }
    assert.instanceOf(user.$attributes.location, GeoPoint)
    assert.equal(user.$attributes.location.latitude, 1)
    assert.equal(user.$attributes.location.longitude, 2)
  })

  test('Should parse the geometry field when assign by constructor', async (assert) => {
    class User extends Model {
      static get geometries () {
        return ['location']
      }
    }
    User._bootIfNotBooted()
    const user = new User({
      location: {
        latitude: 1,
        longitude: 2
      }
    })
    assert.instanceOf(user.$attributes.location, GeoPoint)
    assert.equal(user.$attributes.location.latitude, 1)
    assert.equal(user.$attributes.location.longitude, 2)
  })

  test('Should parse the geometry field when fill', async (assert) => {
    class User extends Model {
      static get geometries () {
        return ['location']
      }
    }
    User._bootIfNotBooted()
    const user = new User()
    user.fill({
      location: {
        latitude: 1,
        longitude: 2
      }
    })
    assert.instanceOf(user.$attributes.location, GeoPoint)
    assert.equal(user.$attributes.location.latitude, 1)
    assert.equal(user.$attributes.location.longitude, 2)
  })

  test('Should store geometry field as geometry', async (assert) => {
    class User extends Model {
      static get geometries () {
        return ['location']
      }
    }
    User._bootIfNotBooted()
    const user = await User.create({
      location: {
        latitude: 1,
        longitude: 2
      }
    })
    assert.instanceOf(user.$attributes.location, GeoPoint)
    assert.equal(user.$attributes.location.latitude, 1)
    assert.equal(user.$attributes.location.longitude, 2)
    const newUser = await ioc.use('Database').collection('users').findOne()
    assert.instanceOf(newUser.location, Object)
    assert.equal(newUser.location.type, 'Point')
    assert.deepEqual(newUser.location.coordinates, [2, 1])
  })

  test('Should update geometry field as geometry', async (assert) => {
    class User extends Model {
      static get geometries () {
        return ['location']
      }
    }
    User._bootIfNotBooted()
    await User.create({
      location: {
        latitude: 1,
        longitude: 2
      }
    })
    const user = await User.first()
    user.location = {
      latitude: 2,
      longitude: 3
    }
    await user.save()
    assert.instanceOf(user.$attributes.location, GeoPoint)
    assert.equal(user.$attributes.location.latitude, 2)
    assert.equal(user.$attributes.location.longitude, 3)
    const newUser = await ioc.use('Database').collection('users').findOne()
    assert.instanceOf(newUser.location, Object)
    assert.equal(newUser.location.type, 'Point')
    assert.deepEqual(newUser.location.coordinates, [3, 2])
  })

  test('Should convert geometry field as GeoPoint after fetch from database', async (assert) => {
    class User extends Model {
      static get geometries () {
        return ['location']
      }
    }
    User._bootIfNotBooted()
    await User.createMany([
      {
        location: {
          latitude: 1,
          longitude: 2
        }
      },
      {
        location: {
          latitude: 1,
          longitude: 2
        }
      }
    ])
    const users = await User.all()
    assert.instanceOf(users.first().$attributes.location, GeoPoint)
    assert.equal(users.first().$attributes.location.latitude, 1)
    assert.equal(users.first().$attributes.location.longitude, 2)
  })
})

test.group('Field boolean format', (group) => {
  group.before(async () => {
    ioc.singleton('Adonis/Src/Database', function () {
      const config = new Config()
      config.set('database', {
        connection: 'testing',
        testing: helpers.getConfig()
      })
      return new DatabaseManager(config)
    })
    ioc.alias('Adonis/Src/Database', 'Database')

    await fs.ensureDir(path.join(__dirname, './tmp'))
    await helpers.createCollections(ioc.use('Database'))
    setupResolver()
  })

  group.afterEach(async () => {
    await ioc.use('Database').collection('users').delete()
  })

  group.after(async () => {
    await helpers.dropCollections(ioc.use('Database'))
    ioc.use('Database').close()
    try {
      await fs.remove(path.join(__dirname, './tmp'))
    } catch (error) {
      if (process.platform !== 'win32' || error.code !== 'EBUSY') {
        throw error
      }
    }
  }).timeout(0)

  test('Should parse the boolean field when assign', async (assert) => {
    class User extends Model {
      static get booleans () {
        return ['is_active']
      }
    }
    User._bootIfNotBooted()
    const user = new User()
    user.is_active = 1
    assert.equal(user.$attributes.is_active === true, true)
  })

  test('Should parse the boolean field when assign by constructor', async (assert) => {
    class User extends Model {
      static get booleans () {
        return ['is_active']
      }
    }
    User._bootIfNotBooted()
    const user = new User({
      is_active: 1
    })
    assert.equal(user.$attributes.is_active === true, true)
  })

  test('Should parse the boolean field when fill', async (assert) => {
    class User extends Model {
      static get booleans () {
        return ['is_active']
      }
    }
    User._bootIfNotBooted()
    const user = new User()
    user.fill({
      is_active: 1
    })
    assert.equal(user.$attributes.is_active === true, true)
  })

  test('Should store boolean field as boolean', async (assert) => {
    class User extends Model {
      static get booleans () {
        return ['is_active']
      }
    }
    User._bootIfNotBooted()
    const user = await User.create({
      is_active: 1
    })
    assert.equal(user.$attributes.is_active === true, true)
    const newUser = await ioc.use('Database').collection('users').findOne()
    assert.equal(newUser.is_active === true, true)
  })

  test('Should update boolean field as boolean', async (assert) => {
    class User extends Model {
      static get booleans () {
        return ['is_active']
      }
    }
    User._bootIfNotBooted()
    await User.create({
      is_active: 1
    })
    const user = await User.first()
    user.is_active = 1
    await user.save()
    assert.equal(user.$attributes.is_active === true, true)
    const newUser = await ioc.use('Database').collection('users').findOne()
    assert.equal(newUser.is_active === true, true)
  })

  test('Should convert boolean field as boolean after fetch from database', async (assert) => {
    class User extends Model {
      static get booleans () {
        return ['is_active']
      }
    }
    User._bootIfNotBooted()
    await User.createMany([
      {
        is_active: 1
      },
      {
        is_active: 0
      }
    ])
    const users = await User.all()
    assert.equal(users.first().$attributes.is_active === true, true)
  })

  test('Should convert non boolean params as boolean when build query', async (assert) => {
    class User extends Model {
      static get booleans () {
        return ['is_active']
      }
    }
    User._bootIfNotBooted()
    const query = User.where({
      is_active: 1
    })

    assert.deepEqual(query.query._conditions, {
      is_active: true
    })
  })
})

test.group('Field ObjectID format', (group) => {
  group.before(async () => {
    ioc.singleton('Adonis/Src/Database', function () {
      const config = new Config()
      config.set('database', {
        connection: 'testing',
        testing: helpers.getConfig()
      })
      return new DatabaseManager(config)
    })
    ioc.alias('Adonis/Src/Database', 'Database')

    await fs.ensureDir(path.join(__dirname, './tmp'))
    await helpers.createCollections(ioc.use('Database'))
    setupResolver()
  })

  group.afterEach(async () => {
    await ioc.use('Database').collection('users').delete()
  })

  group.after(async () => {
    await helpers.dropCollections(ioc.use('Database'))
    ioc.use('Database').close()
    try {
      await fs.remove(path.join(__dirname, './tmp'))
    } catch (error) {
      if (process.platform !== 'win32' || error.code !== 'EBUSY') {
        throw error
      }
    }
  }).timeout(0)

  test('Should parse the string to ObjectID field when assign', async (assert) => {
    class User extends Model {
      static get objectIDs () {
        return ['_id', 'group_id']
      }
    }
    User._bootIfNotBooted()
    const user = new User()
    user.group_id = '5a40077430f075256427a147'
    assert.instanceOf(user.$attributes.group_id, ObjectID)
    assert.equal(String(user.$attributes.group_id), '5a40077430f075256427a147')
  })

  test('Should keep the ObjectID field when assign', async (assert) => {
    class User extends Model {
      static get objectIDs () {
        return ['_id', 'group_id']
      }
    }
    User._bootIfNotBooted()
    const user = new User()
    user.group_id = ObjectID('5a40077430f075256427a147')
    assert.instanceOf(user.$attributes.group_id, ObjectID)
    assert.equal(String(user.$attributes.group_id), '5a40077430f075256427a147')
  })

  test('Should parse the string field to ObjectID when assign by constructor', async (assert) => {
    class User extends Model {
      static get objectIDs () {
        return ['_id', 'group_id']
      }
    }
    User._bootIfNotBooted()
    const user = new User({
      group_id: '5a40077430f075256427a147'
    })
    assert.instanceOf(user.$attributes.group_id, ObjectID)
    assert.equal(String(user.$attributes.group_id), '5a40077430f075256427a147')
  })

  test('Should keep the ObjectID field when assign by constructor', async (assert) => {
    class User extends Model {
      static get objectIDs () {
        return ['_id', 'group_id']
      }
    }
    User._bootIfNotBooted()
    const user = new User({
      group_id: ObjectID('5a40077430f075256427a147')
    })
    assert.instanceOf(user.$attributes.group_id, ObjectID)
    assert.equal(String(user.$attributes.group_id), '5a40077430f075256427a147')
  })

  test('Should parse the string field to ObjectID when fill', async (assert) => {
    class User extends Model {
      static get objectIDs () {
        return ['_id', 'group_id']
      }
    }
    User._bootIfNotBooted()
    const user = new User()
    user.fill({
      group_id: '5a40077430f075256427a147'
    })
    assert.instanceOf(user.$attributes.group_id, ObjectID)
    assert.equal(String(user.$attributes.group_id), '5a40077430f075256427a147')
  })

  test('Should keep the ObjectID field when fill', async (assert) => {
    class User extends Model {
      static get objectIDs () {
        return ['_id', 'group_id']
      }
    }
    User._bootIfNotBooted()
    const user = new User()
    user.fill({
      group_id: ObjectID('5a40077430f075256427a147')
    })
    assert.instanceOf(user.$attributes.group_id, ObjectID)
    assert.equal(String(user.$attributes.group_id), '5a40077430f075256427a147')
  })

  test('Should store string field as ObjectID', async (assert) => {
    class User extends Model {
      static get objectIDs () {
        return ['_id', 'group_id']
      }
    }
    User._bootIfNotBooted()
    const user = await User.create({
      group_id: '5a40077430f075256427a147'
    })
    assert.instanceOf(user.$attributes.group_id, ObjectID)
    assert.equal(String(user.$attributes.group_id), '5a40077430f075256427a147')
    const newUser = await ioc.use('Database').collection('users').findOne()
    assert.instanceOf(newUser.group_id, ObjectID)
    assert.equal(String(newUser.group_id), '5a40077430f075256427a147')
  })

  test('Should update string field as ObjectID', async (assert) => {
    class User extends Model {
      static get objectIDs () {
        return ['_id', 'group_id']
      }
    }
    User._bootIfNotBooted()
    await User.create({
      group_id: '5a40077430f075256427a147'
    })
    const user = await User.first()
    user.group_id = '5a40077430f075256427a148'
    await user.save()
    assert.instanceOf(user.$attributes.group_id, ObjectID)
    assert.equal(String(user.$attributes.group_id), '5a40077430f075256427a148')
    const newUser = await ioc.use('Database').collection('users').findOne()
    assert.instanceOf(newUser.group_id, ObjectID)
    assert.equal(String(newUser.group_id), '5a40077430f075256427a148')
  })

  test('Should keep ObjectID field as ObjectID', async (assert) => {
    class User extends Model {
      static get objectIDs () {
        return ['_id', 'group_id']
      }
    }
    User._bootIfNotBooted()
    await User.create({
      group_id: '5a40077430f075256427a147'
    })
    const user = await User.first()
    user.group_id = ObjectID('5a40077430f075256427a148')
    await user.save()
    assert.instanceOf(user.$attributes.group_id, ObjectID)
    assert.equal(String(user.$attributes.group_id), '5a40077430f075256427a148')
    const newUser = await ioc.use('Database').collection('users').findOne()
    assert.instanceOf(newUser.group_id, ObjectID)
    assert.equal(String(newUser.group_id), '5a40077430f075256427a148')
  })

  test('Should convert string params as ObjectID when build query', async (assert) => {
    class User extends Model {
      static get objectIDs () {
        return ['_id', 'group_id']
      }
    }
    User._bootIfNotBooted()
    const query = User.where({
      group_id: '5a40077430f075256427a147'
    })
    assert.instanceOf(query.query._conditions.group_id, ObjectID)
    assert.equal(String(query.query._conditions.group_id), '5a40077430f075256427a147')
  })

  test('Should keep ObjectID params as ObjectID when build query', async (assert) => {
    class User extends Model {
      static get objectIDs () {
        return ['_id', 'group_id']
      }
    }
    User._bootIfNotBooted()
    const query = User.where({
      group_id: ObjectID('5a40077430f075256427a147')
    })
    assert.instanceOf(query.query._conditions.group_id, ObjectID)
    assert.equal(String(query.query._conditions.group_id), '5a40077430f075256427a147')
  })

  test('Should convert array of string params as ObjectID when build query', async (assert) => {
    class User extends Model {
      static get objectIDs () {
        return ['_id', 'group_id']
      }
    }
    User._bootIfNotBooted()
    const query = User.where('group_id').in(['5a40077430f075256427a147', '5a40077430f075256427a148'])
    assert.instanceOf(query.query._conditions.group_id.$in[0], ObjectID)
    assert.instanceOf(query.query._conditions.group_id.$in[1], ObjectID)
    assert.equal(String(query.query._conditions.group_id.$in[0]), '5a40077430f075256427a147')
    assert.equal(String(query.query._conditions.group_id.$in[1]), '5a40077430f075256427a148')
  })

  test('Should convert array of string params as ObjectID when build query object', async (assert) => {
    class User extends Model {
      static get objectIDs () {
        return ['_id', 'group_id']
      }
    }
    User._bootIfNotBooted()
    const query = User.where({ group_id: { $in: ['5a40077430f075256427a147', '5a40077430f075256427a148'] } })
    assert.instanceOf(query.query._conditions.group_id.$in[0], ObjectID)
    assert.instanceOf(query.query._conditions.group_id.$in[1], ObjectID)
    assert.equal(String(query.query._conditions.group_id.$in[0]), '5a40077430f075256427a147')
    assert.equal(String(query.query._conditions.group_id.$in[1]), '5a40077430f075256427a148')
  })

  test('Should convert string params as ObjectID when build query or', async (assert) => {
    class User extends Model {
      static get objectIDs () {
        return ['_id', 'group_id']
      }
    }
    User._bootIfNotBooted()
    const query = User.where({
      $or: [
        { group_id: { $in: ['5a40077430f075256427a147', '5a40077430f075256427a148'] } },
        { age: { $gt: 15 } }
      ]
    })
    assert.instanceOf(query.query._conditions.$or[0].group_id.$in[0], ObjectID)
    assert.equal(String(query.query._conditions.$or[0].group_id.$in[0]), '5a40077430f075256427a147')
  })

  test('Should accept null as value for the related primary key', async (assert) => {
    class User extends Model {
      static get objectIDs () {
        return ['_id', 'group_id']
      }
    }
    User._bootIfNotBooted()
    const user = await User.create({
      group_id: null
    })

    assert.equal(user.$attributes.group_id, null)
    const newUser = await ioc.use('Database').collection('users').findOne()
    assert.equal(newUser.group_id, null)
  })
})
