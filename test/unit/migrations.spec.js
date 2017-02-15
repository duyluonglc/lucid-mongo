'use strict'

/**
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

/* global describe, it, before,after */
const _ = require('lodash')
const Ioc = require('adonis-fold').Ioc
const chai = require('chai')
const cf = require('co-functional')
const Migrations = require('../../src/Migrations')
const Database = require('../../src/Database')
const Schema = require('../../src/Schema')
const filesFixtures = require('./fixtures/files')
const config = require('./helpers/config')
const expect = chai.expect
require('co-mocha')

const Config = {
  get: function () {
    return 'adonis_migrations'
  }
}

describe('Migrations', function () {
  before(function * () {
    Database._setConfigProvider(config)
    Ioc.bind('Adonis/Src/Database', function () {
      return Database
    })
    yield filesFixtures.createDir()
  })

  after(function * () {
    yield Database.schema.dropCollectionIfExists('adonis_migrations')
    yield Database.schema.dropCollectionIfExists('users')
    yield Database.connection('alternateConnection').schema.dropCollectionIfExists('accounts')
    yield filesFixtures.cleanStorage()
    Database.close()
  })

  it('should make migrations collection', function * () {
    const Runner = new Migrations(Database, Config)
    const runner = new Runner()
    yield runner._makeMigrationsCollection()
    const columns = yield runner.database.collection('adonis_migrations').columnInfo()
    expect(columns).to.be.an('object')
    expect(_.keys(columns)).deep.equal(['_id', 'name', 'batch', 'migration_time'])
    yield runner.database.schema.dropCollection('adonis_migrations')
  })

  it('should not throw error when migrations collection already exists', function * () {
    const Runner = new Migrations(Database, Config)
    const runner = new Runner()
    yield runner.database.schema.createCollection('adonis_migrations', (collection) => {
      collection.integer('_id')
    })
    const columns = yield runner.database.collection('adonis_migrations').columnInfo()
    expect(columns).to.be.an('object')
    expect(_.keys(columns)).deep.equal(['_id'])
    yield runner._makeMigrationsCollection()
    yield runner.database.schema.dropCollection('adonis_migrations')
  })

  it('should return difference of files to be executed for up direction', function () {
    const Runner = new Migrations(Database, Config)
    const runner = new Runner()
    class Users extends Schema {
      up () {}
    }
    class Accounts extends Schema {
      up () {}
    }
    class Authors extends Schema {
      up () {}
    }
    const files = {1: Users, 2: Accounts, 3: Authors}
    const diff = runner._getMigrationsList(files, ['1'], 'up')
    expect(_.keys(diff)).deep.equal(['2', '3'])
  })

  it('should return difference in sequence even if match sequence is different', function () {
    const Runner = new Migrations(Database, Config)
    const runner = new Runner()
    class Users extends Schema {
      up () {}
    }
    class Accounts extends Schema {
      up () {}
    }
    class Authors extends Schema {
      up () {}
    }
    const files = {1: Users, 2: Accounts, 3: Authors}
    const diff = runner._getMigrationsList(files, ['2'], 'up')
    expect(_.keys(diff)).deep.equal(['1', '3'])
  })

  it('should return difference in reverse when direction is down', function () {
    const Runner = new Migrations(Database, Config)
    const runner = new Runner()
    class Users extends Schema {
      down () {}
    }
    class Accounts extends Schema {
      down () {}
    }
    class Authors extends Schema {
      down () {}
    }
    const files = {1: Users, 2: Accounts, 3: Authors}
    const diff = runner._getMigrationsList(files, ['2'], 'down')
    expect(_.keys(diff)).deep.equal(['2'])
  })

  it('should return difference in reverse and correct order when direction is down', function () {
    const Runner = new Migrations(Database, Config)
    const runner = new Runner()
    class Users extends Schema {
      down () {}
    }
    class Accounts extends Schema {
      down () {}
    }
    class Authors extends Schema {
      down () {}
    }
    const files = {1: Users, 2: Accounts, 3: Authors}
    const diff = runner._getMigrationsList(files, ['2', '1'], 'down')
    expect(_.keys(diff)).deep.equal(['1', '2'])
  })

  it('should throw an exception when trying to map migration actions which are not es6 classes', function () {
    const Runner = new Migrations(Database, Config)
    const runner = new Runner()
    const files = {1: {}}
    const diff = () => runner._mapMigrationsToActions(runner._getMigrationsList(files, [], 'up'))
    expect(diff).to.throw(/Make sure you are exporting a class from 1/)
  })

  it('should make lock collection', function * () {
    const Runner = new Migrations(Database, Config)
    const runner = new Runner()
    yield runner._makeLockCollection()
    const columns = yield runner.database.collection('adonis_migrations_lock').columnInfo()
    expect(columns).to.be.an('object')
    expect(_.keys(columns)).deep.equal(['_id', 'is_locked'])
    yield runner.database.schema.dropCollection('adonis_migrations_lock')
  })

  it('should return false when there is no lock', function * () {
    const Runner = new Migrations(Database, Config)
    const runner = new Runner()
    yield runner._makeLockCollection()
    const isLocked = yield runner._checkLock()
    expect(isLocked).to.equal(false)
    yield runner.database.schema.dropCollection('adonis_migrations_lock')
  })

  it('should add a lock to the lock collection', function * () {
    const Runner = new Migrations(Database, Config)
    const runner = new Runner()
    yield runner._makeLockCollection()
    yield runner._addLock()
    const lock = yield runner.database.collection('adonis_migrations_lock').where('is_locked', 1)
    expect(lock.length).to.equal(1)
    yield runner.database.schema.dropCollection('adonis_migrations_lock')
  })

  it('should throw an error when a collection has been locked', function * () {
    const Runner = new Migrations(Database, Config)
    const runner = new Runner()
    yield runner._makeLockCollection()
    yield runner._addLock()
    try {
      yield runner._checkLock()
      expect(true).to.equal(false)
    } catch (e) {
      expect(e.name).to.equal('RuntimeException')
      expect(e.message).to.equal('E_LOCK_ON_MIGRATIONS: Migrations are currently locked. Make sure to run single migration process at a given time or delete adonis_migrations_lock collection from database')
    }
    yield runner.database.schema.dropCollection('adonis_migrations_lock')
  })

  it('should free an added lock by deleting the lock collection', function * () {
    const Runner = new Migrations(Database, Config)
    const runner = new Runner()
    yield runner._makeLockCollection()
    yield runner._addLock()
    yield runner._deleteLock()
    try {
      yield runner.database.collection('adonis_migrations_lock').where('is_locked', 1)
      expect(true).to.equal(false)
    } catch (e) {
      expect(e.code).to.be.oneOf(['ER_NO_SUCH_TABLE', 'SQLITE_ERROR', '42P01'])
    }
  })

  it('should return migration status', function * () {
    const Runner = new Migrations(Database, Config)
    const runner = new Runner()
    class Users extends Schema {
      up () {
        this.create('users', function (collection) {
          collection.increments()
          collection.string('username')
        })
      }
      down () {
        this.drop('users')
      }
    }

    class Accounts extends Schema {
      up () {
        this.create('accounts', function (collection) {
          collection.increments()
          collection.string('account_name')
        })
      }
    }

    const batch1 = {'2015-01-20': Users}
    const batch2 = {'2016-03-13': Accounts}
    const all = {}
    _.merge(all, batch1, batch2)
    yield runner.up(batch1)
    const status = yield runner.status(all)
    expect(status).deep.equal({'2015-01-20': 'Y', '2016-03-13': 'N'})
    yield runner.database.schema.dropCollection('users')
    yield runner.database.schema.dropCollection('adonis_migrations')
  })

  it('should migrate the database by calling the up method', function * () {
    const Runner = new Migrations(Database, Config)
    const runner = new Runner()
    class Users extends Schema {
      up () {
        this.create('users', function (collection) {
          collection.increments()
          collection.string('username')
        })
      }
    }
    const migrations = {'2015-01-20': Users}
    const result = yield runner.up(migrations)
    expect(result.status).to.equal('completed')
    expect(result.migrated).deep.equal(_.keys(migrations))
    const usersCollection = yield runner.database.collection('users').columnInfo()
    expect(usersCollection).to.be.an('object')
    expect(_.keys(usersCollection)).deep.equal(['_id', 'username'])
    yield runner.database.schema.dropCollection('users')
    yield runner.database.schema.dropCollection('adonis_migrations')
  })

  it('should rollback the recently executed migrations', function * () {
    const Runner = new Migrations(Database, Config)
    const runner = new Runner()
    const rollbackRunner = new Runner()
    class Users extends Schema {
      up () {
        this.create('users', function (collection) {
          collection.increments()
          collection.string('username')
        })
      }

      down () {
        this.collection('users', function (collection) {
          collection.dropColumn('username')
        })
      }
    }
    const migrations = {'2015-01-20': Users}
    const result = yield runner.up(migrations)
    expect(result.status).to.equal('completed')
    expect(result.migrated).deep.equal(_.keys(migrations))

    const rollback = yield rollbackRunner.down(migrations)
    expect(rollback.status).to.equal('completed')
    expect(rollback.migrated).deep.equal(_.keys(migrations))

    const usersCollection = yield runner.database.collection('users').columnInfo()
    expect(usersCollection).to.be.an('object')
    expect(_.keys(usersCollection)).deep.equal(['_id'])

    yield runner.database.schema.dropCollection('adonis_migrations')
    yield runner.database.schema.dropCollection('users')
  })

  it('should be able to use a different connection for a given schema', function * () {
    const Runner = new Migrations(Database, Config)
    const runner = new Runner()
    class Accounts extends Schema {
      static get connection () {
        return 'alternateConnection'
      }

      up () {
        this.create('accounts', function (collection) {
          collection.increments()
          collection.string('account_name')
        })
      }
    }
    const migrations = {'2015-01-20': Accounts}
    const result = yield runner.up(migrations)
    expect(result.status).to.equal('completed')
    expect(result.migrated).deep.equal(_.keys(migrations))

    try {
      yield runner.database.collection('accounts')
      expect(true).to.equal(false)
    } catch (e) {
      expect(e.code).to.be.oneOf(['ER_NO_SUCH_TABLE', 'SQLITE_ERROR', '42P01'])
      const accounts = yield runner.database.connection('alternateConnection').collection('accounts').columnInfo()
      expect(accounts).to.be.an('object')
      expect(_.keys(accounts)).deep.equal(['_id', 'account_name'])
    }
    yield runner.database.schema.dropCollection('adonis_migrations')
    yield runner.database.connection('alternateConnection').schema.dropCollection('accounts')
  })

  it('should be able to rollback migrations when schema is using a different connection', function * () {
    const Runner = new Migrations(Database, Config)
    const runner = new Runner()
    const rollbackRunner = new Runner()
    class Accounts extends Schema {
      static get connection () {
        return 'alternateConnection'
      }

      up () {
        this.create('accounts', function (collection) {
          collection.increments()
          collection.string('account_name')
        })
      }

      down () {
        this.collection('accounts', function (collection) {
          collection.dropColumn('account_name')
        })
      }
    }
    const migrations = {'2015-01-20': Accounts}
    const result = yield runner.up(migrations)
    expect(result.status).to.equal('completed')
    expect(result.migrated).deep.equal(_.keys(migrations))

    const rollback = yield rollbackRunner.down(migrations)
    expect(rollback.status).to.equal('completed')
    expect(rollback.migrated).deep.equal(_.keys(migrations))

    const accounts = yield runner.database.connection('alternateConnection').collection('accounts').columnInfo()
    expect(accounts).to.be.an('object')
    expect(_.keys(accounts)).deep.equal(['_id'])

    const migrationsCollection = yield runner.database.collection('adonis_migrations')
    expect(migrationsCollection.length).to.equal(0)

    yield runner.database.schema.dropCollection('adonis_migrations')
    yield runner.database.connection('alternateConnection').schema.dropCollection('accounts')
  })

  it('should only rollback to the previous batch', function * () {
    class User extends Schema {
      up () {
        this.create('users', function (collection) {
          collection.increments()
          collection.string('username')
        })
      }

      down () {
        this.collection('users', function (collection) {
          collection.dropColumn('username')
        })
      }
    }

    class Account extends Schema {
      static get connection () {
        return 'alternateConnection'
      }

      up () {
        this.create('accounts', function (collection) {
          collection.increments()
          collection.string('account_name')
        })
      }

      down () {
        this.collection('accounts', function (collection) {
          collection.dropColumn('account_name')
        })
      }
    }

    const migrationsB1 = {'2016-01-30_create_users_collection': User}
    const migrationsB2 = {'2016-01-30_create_accouts_collection': Account}
    let allMigs = {}
    _.merge(allMigs, migrationsB1, migrationsB2)
    const Runner = new Migrations(Database, Config)

    let runner, result, rollback
    runner = new Runner()
    result = yield runner.up(migrationsB1)
    expect(result.status).to.equal('completed')
    expect(result.migrated).deep.equal(_.keys(migrationsB1))

    runner = new Runner()
    result = yield runner.up(migrationsB2)
    expect(result.status).to.equal('completed')
    expect(result.migrated).deep.equal(_.keys(migrationsB2))

    runner = new Runner()
    rollback = yield runner.down(allMigs)
    expect(rollback.status).to.equal('completed')
    expect(rollback.migrated).deep.equal(_.keys(migrationsB2))

    const usersInfo = yield runner.database.collection('users').columnInfo()
    expect(_.keys(usersInfo)).deep.equal(['_id', 'username'])

    const accountsInfo = yield runner.database.connection('alternateConnection').collection('accounts').columnInfo()
    expect(_.keys(accountsInfo)).deep.equal(['_id'])
    yield runner.database.schema.dropCollection('adonis_migrations')
    yield runner.database.schema.dropCollection('users')
    yield runner.database.connection('alternateConnection').schema.dropCollection('accounts')
  })

  it('should rollback to a given specific batch', function * () {
    class User extends Schema {
      up () {
        this.create('users', function (collection) {
          collection.increments()
          collection.string('username')
        })
      }

      down () {
        this.collection('users', function (collection) {
          collection.dropColumn('username')
        })
      }
    }

    class Account extends Schema {
      static get connection () {
        return 'alternateConnection'
      }

      up () {
        this.create('accounts', function (collection) {
          collection.increments()
          collection.string('account_name')
        })
      }

      down () {
        this.collection('accounts', function (collection) {
          collection.dropColumn('account_name')
        })
      }
    }

    const migrationsB1 = {'2016-01-30_create_accounts_collection': Account}
    const migrationsB2 = {'2016-01-30_create_users_collection': User}
    let allMigs = {}
    _.merge(allMigs, migrationsB1, migrationsB2)
    const Runner = new Migrations(Database, Config)
    let runner, result, rollback

    runner = new Runner()
    result = yield runner.up(migrationsB1)
    expect(result.status).to.equal('completed')
    expect(result.migrated).deep.equal(_.keys(migrationsB1))

    runner = new Runner()
    result = yield runner.up(migrationsB2)
    expect(result.status).to.equal('completed')
    expect(result.migrated).deep.equal(_.keys(migrationsB2))

    runner = new Runner()
    rollback = yield runner.down(allMigs, 0)
    expect(rollback.status).to.equal('completed')
    expect(rollback.migrated).deep.equal(_.reverse(_.keys(allMigs)))

    const usersInfo = yield runner.database.collection('users').columnInfo()
    expect(_.keys(usersInfo)).deep.equal(['_id'])

    const accountsInfo = yield runner.database.connection('alternateConnection').collection('accounts').columnInfo()
    expect(_.keys(accountsInfo)).deep.equal(['_id'])
    yield runner.database.schema.dropCollection('adonis_migrations')
    yield runner.database.schema.dropCollection('users')
    yield runner.database.connection('alternateConnection').schema.dropCollection('accounts')
  })

  it('should have access to knex fn inside the schema class', function * () {
    const Runner = new Migrations(Database, Config)
    const runner = new Runner()
    let fn = null
    class Users extends Schema {
      up () {
        this.collection('users', (collection) => {
          fn = this.fn
        })
      }
    }
    const migrations = {'2015-01-20': Users}
    yield runner.up(migrations)
    expect(fn).to.be.an('object')
    expect(fn.now).to.be.a('function')
    yield runner.database.schema.dropCollection('adonis_migrations')
  })

  it('should be able to define soft delete field inside migrations', function * () {
    const Runner = new Migrations(Database, Config)
    const runner = new Runner()
    class Users extends Schema {
      up () {
        this.create('users', (collection) => {
          collection.increments()
          collection.softDeletes()
        })
      }
    }
    const migrations = {'2015-01-20': Users}
    yield runner.up(migrations)
    const usersInfo = yield runner.database.collection('users').columnInfo()
    expect(usersInfo.deleted_at).to.be.an('object')
    expect(usersInfo.deleted_at.nullable).to.equal(true)
    expect(usersInfo.deleted_at.type).to.be.oneOf(['datetime', 'timestamp with time zone'])
    yield runner.database.schema.dropCollection('users')
    yield runner.database.schema.dropCollection('adonis_migrations')
  })

  it('should be able to define nullableTimestamps inside migrations', function * () {
    const Runner = new Migrations(Database, Config)
    const runner = new Runner()
    class Users extends Schema {
      up () {
        this.create('users', (collection) => {
          collection.increments()
          collection.nullableTimestamps()
        })
      }
    }
    const migrations = {'2015-01-20': Users}
    yield runner.up(migrations)
    const usersInfo = yield runner.database.collection('users').columnInfo()
    expect(usersInfo.created_at).to.be.an('object')
    expect(usersInfo.created_at.nullable).to.equal(true)
    expect(usersInfo.created_at.type).to.be.oneOf(['datetime', 'timestamp with time zone'])
    expect(usersInfo.updated_at).to.be.an('object')
    expect(usersInfo.updated_at.nullable).to.equal(true)
    expect(usersInfo.updated_at.type).to.be.oneOf(['datetime', 'timestamp with time zone'])
    yield runner.database.schema.dropCollection('users')
    yield runner.database.schema.dropCollection('adonis_migrations')
  })

  it('should be able to run multiple commands inside a single up method', function * () {
    const Runner = new Migrations(Database, Config)
    const runner = new Runner()
    class Users extends Schema {
      up () {
        this.create('users', (collection) => {
          collection.increments()
        })

        this.create('accounts', (collection) => {
          collection.increments()
        })
      }
    }
    const migrations = {'2015-01-20': Users}
    yield runner.up(migrations)
    const usersInfo = yield runner.database.collection('users').columnInfo()
    const accountsInfo = yield runner.database.collection('accounts').columnInfo()
    expect(usersInfo.id).to.be.an('object')
    expect(accountsInfo.id).to.be.an('object')
    yield runner.database.schema.dropCollection('users')
    yield runner.database.schema.dropCollection('accounts')
    yield runner.database.schema.dropCollection('adonis_migrations')
  })

  it('should be able to run multiple commands inside a single down method', function * () {
    const Runner = new Migrations(Database, Config)
    const runner = new Runner()
    class Users extends Schema {
      up () {
        this.create('users', (collection) => {
          collection.increments()
        })

        this.create('accounts', (collection) => {
          collection.increments()
        })
      }

      down () {
        this.drop('users')
        this.drop('accounts')
      }
    }
    const migrations = {'2015-01-20': Users}
    yield runner.up(migrations)
    const usersInfo = yield runner.database.collection('users').columnInfo()
    const accountsInfo = yield runner.database.collection('accounts').columnInfo()
    expect(usersInfo.id).to.be.an('object')
    expect(accountsInfo.id).to.be.an('object')
    const runner1 = new Runner()
    yield runner1.down(migrations)
    const usersCollection = yield runner1.database.collection('users').columnInfo()
    const accountsCollection = yield runner1.database.collection('accounts').columnInfo()
    expect(usersCollection).deep.equal({})
    expect(accountsCollection).deep.equal({})
    yield runner.database.schema.dropCollection('adonis_migrations')
  })

  it('should have access to knex schema inside the schema class', function * () {
    const Runner = new Migrations(Database, Config)
    const runner = new Runner()
    let schema = null
    class Users extends Schema {
      up () {
        this.collection('users', (collection) => {
          schema = this.schema
        })
      }
    }
    const migrations = {'2015-01-20': Users}
    yield runner.up(migrations)
    expect(schema).to.be.an('object')
    expect(schema.raw).to.be.a('function')
    yield runner.database.schema.dropCollection('adonis_migrations')
  })

  it('should insert migration/batch on every migration completion', function * () {
    const Runner = new Migrations(Database, Config)
    const runner = new Runner()
    class Users extends Schema {
      up () {
        this.create('users', (collection) => {
          collection.increments()
        })
      }
    }

    class Accounts extends Schema {
      up () {
        this.create('accounts', (collection) => {
          collection.increments()
        })
      }
    }

    const migrations = {'2015-01-20': Users, '2016-07-28': Accounts}
    const sqlCommands = []
    Database.on('query', (output) => {
      if (output.sql.match(/create collection [`"]users[`"]|create collection [`"]accounts[`"]|insert into [`"]adonis_migrations[`"]/)) {
        sqlCommands.push(output.sql)
      }
    })
    yield runner.up(migrations)
    expect(sqlCommands.length).to.equal(4)
    expect(sqlCommands[0]).to.match(/create collection [`"]users[`"]/)
    expect(sqlCommands[1]).to.match(/insert into [`"]adonis_migrations[`"]/)
    expect(sqlCommands[2]).to.match(/create collection [`"]accounts[`"]/)
    expect(sqlCommands[3]).to.match(/insert into [`"]adonis_migrations[`"]/)
    yield runner.database.schema.dropCollection('users')
    yield runner.database.schema.dropCollection('accounts')
    yield runner.database.schema.dropCollection('adonis_migrations')
  })

  it('should update progress for each file', function * () {
    const Runner = new Migrations(Database, Config)
    const runner = new Runner()
    class Users extends Schema {
      up () {
        this.create('users', (collection) => {
          collection.increments()
        })
      }
    }

    class Accounts extends Schema {
      up () {
        this.drop('accounts')
      }
    }

    const migrations = {'2015-01-20': Users, '2016-07-28': Accounts}
    try {
      yield runner.up(migrations)
      expect(true).to.equal(false)
    } catch (e) {
      const migrations = yield runner.database.collection('adonis_migrations')
      expect(migrations).to.be.an('array')
      expect(migrations.length).to.equal(1)
      expect(migrations[0].name).to.equal('2015-01-20')
      yield runner.database.schema.dropCollection('users')
      yield runner.database.schema.dropCollection('adonis_migrations')
    }
  })

  it('should return the sql output for run', function * () {
    const Runner = new Migrations(Database, Config)
    const runner = new Runner()
    class Users extends Schema {
      up () {
        this.create('users', (collection) => {
          collection.increments()
        })
      }
    }

    const migrations = {'2015-01-20': Users}
    const response = yield runner.up(migrations, true)

    expect(response).to.be.an('array')
    expect(response).to.have.length(1)
    expect(response[0].file).to.equal('2015-01-20')
    expect(response[0].queries).to.be.an('array')
    const migrationsCompleted = yield runner.database.collection('adonis_migrations')
    expect(migrationsCompleted).to.be.an('array')
    expect(migrationsCompleted).to.have.length(0)
    yield runner.database.schema.dropCollection('adonis_migrations')
  })

  it('should return the sql output for rollback', function * () {
    const Runner = new Migrations(Database, Config)
    const runner = new Runner()
    class Users extends Schema {
      up () {
        this.create('users', (collection) => {
          collection.increments()
        })
      }

      down () {
        this.drop('users')
      }
    }

    const migrations = {'2015-01-20': Users}
    yield runner.up(migrations)
    const response = yield runner.down(migrations, 0, true)
    expect(response).to.be.an('array')
    expect(response).to.have.length(1)
    expect(response[0].file).to.equal('2015-01-20')
    expect(response[0].queries).to.be.an('array')
    yield runner.database.schema.dropCollection('users')
    yield runner.database.schema.dropCollection('adonis_migrations')
  })

  it('should be able to access the database provider using this.db', function * () {
    const Runner = new Migrations(Database, Config)
    const runner = new Runner()
    let db = null
    class Users extends Schema {
      up () {
        this.db(function * (database) {
          db = database
        })
      }
    }
    const migrations = {'2016-04-20': Users}
    yield runner.up(migrations)
    expect(db.collection).to.be.a('function')
    yield runner.database.schema.dropCollection('adonis_migrations')
  })

  it('should be able to migrate a collection data to a different column @fun', function * () {
    const Runner = new Migrations(Database, Config)
    const runner = new Runner()
    class Users extends Schema {
      up () {
        this.create('users', (collection) => {
          collection.increments()
          collection.string('username')
        })

        this.db(function * (database) {
          yield database.collection('users').insert([{username: 'foo'}, {username: 'bar'}])
        })
      }
    }

    class UsersMigrate extends Schema {
      up () {
        this.collection('users', (collection) => {
          collection.string('uname')
        })

        this.db(function * (database) {
          const usernames = yield database.collection('users').pluck('username')
          yield cf.forEach(function * (username) {
            yield database.collection('users').where('username', username).update('uname', username)
          }, usernames)
        })

        this.collection('users', (collection) => {
          collection.dropColumn('username')
        })
      }
    }

    const migrations = {'2016-04-20': Users, '2016-10-30': UsersMigrate}
    yield runner.up(migrations)
    const users = yield Database.collection('users').pluck('uname')
    expect(users).deep.equal(['foo', 'bar'])
    yield runner.database.schema.dropCollection('users')
    yield runner.database.schema.dropCollection('adonis_migrations')
  })

  it('should be able to rename the database collection', function * () {
    const Runner = new Migrations(Database, Config)
    const runner = new Runner()
    class Users extends Schema {
      up () {
        this.create('users', (collection) => {
          collection.increments()
        })
      }
    }
    class MyUsers extends Schema {
      up () {
        this.rename('users', 'my_users')
      }
    }
    const migrations = {'2016-04-20': Users, '2016-10-19': MyUsers}
    yield runner.up(migrations)
    const myUsersInfo = yield runner.database.collection('my_users').columnInfo()
    expect(myUsersInfo.id).be.an('object')
    yield runner.database.schema.dropCollection('adonis_migrations')
    yield runner.database.schema.dropCollection('my_users')
  })
})
