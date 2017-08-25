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
const fs = require('fs-extra')
const path = require('path')
const { ioc } = require('@adonisjs/fold')
const { Config } = require('@adonisjs/sink')

const helpers = require('./helpers')
const Model = require('../../src/LucidMongo/Model')
const DatabaseManager = require('../../src/Database/Manager')
const VanillaSerializer = require('../../src/LucidMongo/Serializers/Vanilla')

test.group('Relations | Has Many', (group) => {
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
    await ioc.use('Adonis/Src/Database').collection('cars').delete()
    await ioc.use('Adonis/Src/Database').collection('parts').delete()
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

  test('get instance of has many when calling to relation method', async (assert) => {
    class Car extends Model {
    }

    class User extends Model {
      cars () {
        return this.hasMany(Car)
      }
    }

    Car._bootIfNotBooted()
    User._bootIfNotBooted()

    const rs = await ioc.use('Database').collection('users').insert({ username: 'virk' })
    await ioc.use('Database').collection('cars').insert([
      { user_id: rs.insertedIds[0], name: 'merc', model: '1990' },
      { user_id: rs.insertedIds[0], name: 'audi', model: '2001' }
    ])

    const user = await User.find(rs.insertedIds[0])
    const cars = await user.cars().fetch()
    assert.instanceOf(cars, VanillaSerializer)
    assert.equal(cars.size(), 2)
  })

  test('get first instance of related model', async (assert) => {
    class Car extends Model {
    }

    class User extends Model {
      cars () {
        return this.hasMany(Car)
      }
    }

    Car._bootIfNotBooted()
    User._bootIfNotBooted()

    const rs = await ioc.use('Database').collection('users').insert({ username: 'virk' })
    await ioc.use('Database').collection('cars').insert([
      { user_id: rs.insertedIds[0], name: 'merc', model: '1990' },
      { user_id: rs.insertedIds[0], name: 'audi', model: '2001' }
    ])

    const user = await User.find(rs.insertedIds[0])
    const car = await user.cars().first()
    assert.instanceOf(car, Car)
    assert.equal(car.name, 'merc')
  })

  test('eagerload relation', async (assert) => {
    class Car extends Model {
    }

    class User extends Model {
      cars () {
        return this.hasMany(Car)
      }
    }

    Car._bootIfNotBooted()
    User._bootIfNotBooted()

    const rs = await ioc.use('Database').collection('users').insert({ username: 'virk' })
    await ioc.use('Database').collection('cars').insert([
      { user_id: rs.insertedIds[0], name: 'merc', model: '1990' },
      { user_id: rs.insertedIds[0], name: 'audi', model: '2001' }
    ])

    const user = await User.query().with('cars').first()
    assert.instanceOf(user.getRelated('cars'), VanillaSerializer)
    assert.equal(user.getRelated('cars').size(), 2)
    assert.deepEqual(user.getRelated('cars').rows.map((car) => car.$parent), ['User', 'User'])
  })

  test('add constraints when eagerloading', async (assert) => {
    class Car extends Model {
    }

    class User extends Model {
      cars () {
        return this.hasMany(Car)
      }
    }

    Car._bootIfNotBooted()
    User._bootIfNotBooted()

    const rs = await ioc.use('Database').collection('users').insert({ username: 'virk' })
    await ioc.use('Database').collection('cars').insert([
      { user_id: rs.insertedIds[0], name: 'merc', model: '1990' },
      { user_id: rs.insertedIds[0], name: 'audi', model: '2001' }
    ])

    const users = await User.query().with('cars', (builder) => {
      builder.where('model', '>', '2000')
    }).fetch()
    const user = users.first()
    assert.equal(user.getRelated('cars').size(), 1)
    assert.equal(user.getRelated('cars').rows[0].name, 'audi')
  })

  test('return serailizer instance when nothing exists', async (assert) => {
    class Car extends Model {
    }

    class User extends Model {
      cars () {
        return this.hasMany(Car)
      }
    }

    Car._bootIfNotBooted()
    User._bootIfNotBooted()

    await ioc.use('Database').collection('users').insert({ username: 'virk' })
    const users = await User.query().with('cars').fetch()
    const user = users.first()
    assert.equal(user.getRelated('cars').size(), 0)
  })

  test('calling toJSON should build right json structure', async (assert) => {
    class Car extends Model {
    }

    class User extends Model {
      cars () {
        return this.hasMany(Car)
      }
    }

    Car._bootIfNotBooted()
    User._bootIfNotBooted()

    const rs = await ioc.use('Database').collection('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await ioc.use('Database').collection('cars').insert([
      { user_id: rs.insertedIds[0], name: 'merc', model: '1990' },
      { user_id: rs.insertedIds[1], name: 'audi', model: '2001' }
    ])

    const users = await User.query().with('cars').fetch()
    const json = users.toJSON()
    assert.equal(json[0].cars[0].name, 'merc')
    assert.equal(json[1].cars[0].name, 'audi')
  })

  test('calling toJSON should build right json structure', async (assert) => {
    class Car extends Model {
    }

    class User extends Model {
      cars () {
        return this.hasMany(Car)
      }
    }

    Car._bootIfNotBooted()
    User._bootIfNotBooted()

    const rs = await ioc.use('Database').collection('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await ioc.use('Database').collection('cars').insert([
      { user_id: rs.insertedIds[0], name: 'merc', model: '1990' },
      { user_id: rs.insertedIds[1], name: 'audi', model: '2001' }
    ])

    const users = await User.query().with('cars').fetch()
    const json = users.toJSON()
    assert.equal(json[0].cars[0].name, 'merc')
    assert.equal(json[1].cars[0].name, 'audi')
  })

  test('calling toJSON should build right json structure', async (assert) => {
    class Car extends Model {
    }

    class User extends Model {
      cars () {
        return this.hasMany(Car)
      }
    }

    Car._bootIfNotBooted()
    User._bootIfNotBooted()

    const rs = await ioc.use('Database').collection('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await ioc.use('Database').collection('cars').insert([
      { user_id: rs.insertedIds[0], name: 'merc', model: '1990' },
      { user_id: rs.insertedIds[1], name: 'audi', model: '2001' }
    ])

    const users = await User.query().with('cars').fetch()
    const json = users.toJSON()
    assert.equal(json[0].cars[0].name, 'merc')
    assert.equal(json[1].cars[0].name, 'audi')
  })

  test('should work with nested relations', async (assert) => {
    class Part extends Model {
    }

    class Car extends Model {
      parts () {
        return this.hasMany(Part)
      }
    }

    class User extends Model {
      cars () {
        return this.hasMany(Car)
      }
    }

    Part._bootIfNotBooted()
    Car._bootIfNotBooted()
    User._bootIfNotBooted()

    const rs = await ioc.use('Database').collection('users').insert({ username: 'virk' })
    const rsCar = await ioc.use('Database').collection('cars').insert([
      { user_id: rs.insertedIds[0], name: 'merc', model: '1990' },
      { user_id: rs.insertedIds[0], name: 'audi', model: '2001' }
    ])
    await ioc.use('Database').collection('parts').insert([
      { car_id: rsCar.insertedIds[0], part_name: 'wheels' },
      { car_id: rsCar.insertedIds[0], part_name: 'engine' },
      { car_id: rsCar.insertedIds[1], part_name: 'wheels' },
      { car_id: rsCar.insertedIds[1], part_name: 'engine' }
    ])

    const user = await User.query().with('cars.parts').first()
    assert.equal(user.getRelated('cars').size(), 2)
    assert.equal(user.getRelated('cars').first().getRelated('parts').size(), 2)
    assert.equal(user.getRelated('cars').last().getRelated('parts').size(), 2)
  })

  test('add query constraint to nested query', async (assert) => {
    class Part extends Model {
    }

    class Car extends Model {
      parts () {
        return this.hasMany(Part)
      }
    }

    class User extends Model {
      cars () {
        return this.hasMany(Car)
      }
    }

    Part._bootIfNotBooted()
    Car._bootIfNotBooted()
    User._bootIfNotBooted()

    const rs = await ioc.use('Database').collection('users').insert({ username: 'virk' })
    const rsCar = await ioc.use('Database').collection('cars').insert([
      { user_id: rs.insertedIds[0], name: 'merc', model: '1990' },
      { user_id: rs.insertedIds[0], name: 'audi', model: '2001' }
    ])
    await ioc.use('Database').collection('parts').insert([
      { car_id: rsCar.insertedIds[0], part_name: 'wheels' },
      { car_id: rsCar.insertedIds[0], part_name: 'engine' },
      { car_id: rsCar.insertedIds[1], part_name: 'wheels' },
      { car_id: rsCar.insertedIds[1], part_name: 'engine' }
    ])

    const user = await User.query().with('cars.parts', (builder) => builder.where('part_name', 'engine')).first()
    assert.equal(user.getRelated('cars').size(), 2)
    assert.equal(user.getRelated('cars').first().getRelated('parts').size(), 1)
    assert.equal(user.getRelated('cars').last().getRelated('parts').size(), 1)
  })

  test('add query constraint to child and grand child query', async (assert) => {
    class Part extends Model {
    }

    class Car extends Model {
      parts () {
        return this.hasMany(Part)
      }
    }

    class User extends Model {
      cars () {
        return this.hasMany(Car)
      }
    }

    Part._bootIfNotBooted()
    Car._bootIfNotBooted()
    User._bootIfNotBooted()

    const rs = await ioc.use('Database').collection('users').insert({ username: 'virk' })
    const rsCar = await ioc.use('Database').collection('cars').insert([
      { user_id: rs.insertedIds[0], name: 'merc', model: '1990' },
      { user_id: rs.insertedIds[0], name: 'audi', model: '2001' }
    ])
    await ioc.use('Database').collection('parts').insert([
      { car_id: rsCar.insertedIds[0], part_name: 'wheels' },
      { car_id: rsCar.insertedIds[0], part_name: 'engine' },
      { car_id: rsCar.insertedIds[1], part_name: 'wheels' },
      { car_id: rsCar.insertedIds[1], part_name: 'engine' }
    ])

    const user = await User.query().with('cars', (builder) => {
      builder.where('name', 'audi').with('parts', (builder) => builder.where('part_name', 'engine'))
    }).first()

    assert.equal(user.getRelated('cars').size(), 1)
    assert.equal(user.getRelated('cars').first().getRelated('parts').size(), 1)
  })

  test('paginate records', async (assert) => {
    class Car extends Model {
    }

    class User extends Model {
      cars () {
        return this.hasMany(Car)
      }
    }

    Car._bootIfNotBooted()
    User._bootIfNotBooted()

    const rs = await ioc.use('Database').collection('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await ioc.use('Database').collection('cars').insert([
      { user_id: rs.insertedIds[0], name: 'mercedes', model: '1990' },
      { user_id: rs.insertedIds[0], name: 'audi', model: '2001' },
      { user_id: rs.insertedIds[1], name: 'audi', model: '2001' }
    ])

    const users = await User.query().with('cars').paginate()
    assert.equal(users.size(), 2)
    assert.deepEqual(users.pages, { total: helpers.formatNumber(2), perPage: 20, page: 1, lastPage: 1 })
  })

  test('convert paginated records to json', async (assert) => {
    class Car extends Model {
    }

    class User extends Model {
      cars () {
        return this.hasMany(Car)
      }
    }

    Car._bootIfNotBooted()
    User._bootIfNotBooted()

    const rs = await ioc.use('Database').collection('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await ioc.use('Database').collection('cars').insert([
      { user_id: rs.insertedIds[0], name: 'mercedes', model: '1990' },
      { user_id: rs.insertedIds[0], name: 'audi', model: '2001' },
      { user_id: rs.insertedIds[1], name: 'audi', model: '2001' }
    ])

    const users = await User.query().with('cars').paginate()
    const json = users.toJSON()
    assert.deepEqual(json.total, helpers.formatNumber(2))
    assert.deepEqual(json.perPage, 20)
    assert.deepEqual(json.page, 1)
    assert.deepEqual(json.lastPage, 1)
    assert.isArray(json.data)
    assert.isArray(json.data[0].cars)
    assert.isArray(json.data[1].cars)
  })

  test('save related model instance', async (assert) => {
    class Car extends Model {
    }

    class User extends Model {
      cars () {
        return this.hasMany(Car)
      }
    }

    Car._bootIfNotBooted()
    User._bootIfNotBooted()

    const user = new User()
    user.username = 'virk'
    await user.save()

    const mercedes = new Car()
    mercedes.name = 'mercedes'
    mercedes.model = '1992'

    await user.cars().save(mercedes)
    assert.equal(mercedes.user_id, user._id)
    assert.isTrue(mercedes.$persisted)
    assert.isFalse(mercedes.isNew)
  })

  test('create related model instance', async (assert) => {
    class Car extends Model {
    }

    class User extends Model {
      cars () {
        return this.hasMany(Car)
      }
    }

    Car._bootIfNotBooted()
    User._bootIfNotBooted()

    const user = new User()
    user.username = 'virk'
    await user.save()

    const mercedes = await user.cars().create({ name: 'mercedes', model: '1992' })
    assert.equal(String(mercedes.user_id), String(user._id))
    assert.isTrue(mercedes.$persisted)
    assert.isFalse(mercedes.isNew)
  })

  test('persist parent model when isNew', async (assert) => {
    class Car extends Model {
    }

    class User extends Model {
      cars () {
        return this.hasMany(Car)
      }
    }

    Car._bootIfNotBooted()
    User._bootIfNotBooted()

    const user = new User()
    user.username = 'virk'

    const mercedes = await user.cars().create({ name: 'mercedes', model: '1992' })
    assert.equal(String(mercedes.user_id), String(user._id))
    assert.isTrue(mercedes.$persisted)
    assert.isFalse(mercedes.isNew)
    assert.isTrue(user.$persisted)
    assert.isFalse(user.isNew)
  })

  test('persist parent model when isNew while calling save', async (assert) => {
    class Car extends Model {
    }

    class User extends Model {
      cars () {
        return this.hasMany(Car)
      }
    }

    Car._bootIfNotBooted()
    User._bootIfNotBooted()

    const user = new User()
    user.username = 'virk'

    const mercedes = new Car()
    mercedes.name = 'mercedes'
    mercedes.model = '1992'

    await user.cars().save(mercedes)
    assert.equal(String(mercedes.user_id), String(user._id))
    assert.isTrue(mercedes.$persisted)
    assert.isFalse(mercedes.isNew)
    assert.isTrue(user.$persisted)
    assert.isFalse(user.isNew)
  })

  test('saveMany of related instances', async (assert) => {
    class Car extends Model {
    }

    class User extends Model {
      cars () {
        return this.hasMany(Car)
      }
    }

    Car._bootIfNotBooted()
    User._bootIfNotBooted()

    const user = new User()
    user.username = 'virk'

    const mercedes = new Car()
    mercedes.name = 'mercedes'
    mercedes.model = '1992'

    const ferrari = new Car()
    ferrari.name = 'ferrari'
    ferrari.model = '2002'

    await user.cars().saveMany([mercedes, ferrari])
    assert.equal(String(mercedes.user_id), String(user._id))
    assert.equal(String(ferrari.user_id), String(user._id))
    assert.isTrue(mercedes.$persisted)
    assert.isFalse(ferrari.isNew)
    assert.isTrue(ferrari.$persisted)
    assert.isFalse(mercedes.isNew)
    assert.isTrue(user.$persisted)
    assert.isFalse(user.isNew)
  })

  test('createMany of related instances', async (assert) => {
    class Car extends Model {
    }

    class User extends Model {
      cars () {
        return this.hasMany(Car)
      }
    }

    Car._bootIfNotBooted()
    User._bootIfNotBooted()

    const user = new User()
    user.username = 'virk'

    const [mercedes, ferrari] = await user.cars().createMany([{ name: 'mercedes', model: '1992' }, { name: 'ferrari', model: '2002' }])

    assert.equal(String(mercedes.user_id), String(user._id))
    assert.equal(String(ferrari.user_id), String(user._id))
    assert.isTrue(mercedes.$persisted)
    assert.isFalse(ferrari.isNew)
    assert.isTrue(ferrari.$persisted)
    assert.isFalse(mercedes.isNew)
    assert.isTrue(user.$persisted)
    assert.isFalse(user.isNew)
  })

  test('delete related rows', async (assert) => {
    class Car extends Model {
    }

    class User extends Model {
      cars () {
        return this.hasMany(Car)
      }
    }

    Car._bootIfNotBooted()
    User._bootIfNotBooted()

    const user = new User()
    user.username = 'virk'

    await user.cars().createMany([{ name: 'mercedes', model: '1992' }, { name: 'ferrari', model: '2002' }])
    await user.cars().delete()
    const cars = await ioc.use('Database').collection('cars').find()
    assert.lengthOf(cars, 0)
  })

  test('add constraints to delete query', async (assert) => {
    class Car extends Model {
    }

    class User extends Model {
      cars () {
        return this.hasMany(Car)
      }
    }

    Car._bootIfNotBooted()
    User._bootIfNotBooted()

    const user = new User()
    user.username = 'virk'

    await user.cars().createMany([{ name: 'mercedes', model: '1992' }, { name: 'ferrari', model: '2002' }])
    await user.cars().where('name', 'mercedes').delete()
    const cars = await ioc.use('Database').collection('cars').find()
    assert.lengthOf(cars, 1)
    assert.equal(cars[0].name, 'ferrari')
  })

  test('throw exception when createMany doesn\'t receives an array', async (assert) => {
    assert.plan(1)

    class Car extends Model {
    }

    class User extends Model {
      cars () {
        return this.hasMany(Car)
      }
    }

    Car._bootIfNotBooted()
    User._bootIfNotBooted()

    const user = new User()
    user.username = 'virk'

    try {
      await user.cars().createMany({ name: 'mercedes', model: '1992' })
    } catch ({ message }) {
      assert.equal(message, 'E_INVALID_PARAMETER: hasMany.createMany expects an array of values instead received object')
    }
  })

  test('throw exception when saveMany doesn\'t receives an array', async (assert) => {
    assert.plan(1)

    class Car extends Model {
    }

    class User extends Model {
      cars () {
        return this.hasMany(Car)
      }
    }

    Car._bootIfNotBooted()
    User._bootIfNotBooted()

    const user = new User()
    user.username = 'virk'

    try {
      await user.cars().saveMany(new Car())
    } catch ({ message }) {
      assert.equal(message, 'E_INVALID_PARAMETER: hasMany.saveMany expects an array of related model instances instead received object')
    }
  })
})
