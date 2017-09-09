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
const VanillaSerializer = require('../../src/LucidMongo/Serializers/Vanilla')

test.group('Relations | Belongs To', (group) => {
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
    await ioc.use('Adonis/Src/Database').collection('profiles').delete()
    await ioc.use('Adonis/Src/Database').collection('pictures').delete()
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

  test('fetch related row via first method', async (assert) => {
    class User extends Model {
    }

    class Profile extends Model {
      user () {
        return this.belongsTo(User)
      }
    }

    User._bootIfNotBooted()
    Profile._bootIfNotBooted()

    const rs = await ioc.use('Database').collection('users').insert({ username: 'virk' })
    const rsProfile = await ioc.use('Database').collection('profiles').insert({ user_id: rs.insertedIds[0], profile_name: 'virk' })

    const profile = await Profile.find(rsProfile.insertedIds[0])
    await profile.user().first()
  })

  test('fetch related row via fetch method', async (assert) => {
    class User extends Model {
    }

    class Profile extends Model {
      user () {
        return this.belongsTo(User)
      }
    }

    User._bootIfNotBooted()
    Profile._bootIfNotBooted()

    const rs = await ioc.use('Database').collection('users').insert({ username: 'virk' })
    const rsProfile = await ioc.use('Database').collection('profiles').insert({ user_id: rs.insertedIds[0], profile_name: 'virk' })

    const profile = await Profile.find(rsProfile.insertedIds[0])
    await profile.user().fetch()
  })

  test('fetch relation with different ids', async (assert) => {
    class User extends Model {
    }

    class Profile extends Model {
      user () {
        return this.belongsTo(User)
      }
    }

    User._bootIfNotBooted()
    Profile._bootIfNotBooted()

    const rs = await ioc.use('Database').collection('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    const rsProfile = await ioc.use('Database').collection('profiles').insert({ user_id: rs.insertedIds[1], profile_name: 'nikk' })

    const profile = await Profile.find(rsProfile.insertedIds[0])
    await profile.user().fetch()
  })

  test('eagerload related instance', async (assert) => {
    class User extends Model {
    }

    class Profile extends Model {
      user () {
        return this.belongsTo(User)
      }
    }

    User._bootIfNotBooted()
    Profile._bootIfNotBooted()

    const rs = await ioc.use('Database').collection('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await ioc.use('Database').collection('profiles').insert({ user_id: rs.insertedIds[1], profile_name: 'nikk' })

    const profiles = await Profile.query().with('user').fetch()
    assert.instanceOf(profiles, VanillaSerializer)
    assert.equal(profiles.size(), 1)
    assert.instanceOf(profiles.first().getRelated('user'), User)
    assert.equal(profiles.first().getRelated('user').username, 'nikk')
  })

  test('eagerload and paginate', async (assert) => {
    class User extends Model {
    }

    class Profile extends Model {
      user () {
        return this.belongsTo(User)
      }
    }

    User._bootIfNotBooted()
    Profile._bootIfNotBooted()

    const rs = await ioc.use('Database').collection('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await ioc.use('Database').collection('profiles').insert([
      { user_id: rs.insertedIds[0], profile_name: 'nikk' },
      { user_id: rs.insertedIds[1], profile_name: 'virk' }
    ])

    const profiles = await Profile.query().with('user').paginate()
    assert.instanceOf(profiles, VanillaSerializer)
    assert.equal(profiles.size(), 2)
    assert.instanceOf(profiles.first().getRelated('user'), User)
    // assert.equal(profiles.first().getRelated('user').username, 'nikk')
    // assert.instanceOf(profiles.last().getRelated('user'), User)
    // assert.equal(profiles.last().getRelated('user').username, 'virk')
  })

  test('work fine with nested relations', async (assert) => {
    class User extends Model {
    }

    class Profile extends Model {
      user () {
        return this.belongsTo(User)
      }
    }

    class Picture extends Model {
      profile () {
        return this.belongsTo(Profile)
      }
    }

    User._bootIfNotBooted()
    Profile._bootIfNotBooted()
    Picture._bootIfNotBooted()

    const rsUser = await ioc.use('Database').collection('users').insert({ username: 'virk' })
    const rsProfile = await ioc.use('Database').collection('profiles').insert({ user_id: rsUser.insertedIds[0], profile_name: 'virk' })
    await ioc.use('Database').collection('pictures').insert({ profile_id: rsProfile.insertedIds[0], storage_path: '/foo' })

    const pictures = await Picture.query().with('profile.user').fetch()
    assert.instanceOf(pictures.first().getRelated('profile'), Profile)
    assert.instanceOf(pictures.first().getRelated('profile').getRelated('user'), User)
    assert.equal(pictures.first().getRelated('profile').profile_name, 'virk')
    assert.equal(pictures.first().getRelated('profile').getRelated('user').username, 'virk')
  })

  test('make right json structure when calling toJSON', async (assert) => {
    class User extends Model {
    }

    class Profile extends Model {
      user () {
        return this.belongsTo(User)
      }
    }

    class Picture extends Model {
      profile () {
        return this.belongsTo(Profile)
      }
    }

    User._bootIfNotBooted()
    Profile._bootIfNotBooted()
    Picture._bootIfNotBooted()

    const rsUser = await ioc.use('Database').collection('users').insert({ username: 'virk' })
    const rsProfile = await ioc.use('Database').collection('profiles').insert({ user_id: rsUser.insertedIds[0], profile_name: 'virk' })
    await ioc.use('Database').collection('pictures').insert({ profile_id: rsProfile.insertedIds[0], storage_path: '/foo' })

    const picture = await Picture.query().with('profile.user').first()
    const json = picture.toJSON()
    assert.equal(json.profile_id, json.profile._id)
    assert.equal(json.profile.user_id, json.profile.user._id)
  })

  test('associate related instance', async (assert) => {
    class User extends Model {
    }

    class Profile extends Model {
      user () {
        return this.belongsTo(User)
      }
    }

    User._bootIfNotBooted()
    Profile._bootIfNotBooted()

    const profile = new Profile()
    profile.profile_name = 'virk'
    await profile.save()

    const user = new User()
    user.username = 'virk'
    await user.save()

    await profile.user().associate(user)
    assert.equal(String(profile.user_id), String(user._id))
    assert.isFalse(profile.isNew)

    const freshProfile = await ioc.use('Database').collection('profiles').findOne()
    assert.equal(String(freshProfile._id), String(profile._id))
    assert.equal(String(freshProfile.user_id), String(user._id))
  })

  test('persist parent record if not already persisted', async (assert) => {
    class User extends Model {
    }

    class Profile extends Model {
      user () {
        return this.belongsTo(User)
      }
    }

    User._bootIfNotBooted()
    Profile._bootIfNotBooted()

    const profile = new Profile()
    profile.profile_name = 'virk'

    const user = new User()
    user.username = 'virk'
    await user.save()

    await profile.user().associate(user)
    assert.equal(String(profile.user_id), String(user._id))
    assert.isFalse(profile.isNew)

    const freshProfile = await ioc.use('Database').collection('profiles').findOne()
    assert.equal(String(freshProfile._id), String(profile._id))
    assert.equal(String(freshProfile.user_id), String(user._id))
  })

  test('persist related instance if not already persisted', async (assert) => {
    class User extends Model {
    }

    class Profile extends Model {
      user () {
        return this.belongsTo(User)
      }
    }

    User._bootIfNotBooted()
    Profile._bootIfNotBooted()

    const profile = new Profile()
    profile.profile_name = 'virk'

    const user = new User()
    user.username = 'virk'

    await profile.user().associate(user)
    assert.equal(String(profile.user_id), String(user._id))
    assert.isFalse(profile.isNew)
    assert.isFalse(user.isNew)

    const freshProfile = await ioc.use('Database').collection('profiles').findOne()
    assert.equal(String(freshProfile._id), String(profile._id))
    assert.equal(String(freshProfile.user_id), String(user._id))

    const freshUser = await ioc.use('Database').collection('users').findOne()
    assert.equal(String(freshUser._id), String(user._id))
  })

  test('dissociate existing relationship', async (assert) => {
    class User extends Model {
    }

    class Profile extends Model {
      user () {
        return this.belongsTo(User)
      }
    }

    User._bootIfNotBooted()
    Profile._bootIfNotBooted()

    const rs = await ioc.use('Database').collection('users').insert({ username: 'virk' })
    const rsProfile = await ioc.use('Database').collection('profiles').insert({ profile_name: 'virk', user_id: rs.insertedIds[0] })

    const profile = await Profile.find(rsProfile.insertedIds[0])
    assert.equal(String(profile.user_id), String(rs.insertedIds[0]))

    await profile.user().dissociate()
    assert.equal(profile.user_id, null)
    assert.isFalse(profile.isNew)

    const freshProfile = await ioc.use('Database').collection('profiles').findOne()
    assert.equal(String(freshProfile._id), String(rsProfile.insertedIds[0]))
    assert.equal(freshProfile.user_id, null)
  })

  test('throw exception when trying to dissociate fresh models', async (assert) => {
    assert.plan(1)
    class User extends Model {
    }

    class Profile extends Model {
      user () {
        return this.belongsTo(User)
      }
    }

    User._bootIfNotBooted()
    Profile._bootIfNotBooted()

    const profile = new Profile()
    try {
      await profile.user().dissociate()
    } catch ({ message }) {
      assert.equal(message, 'E_UNSAVED_MODEL_INSTANCE: Cannot dissociate relationship since model instance is not persisted')
    }
  })

  test('delete related rows', async (assert) => {
    assert.plan(1)
    class User extends Model {
    }

    class Profile extends Model {
      user () {
        return this.belongsTo(User)
      }
    }

    User._bootIfNotBooted()
    Profile._bootIfNotBooted()

    const rs = await ioc.use('Database').collection('users').insert({ username: 'virk' })
    const rsProfile = await ioc.use('Database').collection('profiles').insert({ profile_name: 'virk', user_id: rs.insertedIds[0] })

    const profile = await Profile.find(rsProfile.insertedIds[0])
    await profile.user().delete()
    const user = await ioc.use('Database').collection('users').findOne()
    assert.isNull(user)
  })

  test('belongsTo relation work fine with IoC container binding', async (assert) => {
    class User extends Model {
    }

    ioc.fake('App/Models/User', () => {
      return User
    })

    class Profile extends Model {
      user () {
        return this.belongsTo('App/Models/User')
      }
    }

    User._bootIfNotBooted()
    Profile._bootIfNotBooted()

    const result = await ioc.use('Database').collection('users').insert({ username: 'virk' })
    await ioc.use('Database').collection('profiles').insert({ user_id: result.insertedIds[0], profile_name: 'virk' })

    const profile = await Profile.first()
    const users = await profile.user().fetch()
    assert.isNotNull(users)
  })

  test('load relation without null value in foreign key', async (assert) => {
    class User extends Model {
    }

    class Car extends Model {
      user () {
        return this.belongsTo(User)
      }
    }

    User._bootIfNotBooted()
    Car._bootIfNotBooted()

    const result = await ioc.use('Database').collection('users').insert({ username: 'virk' })
    await ioc.use('Database').collection('cars').insert({ name: 'E180', model: 'Mercedes', user_id: null })
    await ioc.use('Database').collection('cars').insert({ name: 'GL350', model: 'Mercedes', user_id: result.insertedIds[0] })

    const cars = await Car.query().with('user').fetch()
    assert.lengthOf(cars.toJSON(), 2)
    assert.isNull(cars.toJSON()[0].user)
    assert.isNotNull(cars.toJSON()[1].user)
  })

  test('do not load relation with null value in foreign key', async (assert) => {
    class User extends Model {
    }

    class Car extends Model {
      user () {
        return this.belongsTo(User)
      }
    }

    User._bootIfNotBooted()
    Car._bootIfNotBooted()

    await ioc.use('Database').collection('users').insert({ username: 'virk' })
    await ioc.use('Database').collection('cars').insert({ name: 'E180', model: 'Mercedes', user_id: null })

    const car = await Car.query().select(['_id', 'name', 'user_id']).first()
    await car.load('user')
    const json = car.toJSON()

    assert.isNull(json.user)
  })

  test('do not eager load relation with null value in foreign key', async (assert) => {
    class User extends Model {
    }

    class Car extends Model {
      user () {
        return this.belongsTo(User)
      }
    }

    User._bootIfNotBooted()
    Car._bootIfNotBooted()

    await ioc.use('Database').collection('users').insert({ username: 'virk' })
    await ioc.use('Database').collection('cars').insert({ name: 'E180', model: 'Mercedes', user_id: null })

    const car = await Car
      .query()
      .select(['_id', 'name', 'user_id'])
      .with('user')
      .first()

    const json = car.toJSON()

    assert.isNull(json.user)
  })

  test('throw exception when not eagerloading', async (assert) => {
    class User extends Model {
    }

    class Car extends Model {
      user () {
        return this.belongsTo(User)
      }
    }

    User._bootIfNotBooted()
    Car._bootIfNotBooted()

    await ioc.use('Database').collection('users').insert({ username: 'virk' })
    const result = await ioc.use('Database').collection('cars').insert({ name: 'E180', model: 'Mercedes', user_id: null })

    await Car.query().where('_id', result.insertedIds[0]).first()
  })
})
