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
const { ioc } = require('@adonisjs/fold')
const { Config } = require('@adonisjs/sink')

const helpers = require('./helpers')
const Model = require('../../src/LucidMongo/Model')
const DatabaseManager = require('../../src/Database/Manager')

test.group('Relations | Embeds one', (group) => {
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
    await helpers.createCollections(ioc.use('Adonis/Src/Database'))
  })

  group.afterEach(async () => {
    await ioc.use('Adonis/Src/Database').collection('users').delete()
  })

  group.after(async () => {
    await helpers.dropCollections(ioc.use('Adonis/Src/Database'))
    ioc.use('Database').close()
    try {
      await fs.remove(path.join(__dirname, './tmp'))
    } catch (error) {
      if (process.platform !== 'win32' || error.code !== 'EBUSY') {
        throw error
      }
    }
  }).timeout(0)

  test('fetch alias of first', async (assert) => {
    class User extends Model {
      email () {
        return this.embedsOne(Email)
      }
    }

    class Email extends Model {

    }

    User._bootIfNotBooted()
    Email._bootIfNotBooted()

    await ioc.use('Database').collection('users').insert({ username: 'virk', email: { address: 'example@gmail.com' } })
    const user = await User.first()
    assert.instanceOf(user, User)
    const email = user.email().fetch()
    assert.instanceOf(email, Email)
    assert.equal(email.address, 'example@gmail.com')
  })

  test('get first related instance', async (assert) => {
    class User extends Model {
      email () {
        return this.embedsOne(Email)
      }
    }

    class Email extends Model {

    }

    User._bootIfNotBooted()
    Email._bootIfNotBooted()

    await ioc.use('Database').collection('users').insert({ username: 'virk', email: { address: 'example@gmail.com' } })
    const user = await User.first()
    assert.instanceOf(user, User)
    const email = user.email().first()
    assert.instanceOf(email, Email)
    assert.equal(email.address, 'example@gmail.com')
  })

  test('through exception when call paginate', async (assert) => {
    class User extends Model {
      email () {
        return this.embedsOne(Email)
      }
    }

    class Email extends Model {

    }

    await ioc.use('Database').collection('users').insert({ username: 'virk', email: { _id: 1, address: 'example@gmail.com' } })
    const user = await User.first()
    assert.instanceOf(user, User)
    const fn = () => user.email().paginate(1, 1)
    assert.throw(fn, 'E_INVALID_RELATION_METHOD: paginate is not supported by EmbedsOne relation')
  })

  test('eager load with fetch', async (assert) => {
    class User extends Model {
      email () {
        return this.embedsOne(Email)
      }
    }

    class Email extends Model {

    }

    User._bootIfNotBooted()
    Email._bootIfNotBooted()

    await ioc.use('Database').collection('users').insert({ username: 'virk', email: { address: 'example@gmail.com' } })
    const users = await User.with('email').fetch()
    const email = users.first().getRelated('email')
    assert.instanceOf(email, Email)
    assert.equal(email.address, 'example@gmail.com')
  })

  test('eager load with first', async (assert) => {
    class User extends Model {
      email () {
        return this.embedsOne(Email)
      }
    }

    class Email extends Model {

    }

    User._bootIfNotBooted()
    Email._bootIfNotBooted()

    await ioc.use('Database').collection('users').insert({ username: 'virk', email: { address: 'example@gmail.com' } })
    const user = await User.with('email').first()
    const email = user.getRelated('email')
    assert.instanceOf(email, Email)
    assert.equal(email.address, 'example@gmail.com')
  })

  test('eager load with paginate', async (assert) => {
    class User extends Model {
      email () {
        return this.embedsOne(Email)
      }
    }

    class Email extends Model {

    }

    User._bootIfNotBooted()
    Email._bootIfNotBooted()

    await ioc.use('Database').collection('users').insert({ username: 'virk', email: { address: 'example@gmail.com' } })
    const users = await User.with('email').paginate()
    const email = users.first().getRelated('email')
    assert.instanceOf(email, Email)
    assert.equal(email.address, 'example@gmail.com')
  })

  test('save relation', async (assert) => {
    class User extends Model {
      email () {
        return this.embedsOne(Email)
      }
    }

    class Email extends Model {

    }

    User._bootIfNotBooted()
    Email._bootIfNotBooted()

    await ioc.use('Database').collection('users').insert({ username: 'virk' })
    const user = await User.first()
    const email = new Email({ address: 'example@gmail.com' })
    await user.email().save(email)
    assert.isNotNull(email._id)
    await user.reload()
    assert.isNotNull(user.$attributes.email)
  })

  test('call hooks when save relation', async (assert) => {
    assert.plan(2)
    class User extends Model {
      email () {
        return this.embedsOne(Email)
      }
    }

    class Email extends Model {

    }

    User._bootIfNotBooted()
    Email._bootIfNotBooted()

    const fn = async function (instance) {
      assert.instanceOf(instance, Email)
    }

    Email.addHook('beforeUpdate', fn)
    Email.addHook('afterUpdate', fn)

    await ioc.use('Database').collection('users').insert({ username: 'virk' })
    const user = await User.first()
    const email = await user.email().create({ address: 'example@gmail.com' })
    email.address = 'example2@gmail.com'
    await user.email().save(email)
  })

  test('create new relation', async (assert) => {
    class User extends Model {
      email () {
        return this.embedsOne(Email)
      }
    }

    class Email extends Model {

    }

    User._bootIfNotBooted()
    Email._bootIfNotBooted()

    await ioc.use('Database').collection('users').insert({ username: 'virk' })
    const user = await User.first()
    const email = await user.email().create({ address: 'example@gmail.com' })
    assert.isNotNull(email._id)
    assert.equal(email.address, 'example@gmail.com')
    await user.reload()
    assert.isNotNull(user.$attributes.email)
  })

  test('call hooks when create new relation', async (assert) => {
    assert.plan(2)
    class User extends Model {
      email () {
        return this.embedsOne(Email)
      }
    }

    class Email extends Model {

    }

    User._bootIfNotBooted()
    Email._bootIfNotBooted()

    const fn = async function (instance) {
      assert.instanceOf(instance, Email)
    }

    Email.addHook('beforeCreate', fn)
    Email.addHook('afterCreate', fn)

    await ioc.use('Database').collection('users').insert({ username: 'virk' })
    const user = await User.first()
    await user.email().create({ address: 'example@gmail.com' })
  })

  test('delete a relation', async (assert) => {
    class User extends Model {
      email () {
        return this.embedsOne(Email)
      }
    }

    class Email extends Model {

    }

    User._bootIfNotBooted()
    Email._bootIfNotBooted()

    await ioc.use('Database').collection('users').insert({ username: 'virk' })
    const user = await User.first()
    const email = await user.email().create({ address: 'example@gmail.com' })
    await user.email().delete(email._id)
    assert.isUndefined(user.$attributes.email)
  })
})
