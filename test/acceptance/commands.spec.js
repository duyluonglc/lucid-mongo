'use strict'

/**
 * adonis-LucidMongo
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

/*
|--------------------------------------------------------------------------
| COMMANDS
|--------------------------------------------------------------------------
|
| Ace commands tests are written in this file.
|
*/

/* global describe, it, after, before */
const chai = require('chai')
const expect = chai.expect
const fold = require('adonis-fold')
const Ioc = fold.Ioc
const stdout = require('test-console').stdout
const setup = require('./setup')
require('co-mocha')

describe('Commands', function () {
  before(function * () {
    yield setup.loadProviders()
    setup.registerCommands()
    const LucidMongo = Ioc.use('Adonis/Src/LucidMongo')
    class User extends LucidMongo {}
    Ioc.bind('App/Model/User', function () {
      return User
    })

    this.database = Ioc.use('Adonis/Src/Database')
  })

  after(function * () {
    yield this.database.schema.dropCollectionIfExists('users')
    yield this.database.schema.dropCollectionIfExists('adonis_migrations')
  })

  it('should create the users collection using migrations', function * () {
    yield setup.runCommand('migration:run', [], {})
    const usersCollection = yield this.database.collection('users').columnInfo()
    expect(usersCollection).to.be.an('object')
    expect(Object.keys(usersCollection)).deep.equal(['id', 'username', 'email', 'firstname', 'lastname', 'password', 'created_at', 'updated_at'])
  })

  it('should seed database by creating five users', function * () {
    yield setup.runCommand('db:seed', {}, {})
    const users = yield this.database.collection('users')
    expect(users.length).to.equal(5)
  })

  it('should rollback by dropping users collection', function * () {
    yield setup.runCommand('migration:rollback', {}, {})
    const usersInfo = yield this.database.collection('users').columnInfo()
    expect(usersInfo).deep.equal({})
  })

  it('should show migrations status', function * () {
    yield setup.runCommand('migration:status', {}, {})
  })

  it('should output run command sql queries', function * () {
    const inspect = stdout.inspect()
    yield setup.runCommand('migration:run', {}, {log: true})
    inspect.restore()
    expect(inspect.output[1]).to.match(/^>SQL:\screate collection ["`]?users[`"]?/)
  })

  it('should output rollback command sql queries', function * () {
    yield setup.runCommand('migration:rollback', {}, {log: true})
  })

  it('should output reset command sql queries', function * () {
    yield setup.runCommand('migration:reset', {}, {log: true})
  })
})
