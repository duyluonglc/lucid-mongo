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

test.group('Relations | Morph Many', (group) => {
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
    await ioc.use('Adonis/Src/Database').collection('posts').delete()
    await ioc.use('Adonis/Src/Database').collection('pictures').delete()
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

  test('get instance of morph many when calling to relation method', async (assert) => {
    class Picture extends Model {
    }

    class User extends Model {
      pictures () {
        return this.morphMany(Picture)
      }
    }

    Picture._bootIfNotBooted()
    User._bootIfNotBooted()

    const rs = await ioc.use('Database').collection('users').insert({ username: 'virk' })
    await ioc.use('Database').collection('pictures').insert([
      { parent_id: rs.insertedIds[0], determiner: 'User', file: 'images/file.png' },
      { parent_id: rs.insertedIds[0], determiner: 'User', file: 'images/file.png' }
    ])

    const user = await User.find(rs.insertedIds[0])
    const pictures = await user.pictures().fetch()
    assert.instanceOf(pictures, VanillaSerializer)
    assert.equal(pictures.size(), 2)
  })

  test('get first instance of related model', async (assert) => {
    class Picture extends Model {
    }

    class User extends Model {
      pictures () {
        return this.morphMany(Picture)
      }
    }

    Picture._bootIfNotBooted()
    User._bootIfNotBooted()

    const rs = await ioc.use('Database').collection('users').insert({ username: 'virk' })
    await ioc.use('Database').collection('pictures').insert([
      { parent_id: rs.insertedIds[0], determiner: 'User', file: 'images/file.png' },
      { parent_id: rs.insertedIds[0], determiner: 'User', file: 'images/file.png' }
    ])

    const user = await User.find(rs.insertedIds[0])
    const picture = await user.pictures().first()
    assert.instanceOf(picture, Picture)
    assert.equal(picture.file, 'images/file.png')
  })

  test('eagerload relation', async (assert) => {
    class Picture extends Model {
    }

    class User extends Model {
      pictures () {
        return this.morphMany(Picture)
      }
    }

    Picture._bootIfNotBooted()
    User._bootIfNotBooted()

    const rs = await ioc.use('Database').collection('users').insert({ username: 'virk' })
    await ioc.use('Database').collection('pictures').insert([
      { parent_id: rs.insertedIds[0], determiner: 'User', file: 'images/file.png' },
      { parent_id: rs.insertedIds[0], determiner: 'User', file: 'images/file.png' }
    ])

    const user = await User.query().with('pictures').first()
    assert.instanceOf(user.getRelated('pictures'), VanillaSerializer)
    assert.equal(user.getRelated('pictures').size(), 2)
    assert.deepEqual(user.getRelated('pictures').rows.map((picture) => picture.$parent), ['User', 'User'])
  })

  test('add constraints when eagerloading', async (assert) => {
    class Picture extends Model {
    }

    class User extends Model {
      pictures () {
        return this.morphMany(Picture)
      }
    }

    Picture._bootIfNotBooted()
    User._bootIfNotBooted()

    const rs = await ioc.use('Database').collection('users').insert({ username: 'virk' })
    await ioc.use('Database').collection('pictures').insert([
      { parent_id: rs.insertedIds[0], determiner: 'User', file: 'images/file1.png', likes: 1000 },
      { parent_id: rs.insertedIds[0], determiner: 'User', file: 'images/file2.png', likes: 3000 }
    ])
    const users = await User.query().with('pictures', (builder) => {
      builder.where('likes', '>', 2000)
    }).fetch()
    assert.equal(users.rows[0].getRelated('pictures').size(), 1)
    assert.equal(users.rows[0].getRelated('pictures').rows[0].file, 'images/file2.png')
  })

  test('return serailizer instance when nothing exists', async (assert) => {
    class Picture extends Model {
    }

    class User extends Model {
      pictures () {
        return this.morphMany(Picture)
      }
    }

    Picture._bootIfNotBooted()
    User._bootIfNotBooted()

    await ioc.use('Database').collection('users').insert({ username: 'virk' })
    const users = await User.query().with('pictures').fetch()
    const user = users.first()
    assert.equal(user.getRelated('pictures').size(), 0)
  })

  test('calling toJSON should build right json structure', async (assert) => {
    class Picture extends Model {
    }

    class User extends Model {
      pictures () {
        return this.morphMany(Picture)
      }
    }

    Picture._bootIfNotBooted()
    User._bootIfNotBooted()

    const rs = await ioc.use('Database').collection('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await ioc.use('Database').collection('pictures').insert([
      { parent_id: rs.insertedIds[0], determiner: 'User', file: 'images/file1.png', likes: 1000 },
      { parent_id: rs.insertedIds[1], determiner: 'User', file: 'images/file2.png', likes: 3000 }
    ])

    const users = await User.query().with('pictures').fetch()
    const json = users.toJSON()
    assert.equal(json[0].pictures[0].file, 'images/file1.png')
    assert.equal(json[1].pictures[0].file, 'images/file2.png')
  })

  test('calling toJSON should build right json structure', async (assert) => {
    class Picture extends Model {
    }

    class User extends Model {
      pictures () {
        return this.morphMany(Picture)
      }
    }

    Picture._bootIfNotBooted()
    User._bootIfNotBooted()

    const rs = await ioc.use('Database').collection('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await ioc.use('Database').collection('pictures').insert([
      { parent_id: rs.insertedIds[0], determiner: 'User', file: 'images/file1.png', likes: 1000 },
      { parent_id: rs.insertedIds[1], determiner: 'User', file: 'images/file2.png', likes: 3000 }
    ])

    const users = await User.query().with('pictures').fetch()
    const json = users.toJSON()
    assert.equal(json[0].pictures[0].file, 'images/file1.png')
    assert.equal(json[1].pictures[0].file, 'images/file2.png')
  })

  test('calling toJSON should build right json structure', async (assert) => {
    class Picture extends Model {
    }

    class User extends Model {
      pictures () {
        return this.morphMany(Picture)
      }
    }

    Picture._bootIfNotBooted()
    User._bootIfNotBooted()

    const rs = await ioc.use('Database').collection('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await ioc.use('Database').collection('pictures').insert([
      { parent_id: rs.insertedIds[0], determiner: 'User', file: 'images/file1.png', likes: 1000 },
      { parent_id: rs.insertedIds[1], determiner: 'User', file: 'images/file2.png', likes: 3000 }
    ])

    const users = await User.query().with('pictures').fetch()
    const json = users.toJSON()
    assert.equal(json[0].pictures[0].file, 'images/file1.png')
    assert.equal(json[1].pictures[0].file, 'images/file2.png')
  })

  test('should work with nested relations', async (assert) => {
    class Part extends Model {
    }

    class Picture extends Model {
      parts () {
        return this.morphMany(Part)
      }
    }

    class User extends Model {
      pictures () {
        return this.morphMany(Picture)
      }
    }

    Part._bootIfNotBooted()
    Picture._bootIfNotBooted()
    User._bootIfNotBooted()

    const rs = await ioc.use('Database').collection('users').insert({ username: 'virk' })
    const rsPicture = await ioc.use('Database').collection('pictures').insert([
      { parent_id: rs.insertedIds[0], determiner: 'User', file: 'images/file1.png', likes: 1000 },
      { parent_id: rs.insertedIds[0], determiner: 'User', file: 'images/file2.png', likes: 3000 }
    ])
    await ioc.use('Database').collection('parts').insert([
      { parent_id: rsPicture.insertedIds[0], determiner: 'Picture', part_name: 'wheels' },
      { parent_id: rsPicture.insertedIds[0], determiner: 'Picture', part_name: 'engine' },
      { parent_id: rsPicture.insertedIds[1], determiner: 'Picture', part_name: 'wheels' },
      { parent_id: rsPicture.insertedIds[1], determiner: 'Picture', part_name: 'engine' }
    ])

    const user = await User.query().with('pictures.parts').first()
    assert.equal(user.getRelated('pictures').size(), 2)
    assert.equal(user.getRelated('pictures').first().getRelated('parts').size(), 2)
    assert.equal(user.getRelated('pictures').last().getRelated('parts').size(), 2)
  })

  test('add query constraint to nested query', async (assert) => {
    class Part extends Model {
    }

    class Picture extends Model {
      parts () {
        return this.morphMany(Part)
      }
    }

    class User extends Model {
      pictures () {
        return this.morphMany(Picture)
      }
    }

    Part._bootIfNotBooted()
    Picture._bootIfNotBooted()
    User._bootIfNotBooted()

    const rs = await ioc.use('Database').collection('users').insert({ username: 'virk' })
    const rsPicture = await ioc.use('Database').collection('pictures').insert([
      { parent_id: rs.insertedIds[0], determiner: 'User', file: 'images/file1.png', likes: 1000 },
      { parent_id: rs.insertedIds[0], determiner: 'User', file: 'images/file2.png', likes: 3000 }
    ])
    await ioc.use('Database').collection('parts').insert([
      { parent_id: rsPicture.insertedIds[0], determiner: 'Picture', part_name: 'wheels' },
      { parent_id: rsPicture.insertedIds[0], determiner: 'Picture', part_name: 'engine' },
      { parent_id: rsPicture.insertedIds[1], determiner: 'Picture', part_name: 'wheels' },
      { parent_id: rsPicture.insertedIds[1], determiner: 'Picture', part_name: 'engine' }
    ])

    const user = await User.query().with('pictures.parts', (builder) => builder.where('part_name', 'engine')).first()
    assert.equal(user.getRelated('pictures').size(), 2)
    assert.equal(user.getRelated('pictures').first().getRelated('parts').size(), 1)
    assert.equal(user.getRelated('pictures').last().getRelated('parts').size(), 1)
  })

  test('add query constraint to child and grand child query', async (assert) => {
    class Part extends Model {
    }

    class Picture extends Model {
      parts () {
        return this.morphMany(Part)
      }
    }

    class User extends Model {
      pictures () {
        return this.morphMany(Picture)
      }
    }

    Part._bootIfNotBooted()
    Picture._bootIfNotBooted()
    User._bootIfNotBooted()

    const rs = await ioc.use('Database').collection('users').insert({ username: 'virk' })
    const rsPicture = await ioc.use('Database').collection('pictures').insert([
      { parent_id: rs.insertedIds[0], determiner: 'User', file: 'images/file1.png', likes: 1000 },
      { parent_id: rs.insertedIds[0], determiner: 'User', file: 'images/file2.png', likes: 3000 }
    ])
    await ioc.use('Database').collection('parts').insert([
      { parent_id: rsPicture.insertedIds[0], determiner: 'Picture', part_name: 'wheels' },
      { parent_id: rsPicture.insertedIds[0], determiner: 'Picture', part_name: 'engine' },
      { parent_id: rsPicture.insertedIds[1], determiner: 'Picture', part_name: 'wheels' },
      { parent_id: rsPicture.insertedIds[1], determiner: 'Picture', part_name: 'engine' }
    ])

    const user = await User.query().with('pictures', (builder) => {
      builder.where('likes', '>', 2000)
        .with('parts', (builder) => builder.where('part_name', 'engine'))
    }).first()

    assert.equal(user.getRelated('pictures').size(), 1)
    assert.equal(user.getRelated('pictures').first().getRelated('parts').size(), 1)
  })

  test('paginate records', async (assert) => {
    class Picture extends Model {
    }

    class User extends Model {
      pictures () {
        return this.morphMany(Picture)
      }
    }

    Picture._bootIfNotBooted()
    User._bootIfNotBooted()

    const rs = await ioc.use('Database').collection('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await ioc.use('Database').collection('pictures').insert([
      { parent_id: rs.insertedIds[0], name: 'mercedes', model: '1990' },
      { parent_id: rs.insertedIds[0], name: 'audi', model: '2001' },
      { parent_id: rs.insertedIds[1], name: 'audi', model: '2001' }
    ])

    const users = await User.query().with('pictures').paginate()
    assert.equal(users.size(), 2)
    assert.deepEqual(users.pages, { total: helpers.formatNumber(2), perPage: 20, page: 1, lastPage: 1 })
  })

  test('convert paginated records to json', async (assert) => {
    class Picture extends Model {
    }

    class User extends Model {
      pictures () {
        return this.morphMany(Picture)
      }
    }

    Picture._bootIfNotBooted()
    User._bootIfNotBooted()

    const rs = await ioc.use('Database').collection('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await ioc.use('Database').collection('pictures').insert([
      { parent_id: rs.insertedIds[0], name: 'mercedes', model: '1990' },
      { parent_id: rs.insertedIds[0], name: 'audi', model: '2001' },
      { parent_id: rs.insertedIds[1], name: 'audi', model: '2001' }
    ])

    const users = await User.query().with('pictures').paginate()
    const json = users.toJSON()
    assert.deepEqual(json.total, helpers.formatNumber(2))
    assert.deepEqual(json.perPage, 20)
    assert.deepEqual(json.page, 1)
    assert.deepEqual(json.lastPage, 1)
    assert.isArray(json.data)
    assert.isArray(json.data[0].pictures)
    assert.isArray(json.data[1].pictures)
  })

  test('save related model instance', async (assert) => {
    class Picture extends Model {
    }

    class User extends Model {
      pictures () {
        return this.morphMany(Picture)
      }
    }

    Picture._bootIfNotBooted()
    User._bootIfNotBooted()

    const user = new User()
    user.username = 'virk'
    await user.save()

    const mercedes = new Picture()
    mercedes.name = 'mercedes'
    mercedes.model = '1992'

    await user.pictures().save(mercedes)
    assert.equal(mercedes.parent_id, user._id)
    assert.isTrue(mercedes.$persisted)
    assert.isFalse(mercedes.isNew)
  })

  test('create related model instance', async (assert) => {
    class Picture extends Model {
    }

    class User extends Model {
      pictures () {
        return this.morphMany(Picture)
      }
    }

    Picture._bootIfNotBooted()
    User._bootIfNotBooted()

    const user = new User()
    user.username = 'virk'
    await user.save()

    const mercedes = await user.pictures().create({ name: 'mercedes', model: '1992' })
    assert.equal(String(mercedes.parent_id), String(user._id))
    assert.isTrue(mercedes.$persisted)
    assert.isFalse(mercedes.isNew)
  })

  test('persist parent model when isNew', async (assert) => {
    class Picture extends Model {
    }

    class User extends Model {
      pictures () {
        return this.morphMany(Picture)
      }
    }

    Picture._bootIfNotBooted()
    User._bootIfNotBooted()

    const user = new User()
    user.username = 'virk'

    const mercedes = await user.pictures().create({ name: 'mercedes', model: '1992' })
    assert.equal(String(mercedes.parent_id), String(user._id))
    assert.isTrue(mercedes.$persisted)
    assert.isFalse(mercedes.isNew)
    assert.isTrue(user.$persisted)
    assert.isFalse(user.isNew)
  })

  test('persist parent model when isNew while calling save', async (assert) => {
    class Picture extends Model {
    }

    class User extends Model {
      pictures () {
        return this.morphMany(Picture)
      }
    }

    Picture._bootIfNotBooted()
    User._bootIfNotBooted()

    const user = new User()
    user.username = 'virk'

    const mercedes = new Picture()
    mercedes.name = 'mercedes'
    mercedes.model = '1992'

    await user.pictures().save(mercedes)
    assert.equal(String(mercedes.parent_id), String(user._id))
    assert.isTrue(mercedes.$persisted)
    assert.isFalse(mercedes.isNew)
    assert.isTrue(user.$persisted)
    assert.isFalse(user.isNew)
  })

  test('saveMany of related instances', async (assert) => {
    class Picture extends Model {
    }

    class User extends Model {
      pictures () {
        return this.morphMany(Picture)
      }
    }

    Picture._bootIfNotBooted()
    User._bootIfNotBooted()

    const user = new User()
    user.username = 'virk'

    const mercedes = new Picture()
    mercedes.name = 'mercedes'
    mercedes.model = '1992'

    const ferrari = new Picture()
    ferrari.name = 'ferrari'
    ferrari.model = '2002'

    await user.pictures().saveMany([mercedes, ferrari])
    assert.equal(String(mercedes.parent_id), String(user._id))
    assert.equal(String(ferrari.parent_id), String(user._id))
    assert.isTrue(mercedes.$persisted)
    assert.isFalse(ferrari.isNew)
    assert.isTrue(ferrari.$persisted)
    assert.isFalse(mercedes.isNew)
    assert.isTrue(user.$persisted)
    assert.isFalse(user.isNew)
  })

  test('createMany of related instances', async (assert) => {
    class Picture extends Model {
    }

    class User extends Model {
      pictures () {
        return this.morphMany(Picture)
      }
    }

    Picture._bootIfNotBooted()
    User._bootIfNotBooted()

    const user = new User()
    user.username = 'virk'

    const [mercedes, ferrari] = await user.pictures().createMany([{ name: 'mercedes', model: '1992' }, { name: 'ferrari', model: '2002' }])

    assert.equal(String(mercedes.parent_id), String(user._id))
    assert.equal(String(ferrari.parent_id), String(user._id))
    assert.isTrue(mercedes.$persisted)
    assert.isFalse(ferrari.isNew)
    assert.isTrue(ferrari.$persisted)
    assert.isFalse(mercedes.isNew)
    assert.isTrue(user.$persisted)
    assert.isFalse(user.isNew)
  })

  test('delete related rows', async (assert) => {
    class Picture extends Model {
    }

    class User extends Model {
      pictures () {
        return this.morphMany(Picture)
      }
    }

    Picture._bootIfNotBooted()
    User._bootIfNotBooted()

    const user = new User()
    user.username = 'virk'

    await user.pictures().createMany([{ name: 'mercedes', model: '1992' }, { name: 'ferrari', model: '2002' }])
    await user.pictures().delete()
    const pictures = await ioc.use('Database').collection('pictures').find()
    assert.lengthOf(pictures, 0)
  })

  test('add constraints to delete query', async (assert) => {
    class Picture extends Model {
    }

    class User extends Model {
      pictures () {
        return this.morphMany(Picture)
      }
    }

    Picture._bootIfNotBooted()
    User._bootIfNotBooted()

    const user = new User()
    user.username = 'virk'

    await user.pictures().createMany([{ name: 'mercedes', model: '1992' }, { name: 'ferrari', model: '2002' }])
    await user.pictures().where('name', 'mercedes').delete()
    const pictures = await ioc.use('Database').collection('pictures').find()
    assert.lengthOf(pictures, 1)
    assert.equal(pictures[0].name, 'ferrari')
  })

  test('throw exception when createMany doesn\'t receives an array', async (assert) => {
    assert.plan(1)

    class Picture extends Model {
    }

    class User extends Model {
      pictures () {
        return this.morphMany(Picture)
      }
    }

    Picture._bootIfNotBooted()
    User._bootIfNotBooted()

    const user = new User()
    user.username = 'virk'

    try {
      await user.pictures().createMany({ name: 'mercedes', model: '1992' })
    } catch ({ message }) {
      assert.equal(message, 'E_INVALID_PARAMETER: morphMany.createMany expects an array of values instead received object')
    }
  })

  test('throw exception when saveMany doesn\'t receives an array', async (assert) => {
    assert.plan(1)

    class Picture extends Model {
    }

    class User extends Model {
      pictures () {
        return this.morphMany(Picture)
      }
    }

    Picture._bootIfNotBooted()
    User._bootIfNotBooted()

    const user = new User()
    user.username = 'virk'

    try {
      await user.pictures().saveMany(new Picture())
    } catch ({ message }) {
      assert.equal(message, 'E_INVALID_PARAMETER: morphMany.saveMany expects an array of related model instances instead received object')
    }
  })
})
