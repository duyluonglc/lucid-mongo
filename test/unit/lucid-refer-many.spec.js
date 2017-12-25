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
const _ = require('lodash')

test.group('Relations | Refer Many', (group) => {
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

  test('get instance of refer many when calling to relation method', async (assert) => {
    class Picture extends Model {
    }

    class User extends Model {
      pictures () {
        return this.referMany(Picture)
      }
    }

    Picture._bootIfNotBooted()
    User._bootIfNotBooted()

    const result = await ioc.use('Database').collection('pictures').insert([
      { file: 'images/file1.png' },
      { file: 'images/file2.png' }
    ])
    const rs = await ioc.use('Database').collection('users').insert({ username: 'virk', picture_ids: _.toArray(result.insertedIds) })

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
        return this.referMany(Picture)
      }
    }

    Picture._bootIfNotBooted()
    User._bootIfNotBooted()

    const result = await ioc.use('Database').collection('pictures').insert([
      { file: 'images/file1.png' },
      { file: 'images/file2.png' }
    ])
    const rs = await ioc.use('Database').collection('users').insert({ username: 'virk', picture_ids: _.toArray(result.insertedIds) })

    const user = await User.find(rs.insertedIds[0])
    const picture = await user.pictures().first()
    assert.instanceOf(picture, Picture)
    assert.equal(picture.file, 'images/file1.png')
  })

  test('eagerload relation', async (assert) => {
    class Picture extends Model {
    }

    class User extends Model {
      pictures () {
        return this.referMany(Picture)
      }
    }

    Picture._bootIfNotBooted()
    User._bootIfNotBooted()

    const result = await ioc.use('Database').collection('pictures').insert([
      { file: 'images/file1.png' },
      { file: 'images/file2.png' }
    ])
    await ioc.use('Database').collection('users').insert({ username: 'virk', picture_ids: _.toArray(result.insertedIds) })

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
        return this.referMany(Picture)
      }
    }

    Picture._bootIfNotBooted()
    User._bootIfNotBooted()

    const result = await ioc.use('Database').collection('pictures').insert([
      { file: 'images/file1.png', likes: 1000 },
      { file: 'images/file2.png', likes: 3000 }
    ])

    await ioc.use('Database').collection('users').insert({ username: 'virk', picture_ids: _.toArray(result.insertedIds) })

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
        return this.referMany(Picture)
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
        return this.referMany(Picture)
      }
    }

    Picture._bootIfNotBooted()
    User._bootIfNotBooted()

    const result = await ioc.use('Database').collection('pictures').insert([
      { file: 'images/file1.png' },
      { file: 'images/file2.png' }
    ])
    await ioc.use('Database').collection('users').insert([{ username: 'virk', picture_ids: [result.insertedIds[0]] }, { username: 'nirk', picture_ids: [result.insertedIds[1]] }])

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
        return this.referMany(Part)
      }
    }

    class User extends Model {
      pictures () {
        return this.referMany(Picture)
      }
    }

    Part._bootIfNotBooted()
    Picture._bootIfNotBooted()
    User._bootIfNotBooted()

    const partsResult = await ioc.use('Database').collection('parts').insert([
      { part_name: 'wheels' },
      { part_name: 'engine' },
      { part_name: 'wheels' },
      { part_name: 'engine' }
    ])

    const result = await ioc.use('Database').collection('pictures').insert([
      { file: 'images/file1.png', part_ids: [partsResult.insertedIds[0], partsResult.insertedIds[1]] },
      { file: 'images/file2.png', part_ids: [partsResult.insertedIds[2], partsResult.insertedIds[3]] }
    ])

    await ioc.use('Database').collection('users').insert({ username: 'virk', picture_ids: _.toArray(result.insertedIds) })

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
        return this.referMany(Part)
      }
    }

    class User extends Model {
      pictures () {
        return this.referMany(Picture)
      }
    }

    Part._bootIfNotBooted()
    Picture._bootIfNotBooted()
    User._bootIfNotBooted()

    const partsResult = await ioc.use('Database').collection('parts').insert([
      { part_name: 'wheels' },
      { part_name: 'engine' },
      { part_name: 'wheels' },
      { part_name: 'engine' }
    ])

    const result = await ioc.use('Database').collection('pictures').insert([
      { file: 'images/file1.png', part_ids: [partsResult.insertedIds[0], partsResult.insertedIds[1]] },
      { file: 'images/file2.png', part_ids: [partsResult.insertedIds[2], partsResult.insertedIds[3]] }
    ])

    await ioc.use('Database').collection('users').insert({ username: 'virk', picture_ids: _.toArray(result.insertedIds) })

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
        return this.referMany(Part)
      }
    }

    class User extends Model {
      pictures () {
        return this.referMany(Picture)
      }
    }

    Part._bootIfNotBooted()
    Picture._bootIfNotBooted()
    User._bootIfNotBooted()

    const partsResult = await ioc.use('Database').collection('parts').insert([
      { part_name: 'wheels' },
      { part_name: 'engine' },
      { part_name: 'wheels' },
      { part_name: 'engine' }
    ])

    const result = await ioc.use('Database').collection('pictures').insert([
      { likes: 1000, file: 'images/file1.png', part_ids: [partsResult.insertedIds[0], partsResult.insertedIds[1]] },
      { likes: 3000, file: 'images/file2.png', part_ids: [partsResult.insertedIds[2], partsResult.insertedIds[3]] }
    ])

    await ioc.use('Database').collection('users').insert({ username: 'virk', picture_ids: _.toArray(result.insertedIds) })

    const user = await User.query().with('pictures', (builder) => {
      builder.where('likes', '>', 2000)
        .with('parts', (builder) => builder.where('part_name', 'wheels'))
    }).first()

    assert.equal(user.getRelated('pictures').size(), 1)
    assert.equal(user.getRelated('pictures').first().getRelated('parts').size(), 1)
  })

  test('paginate records', async (assert) => {
    class Picture extends Model {
    }

    class User extends Model {
      pictures () {
        return this.referMany(Picture)
      }
    }

    Picture._bootIfNotBooted()
    User._bootIfNotBooted()

    const result = await ioc.use('Database').collection('pictures').insert([
      { file: 'images/file1.png' },
      { file: 'images/file2.png' },
      { file: 'images/file3.png' }
    ])

    await ioc.use('Database').collection('users').insert([{ username: 'virk', picture_ids: _.toArray(result.insertedIds) }, { username: 'nikk', picture_ids: _.toArray(result.insertedIds) }])

    const users = await User.query().with('pictures').paginate()
    assert.equal(users.size(), 2)
    assert.deepEqual(users.pages, { total: helpers.formatNumber(2), perPage: 20, page: 1, lastPage: 1 })
  })

  test('convert paginated records to json', async (assert) => {
    class Picture extends Model {
    }

    class User extends Model {
      pictures () {
        return this.referMany(Picture)
      }
    }

    Picture._bootIfNotBooted()
    User._bootIfNotBooted()

    const result = await ioc.use('Database').collection('pictures').insert([
      { file: 'images/file1.png' },
      { file: 'images/file2.png' },
      { file: 'images/file3.png' }
    ])

    await ioc.use('Database').collection('users').insert([{ username: 'virk', picture_ids: [result.insertedIds[0], result.insertedIds[1]] }, { username: 'nikk', picture_ids: [result.insertedIds[2]] }])

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
        return this.referMany(Picture)
      }
    }

    Picture._bootIfNotBooted()
    User._bootIfNotBooted()

    const user = new User()
    user.username = 'virk'
    await user.save()

    const picture = new Picture()
    picture.name = 'picture'
    picture.model = '1992'

    await user.pictures().save(picture)
    assert.lengthOf(user.picture_ids, 1)
    assert.equal(String(user.picture_ids[0]), String(picture._id))
    assert.isTrue(picture.$persisted)
    assert.isFalse(picture.isNew)
  })

  test('create related model instance', async (assert) => {
    class Picture extends Model {
    }

    class User extends Model {
      pictures () {
        return this.referMany(Picture)
      }
    }

    Picture._bootIfNotBooted()
    User._bootIfNotBooted()

    const user = new User()
    user.username = 'virk'
    await user.save()

    const picture = await user.pictures().create({ name: 'mercedes', model: '1992' })
    assert.lengthOf(user.picture_ids, 1)
    assert.equal(String(user.picture_ids[0]), String(picture._id))
    assert.isTrue(picture.$persisted)
    assert.isFalse(picture.isNew)
  })

  test('persist parent model when isNew', async (assert) => {
    class Picture extends Model {
    }

    class User extends Model {
      pictures () {
        return this.referMany(Picture)
      }
    }

    Picture._bootIfNotBooted()
    User._bootIfNotBooted()

    const user = new User()
    user.username = 'virk'

    const picture = await user.pictures().create({ name: 'picture', model: '1992' })
    assert.lengthOf(user.picture_ids, 1)
    assert.equal(String(user.picture_ids[0]), String(picture._id))
    assert.isTrue(picture.$persisted)
    assert.isFalse(picture.isNew)
    assert.isTrue(user.$persisted)
    assert.isFalse(user.isNew)
  })

  test('persist parent model when isNew while calling save', async (assert) => {
    class Picture extends Model {
    }

    class User extends Model {
      pictures () {
        return this.referMany(Picture)
      }
    }

    Picture._bootIfNotBooted()
    User._bootIfNotBooted()

    const user = new User()
    user.username = 'virk'

    const picture = new Picture()
    picture.name = 'picture'
    picture.model = '1992'

    await user.pictures().save(picture)
    assert.lengthOf(user.picture_ids, 1)
    assert.equal(String(user.picture_ids[0]), String(picture._id))
    assert.isTrue(picture.$persisted)
    assert.isFalse(picture.isNew)
    assert.isTrue(user.$persisted)
    assert.isFalse(user.isNew)
  })

  test('saveMany of related instances', async (assert) => {
    class Picture extends Model {
    }

    class User extends Model {
      pictures () {
        return this.referMany(Picture)
      }
    }

    Picture._bootIfNotBooted()
    User._bootIfNotBooted()

    const user = new User()
    user.username = 'virk'

    const picture1 = new Picture()
    picture1.name = 'picture1'
    picture1.model = '1992'

    const picture2 = new Picture()
    picture2.name = 'picture2'
    picture2.model = '2002'

    await user.pictures().saveMany([picture1, picture2])
    assert.lengthOf(user.picture_ids, 2)
    assert.equal(String(user.picture_ids[0]), String(picture1._id))
    assert.equal(String(user.picture_ids[1]), String(picture2._id))
    assert.isTrue(picture1.$persisted)
    assert.isFalse(picture2.isNew)
    assert.isTrue(picture2.$persisted)
    assert.isFalse(picture1.isNew)
    assert.isTrue(user.$persisted)
    assert.isFalse(user.isNew)
  })

  test('createMany of related instances', async (assert) => {
    class Picture extends Model {
    }

    class User extends Model {
      pictures () {
        return this.referMany(Picture)
      }
    }

    Picture._bootIfNotBooted()
    User._bootIfNotBooted()

    const user = new User()
    user.username = 'virk'

    const [mercedes, ferrari] = await user.pictures().createMany([{ name: 'mercedes', model: '1992' }, { name: 'ferrari', model: '2002' }])

    assert.lengthOf(user.picture_ids, 2)
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
        return this.referMany(Picture)
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
        return this.referMany(Picture)
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
        return this.referMany(Picture)
      }
    }

    Picture._bootIfNotBooted()
    User._bootIfNotBooted()

    const user = new User()
    user.username = 'virk'

    try {
      await user.pictures().createMany({ name: 'mercedes', model: '1992' })
    } catch ({ message }) {
      assert.equal(message, 'E_INVALID_PARAMETER: referMany.createMany expects an array of related model instances instead received object')
    }
  })

  test('throw exception when saveMany doesn\'t receives an array', async (assert) => {
    assert.plan(1)

    class Picture extends Model {
    }

    class User extends Model {
      pictures () {
        return this.referMany(Picture)
      }
    }

    Picture._bootIfNotBooted()
    User._bootIfNotBooted()

    const user = new User()
    user.username = 'virk'

    try {
      await user.pictures().saveMany(new Picture())
    } catch ({ message }) {
      assert.equal(message, 'E_INVALID_PARAMETER: referMany.saveMany expects an array of related model instances instead received object')
    }
  })

  test('attach related models', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.referMany(Post)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const user = await User.create({ username: 'virk' })

    const post1 = await Post.create({ title: 'Adonis 101' })
    const post2 = await Post.create({ title: 'Adonis 102' })
    await user.posts().attach(post1._id)
    await user.posts().attach(post1._id)
    await user.posts().attach(post2._id)
    await user.posts().attach(post2._id)

    const posts = await user.posts().fetch()
    assert.lengthOf(posts.rows, 2)
    assert.equal(String(posts.rows[0]._id), String(post1._id))
    assert.equal(String(posts.rows[1]._id), String(post2._id))
  })

  test('attach 1 related model with multiple parent', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.referMany(Post)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const userResult = await ioc.use('Database').collection('users').insert([{ username: 'virk' }, { username: 'nik' }])
    const user1 = await User.find(userResult.insertedIds[0])
    const user2 = await User.find(userResult.insertedIds[1])

    const post1 = await Post.create({ title: 'Adonis 101' })
    const post2 = await Post.create({ title: 'Adonis 102' })

    await user1.posts().attach(post1._id)
    await user1.posts().attach(post1._id)
    await user2.posts().attach(post1._id)
    await user2.posts().attach(post2._id)
    await user2.posts().attach(post2._id)

    const users = await ioc.use('Database').collection('users').find()
    assert.lengthOf(users, 2)
    assert.lengthOf(users[0].post_ids, 1)
    assert.lengthOf(users[1].post_ids, 2)
  })

  test('eager load multiple parent has same children', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.referMany(Post)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const postResult = await ioc.use('Database').collection('posts').insert([{ title: 'Adonis 1' }, { title: 'Adonis 2' }])
    await ioc.use('Database').collection('users').insert([
      { username: 'virk', post_ids: [postResult.insertedIds[0]] }, { username: 'nik', post_ids: [postResult.insertedIds[0], postResult.insertedIds[1]] }
    ])

    const users = await User.with('posts').fetch()

    assert.lengthOf(users.toJSON(), 2)
    assert.lengthOf(users.first().toJSON().posts, 1)
    assert.lengthOf(users.last().toJSON().posts, 2)
  })
})
