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
const path = require('path')
const fs = require('fs-extra')
const { ioc } = require('@adonisjs/fold')
const { Config, setupResolver } = require('@adonisjs/sink')
const Schema = require('../../src/Schema')
const helpers = require('./helpers')
const DatabaseManager = require('../../src/Database/Manager')

test.group('Schema', (group) => {
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
    await ioc.use('Database').schema.dropCollectionIfExists('schema_users')
    await ioc.use('Database').schema.dropCollectionIfExists('schema_profiles')
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

  test('run schema methods using schema instance', (assert) => {
    class UserSchema extends Schema {
    }
    const userSchema = new UserSchema(ioc.use('Database'))
    const fn = function () {}
    userSchema.createCollection('users', fn)
    assert.deepEqual(userSchema._deferredActions, [{ name: 'createCollection', args: ['users', fn] }])
  })

  test('add deferred action for createCollectionIfNotExists', (assert) => {
    class UserSchema extends Schema {
    }
    const userSchema = new UserSchema(ioc.use('Database'))
    const fn = function () {}
    userSchema.createCollectionIfNotExists('users', fn)
    assert.deepEqual(userSchema._deferredActions, [{ name: 'createCollectionIfNotExists', args: ['users', fn] }])
  })

  test('add deferred action for renameCollection', (assert) => {
    class UserSchema extends Schema {
    }
    const userSchema = new UserSchema(ioc.use('Database'))
    const fn = function () {}
    userSchema.renameCollection('users', fn)
    assert.deepEqual(userSchema._deferredActions, [{ name: 'renameCollection', args: ['users', fn] }])
  })

  test('add deferred action for collection', (assert) => {
    class UserSchema extends Schema {
    }
    const userSchema = new UserSchema(ioc.use('Database'))
    const fn = function () {}
    userSchema.alter('users', fn)
    assert.deepEqual(userSchema._deferredActions, [{ name: 'collection', args: ['users', fn] }])
  })

  test('add deferred action for dropCollectionIfExists', (assert) => {
    class UserSchema extends Schema {
    }
    const userSchema = new UserSchema(ioc.use('Database'))
    userSchema.dropIfExists('users')
    assert.deepEqual(userSchema._deferredActions, [{ name: 'dropCollectionIfExists', args: ['users'] }])
  })

  test('add deferred action for rename collection', (assert) => {
    class UserSchema extends Schema {
    }
    const userSchema = new UserSchema(ioc.use('Database'))
    userSchema.rename('users', 'my_users')
    assert.deepEqual(userSchema._deferredActions, [{ name: 'renameCollection', args: ['users', 'my_users'] }])
  })

  test('execute schema actions in sequence', async (assert) => {
    class UserSchema extends Schema {
      up () {
        this.createCollection('schema_users', (collection) => {
          collection.increments()
        })

        this.createCollection('schema_profile', (collection) => {
          collection.increments()
        })
      }
    }
    const userSchema = new UserSchema(ioc.use('Database'))
    userSchema.up()
    await userSchema.executeActions()
    const hasUsers = await userSchema.hasCollection('schema_users')
    const hasProfile = await userSchema.hasCollection('schema_profile')
    assert.isTrue(hasUsers)
    assert.isTrue(hasProfile)
    await ioc.use('Database').schema.dropCollection('schema_users')
    await ioc.use('Database').schema.dropCollection('schema_profile')
  })

  // test('get actions sql over executing them', async (assert) => {
  //   class UserSchema extends Schema {
  //     up () {
  //       this.createCollection('schema_users', (collection) => {
  //         collection.increments()
  //       })

  //       this.createCollection('users', (collection) => {
  //         collection.increments()
  //       })
  //     }
  //   }

  //   const userSchema = new UserSchema(ioc.use('Database'))
  //   userSchema.up()
  //   const queries = await userSchema.executeActions(true)
  //   assert.lengthOf(queries, 2)
  //   const hasSchemaUsers = await ioc.use('Database').schema.hasCollection('schema_users')
  //   assert.isFalse(hasSchemaUsers)
  // })
})
