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
const moment = require('moment')
const ObjectID = require('mongodb').ObjectID
const helpers = require('./helpers')
const Model = require('../../src/LucidMongo/Model')
const DatabaseManager = require('../../src/Database/Manager')

test.group('Relations | Belongs To Many', (group) => {
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
    await ioc.use('Adonis/Src/Database').collection('post_user').delete()
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

  test('configure collection name from model names', (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const user = new User()
    const userPosts = user.posts()
    assert.equal(userPosts._pivot.collection, 'post_user')
  })

  test('define different collection name', (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post).pivotCollection('my_posts')
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const user = new User()
    const userPosts = user.posts()
    assert.equal(userPosts._pivot.collection, 'my_posts')
  })

  test('fetch collection name from pivotModel', (assert) => {
    class Post extends Model {
    }

    class PostUser extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post).pivotModel(PostUser)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const user = new User()
    const userPosts = user.posts()
    assert.equal(userPosts.$pivotCollection, 'post_users')
  })

  test('set timestamps to true', (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post).withTimestamps()
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const user = new User()
    const userPosts = user.posts()
    assert.isTrue(userPosts._pivot.withTimestamps)
  })

  test('throw exception when pivotModel is defined and calling pivotCollection', (assert) => {
    class Post extends Model {
    }

    class PostUser extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post).pivotModel(PostUser).pivotCollection()
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const user = new User()
    const fn = () => user.posts()
    assert.throw(fn, 'E_INVALID_RELATION_METHOD: Cannot call pivotCollection since pivotModel has been defined')
  })

  test('throw exception when pivotModel is defined and calling withTimestamps', (assert) => {
    class Post extends Model {
    }

    class PostUser extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post).pivotModel(PostUser).withTimestamps()
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const user = new User()
    const fn = () => user.posts()
    assert.throw(fn, 'E_INVALID_RELATION_METHOD: Cannot call withTimestamps since pivotModel has been defined')
  })

  test('define pivot fields to be selected', (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post).withPivot('is_published')
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const user = new User()
    const userPosts = user.posts()
    assert.deepEqual(userPosts._pivot.withFields, ['is_published'])
  })

  test('define multiple pivot fields to be selected', (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post).withPivot('is_published').withPivot('deleted_at')
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const user = new User()
    const userPosts = user.posts()
    assert.deepEqual(userPosts._pivot.withFields, ['is_published', 'deleted_at'])
  })

  test('define multiple pivot fields defined as an array', (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post).withPivot(['is_published', 'deleted_at'])
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const user = new User()
    const userPosts = user.posts()
    assert.deepEqual(userPosts._pivot.withFields, ['is_published', 'deleted_at'])
  })

  test('define pivot model', (assert) => {
    class Post extends Model {
    }

    class PostUser extends Model {}

    class User extends Model {
      posts () {
        return this.belongsToMany(Post).pivotModel(PostUser)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const user = new User()
    const userPosts = user.posts()
    assert.deepEqual(userPosts._PivotModel, PostUser)
  })

  test('fetch related rows', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post).withPivot('is_published')
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const userResult = await ioc.use('Database').collection('users').insert({ username: 'virk' })
    const postResult = await ioc.use('Database').collection('posts').insert([{ title: 'Adonis 101' }, { title: 'Lucid 101' }])
    await ioc.use('Database').collection('post_user').insert({ post_id: postResult.insertedIds[0], user_id: userResult.insertedIds[0] })

    const user = await User.find(userResult.insertedIds[0])
    const posts = await user.posts().fetch()
    assert.equal(posts.size(), 1)
    assert.equal(posts.first().title, 'Adonis 101')
  })

  test('fetch first related rows', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post).withPivot('is_published')
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const userResult = await ioc.use('Database').collection('users').insert({ username: 'virk' })
    const postResult = await ioc.use('Database').collection('posts').insert([{ title: 'Adonis 101' }, { title: 'Lucid 101' }])
    await ioc.use('Database').collection('post_user').insert({ post_id: postResult.insertedIds[0], user_id: userResult.insertedIds[0] })

    const user = await User.find(userResult.insertedIds[0])
    const post = await user.posts().first()
    assert.equal(post.title, 'Adonis 101')
  })

  test('add constraints on pivot collection', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post).withPivot('is_published')
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const userResult = await ioc.use('Database').collection('users').insert({ username: 'virk' })
    const postResult = await ioc.use('Database').collection('posts').insert([{ title: 'Adonis 101' }, { title: 'Lucid 101' }])

    await ioc.use('Database').collection('post_user').insert([
      { post_id: postResult.insertedIds[0], user_id: userResult.insertedIds[0], is_published: true },
      { post_id: postResult.insertedIds[1], user_id: userResult.insertedIds[0] }
    ])

    const user = await User.find(userResult.insertedIds[0])
    const posts = await user.posts().wherePivot('is_published', true).fetch()
    assert.equal(posts.size(), 1)
    assert.equal(posts.first().title, 'Adonis 101')
    // assert.equal(posts.first().getRelated('pivot').$attributes.is_published, helpers.formatBoolean(true))
  })

  test('properly convert related model toJSON', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post).withPivot('is_published')
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const userResult = await ioc.use('Database').collection('users').insert({ username: 'virk' })
    const postResult = await ioc.use('Database').collection('posts').insert([{ title: 'Adonis 101' }, { title: 'Lucid 101' }])

    await ioc.use('Database').collection('post_user').insert([
      { post_id: postResult.insertedIds[0], user_id: userResult.insertedIds[0], is_published: true },
      { post_id: postResult.insertedIds[1], user_id: userResult.insertedIds[0] }
    ])

    const user = await User.find(userResult.insertedIds[0])
    const posts = await user.posts().wherePivot('is_published', true).fetch()
    const json = posts.toJSON()
    assert.lengthOf(json, 1)
    // assert.deepEqual(json[0].pivot.is_published, helpers.formatBoolean(true))
  })

  test('eagerload related rows', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post).withPivot('is_published')
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const userResult = await ioc.use('Database').collection('users').insert({ username: 'virk' })
    const postResult = await ioc.use('Database').collection('posts').insert([{ title: 'Adonis 101' }, { title: 'Lucid 101' }])

    await ioc.use('Database').collection('post_user').insert([
      { post_id: postResult.insertedIds[0], user_id: userResult.insertedIds[0], is_published: true },
      { post_id: postResult.insertedIds[1], user_id: userResult.insertedIds[0] }
    ])

    const users = await User.query().with('posts').fetch()
    assert.equal(users.size(), 1)
    assert.equal(users.first().getRelated('posts').size(), 2)
    assert.equal(users.first().getRelated('posts').first().title, 'Adonis 101')
  })

  test('eagerload related rows for multiple parent rows', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post).withPivot('is_published')
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const userResult = await ioc.use('Database').collection('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    const postResult = await ioc.use('Database').collection('posts').insert([{ title: 'Adonis 101' }, { title: 'Lucid 101' }])

    await ioc.use('Database').collection('post_user').insert([
      { post_id: postResult.insertedIds[0], user_id: userResult.insertedIds[0] },
      { post_id: postResult.insertedIds[0], user_id: userResult.insertedIds[1] },
      { post_id: postResult.insertedIds[1], user_id: userResult.insertedIds[1] }
    ])

    const users = await User.query().with('posts').sort('_id').fetch()
    assert.equal(users.size(), 2)
    assert.equal(users.last().username, 'nikk')
    assert.equal(users.last().getRelated('posts').size(), 2)
    assert.equal(users.first().getRelated('posts').first().title, 'Adonis 101')
    assert.equal(users.last().getRelated('posts').first().title, 'Adonis 101')
    assert.equal(users.last().getRelated('posts').last().title, 'Lucid 101')
  })

  test('lazily eagerload', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post).withPivot('is_published')
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const userResult = await ioc.use('Database').collection('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    const postResult = await ioc.use('Database').collection('posts').insert([{ title: 'Adonis 101' }, { title: 'Lucid 101' }])

    await ioc.use('Database').collection('post_user').insert([
      { post_id: postResult.insertedIds[0], user_id: userResult.insertedIds[0] },
      { post_id: postResult.insertedIds[1], user_id: userResult.insertedIds[0] },
      { post_id: postResult.insertedIds[1], user_id: userResult.insertedIds[1] }
    ])

    const user = await User.find(userResult.insertedIds[0])
    await user.load('posts')
    assert.equal(user.getRelated('posts').size(), 2)
    assert.equal(user.getRelated('posts').first().title, 'Adonis 101')
    assert.equal(user.getRelated('posts').last().title, 'Lucid 101')
  })

  test('paginate and load related rows', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post).withPivot('is_published')
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const userResult = await ioc.use('Database').collection('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    const postResult = await ioc.use('Database').collection('posts').insert([{ title: 'Adonis 101' }, { title: 'Lucid 101' }])

    await ioc.use('Database').collection('post_user').insert([
      { post_id: postResult.insertedIds[0], user_id: userResult.insertedIds[0] },
      { post_id: postResult.insertedIds[0], user_id: userResult.insertedIds[1] },
      { post_id: postResult.insertedIds[1], user_id: userResult.insertedIds[1] }
    ])

    const users = await User.query().with('posts').paginate()
    assert.equal(users.size(), 2)
    assert.deepEqual(users.pages, { total: helpers.formatNumber(2), perPage: 20, page: 1, lastPage: 1 })
    assert.equal(users.last().getRelated('posts').size(), 2)
    assert.equal(users.first().getRelated('posts').size(), 1)
  })

  test('add runtime constraints when eagerloading', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const userResult = await ioc.use('Database').collection('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    const postResult = await ioc.use('Database').collection('posts').insert([{ title: 'Adonis 101' }, { title: 'Lucid 101' }])

    await ioc.use('Database').collection('post_user').insert([
      { post_id: postResult.insertedIds[0], user_id: userResult.insertedIds[0] },
      { post_id: postResult.insertedIds[0], user_id: userResult.insertedIds[1] },
      { post_id: postResult.insertedIds[1], user_id: userResult.insertedIds[1] }
    ])

    const users = await User.query().with('posts', (builder) => {
      builder.where('is_published', true)
    }).paginate()
    assert.equal(users.size(), 2)
    assert.deepEqual(users.pages, { total: helpers.formatNumber(2), perPage: 20, page: 1, lastPage: 1 })
    assert.equal(users.last().getRelated('posts').size(), 0)
    assert.equal(users.first().getRelated('posts').size(), 0)
  })

  test('cast timestamps', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post).withPivot(['created_at', 'updated_at'])
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const userResult = await ioc.use('Database').collection('users').insert({ username: 'virk' })
    const postResult = await ioc.use('Database').collection('posts').insert({ title: 'Adonis 101' })

    await ioc.use('Database').collection('post_user').insert({
      post_id: postResult.insertedIds[0],
      user_id: userResult.insertedIds[0],
      is_published: true,
      created_at: new Date(),
      updated_at: new Date()
    })

    const user = await User.query().with('posts').first()
    const json = user.toJSON()
    assert.isTrue(moment(json.posts[0].pivot.created_at, 'YYYY-MM-DD HH:mm:ss', true).isValid())
    assert.isTrue(moment(json.posts[0].pivot.updated_at, 'YYYY-MM-DD HH:mm:ss', true).isValid())
  })

  test('call pivotModel getters when casting timestamps', async (assert) => {
    class Post extends Model {
    }

    class PostUser extends Model {
      static get collection () {
        return 'post_user'
      }

      getCreatedAt (date) {
        return date.format('YYYY-MM-DD')
      }

      getUpdatedAt (date) {
        return date.format('YYYY-MM-DD')
      }
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post).pivotModel(PostUser).withPivot(['created_at', 'updated_at'])
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const userResult = await ioc.use('Database').collection('users').insert({ username: 'virk' })
    const postResult = await ioc.use('Database').collection('posts').insert({ title: 'Adonis 101' })

    await ioc.use('Database').collection('post_user').insert({
      post_id: postResult.insertedIds[0],
      user_id: userResult.insertedIds[0],
      is_published: true,
      created_at: new Date(),
      updated_at: new Date()
    })

    const user = await User.query().with('posts').first()
    const json = user.toJSON()
    assert.isTrue(moment(json.posts[0].pivot.created_at, 'YYYY-MM-DD', true).isValid())
    assert.isTrue(moment(json.posts[0].pivot.updated_at, 'YYYY-MM-DD', true).isValid())
  })

  test('save related model', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const userResult = await ioc.use('Database').collection('users').insert({ username: 'virk' })
    const user = await User.find(userResult.insertedIds[0])

    const post = new Post()
    post.title = 'Adonis 101'

    await user.posts().save(post)
    assert.isTrue(post.$persisted)
    assert.equal(String(post.getRelated('pivot').post_id), String(post._id))
    assert.equal(String(post.getRelated('pivot').user_id), String(user._id))

    const pivotValues = await ioc.use('Database').collection('post_user').find()
    assert.lengthOf(pivotValues, 1)
    assert.equal(String(pivotValues[0].post_id), String(post._id))
    assert.equal(String(pivotValues[0].user_id), String(user._id))
    assert.isUndefined(pivotValues[0].created_at)
    assert.isUndefined(pivotValues[0].updated_at)
  })

  test('save related model with timestamps', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post).withTimestamps()
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const userResult = await ioc.use('Database').collection('users').insert({ username: 'virk' })
    const user = await User.find(userResult.insertedIds[0])

    const post = new Post()
    post.title = 'Adonis 101'

    await user.posts().save(post)
    assert.isTrue(post.$persisted)
    assert.equal(String(post.getRelated('pivot').post_id), String(post._id))
    assert.equal(String(post.getRelated('pivot').user_id), String(user._id))

    const pivotValues = await ioc.use('Database').collection('post_user').find()
    assert.lengthOf(pivotValues, 1)
    assert.equal(String(pivotValues[0].post_id), String(post._id))
    assert.equal(String(pivotValues[0].user_id), String(user._id))
    assert.isTrue(moment(pivotValues[0].created_at, 'YYYY-MM-DD HH:mm:ss', true).isValid())
    assert.isTrue(moment(pivotValues[0].updated_at, 'YYYY-MM-DD HH:mm:ss', true).isValid())
  })

  test('execute setters when pivotModel in play', async (assert) => {
    class Post extends Model {
    }

    class PostUser extends Model {
      static get collection () {
        return 'post_user'
      }

      setCreatedAt () {
        return moment().format('YYYY-MM-DD')
      }
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post).pivotModel(PostUser)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()
    PostUser._bootIfNotBooted()

    const userResult = await ioc.use('Database').collection('users').insert({ username: 'virk' })
    const user = await User.find(userResult.insertedIds[0])

    const post = new Post()
    post.title = 'Adonis 101'

    await user.posts().save(post)
    assert.isTrue(post.$persisted)
    assert.equal(String(post.getRelated('pivot').post_id), String(post._id))
    assert.equal(String(post.getRelated('pivot').user_id), String(user._id))

    const pivotValues = await ioc.use('Database').collection('post_user').find()
    assert.lengthOf(pivotValues, 1)
    assert.equal(String(pivotValues[0].post_id), String(post._id))
    assert.equal(String(pivotValues[0].user_id), String(user._id))
    assert.isTrue(moment(pivotValues[0].created_at, 'YYYY-MM-DD', true).isValid())
    assert.isTrue(moment(pivotValues[0].updated_at, 'YYYY-MM-DD HH:mm:ss', true).isValid())
  })

  test('save pivot values to database', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const userResult = await ioc.use('Database').collection('users').insert({ username: 'virk' })
    const user = await User.find(userResult.insertedIds[0])

    const post = new Post()
    post.title = 'Adonis 101'

    await user.posts().save(post, (pivotModel) => (pivotModel.is_published = true))
    assert.isTrue(post.$persisted)
    assert.equal(String(post.getRelated('pivot').post_id), String(post._id))
    assert.equal(String(post.getRelated('pivot').user_id), String(user._id))
    assert.equal(post.getRelated('pivot').is_published, true)

    const pivotValues = await ioc.use('Database').collection('post_user').find()
    assert.lengthOf(pivotValues, 1)
    assert.equal(String(pivotValues[0].post_id), String(post._id))
    assert.equal(String(pivotValues[0].user_id), String(user._id))
    assert.equal(pivotValues[0].is_published, 1)
  })

  test('persist parent model to db is not persisted already', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const user = new User()
    user.username = 'virk'
    assert.isFalse(user.$persisted)

    const post = new Post()
    post.title = 'Adonis 101'
    assert.isFalse(post.$persisted)
    await user.posts().save(post)
    assert.isTrue(post.$persisted)
    assert.isTrue(user.$persisted)

    const pivotCount = await ioc.use('Database').collection('post_user').count()
    const usersCount = await ioc.use('Database').collection('users').count()
    const postsCount = await ioc.use('Database').collection('posts').count()
    assert.equal(pivotCount, helpers.formatNumber(1))
    assert.equal(usersCount, helpers.formatNumber(1))
    assert.equal(postsCount, helpers.formatNumber(1))
  })

  test('attach existing model', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const user = new User()
    user.username = 'virk'
    await user.save()
    const postId = new ObjectID()
    await user.posts().attach(postId)
    const pivotValues = await ioc.use('Database').collection('post_user').find()
    assert.lengthOf(pivotValues, 1)
    assert.equal(String(pivotValues[0].post_id), String(postId))
    assert.equal(String(pivotValues[0].user_id), String(user._id))
  })

  test('attach existing model with pivot values', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const user = new User()
    user.username = 'virk'
    await user.save()
    const postId = new ObjectID()
    await user.posts().attach(postId, (pivotModel) => (pivotModel.is_published = true))
    const pivotValues = await ioc.use('Database').collection('post_user').find()
    assert.lengthOf(pivotValues, 1)
    assert.equal(String(pivotValues[0].post_id), String(postId))
    assert.equal(String(pivotValues[0].user_id), String(user._id))
    assert.equal(pivotValues[0].is_published, 1)
  })

  test('attach multiple existing models', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const user = new User()
    user.username = 'virk'
    await user.save()
    const postId1 = new ObjectID()
    const postId2 = new ObjectID()
    const postId3 = new ObjectID()
    await user.posts().attach([postId1, postId2, postId3])
    const pivotValues = await ioc.use('Database').collection('post_user').find()
    assert.lengthOf(pivotValues, 3)
    assert.equal(String(pivotValues[0].post_id), String(postId1))
    assert.equal(String(pivotValues[0].user_id), String(user._id))
    assert.equal(String(pivotValues[1].post_id), String(postId2))
    assert.equal(String(pivotValues[1].user_id), String(user._id))
    assert.equal(String(pivotValues[2].post_id), String(postId3))
    assert.equal(String(pivotValues[2].user_id), String(user._id))
  })

  test('attach multiple existing models with pivotValues', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const user = new User()
    user.username = 'virk'
    await user.save()
    const postId1 = new ObjectID()
    const postId2 = new ObjectID()
    const postId3 = new ObjectID()
    await user.posts().attach([postId1, postId2, postId3], (pivotModel) => (pivotModel.is_published = true))
    const pivotValues = await ioc.use('Database').collection('post_user').find()
    assert.lengthOf(pivotValues, 3)
    assert.equal(String(pivotValues[0].post_id), String(postId1))
    assert.equal(String(pivotValues[0].user_id), String(user._id))
    assert.equal(pivotValues[0].is_published, 1)
    assert.equal(String(pivotValues[1].post_id), String(postId2))
    assert.equal(String(pivotValues[1].user_id), String(user._id))
    assert.equal(pivotValues[1].is_published, 1)
    assert.equal(String(pivotValues[2].post_id), String(postId3))
    assert.equal(String(pivotValues[2].user_id), String(user._id))
    assert.equal(pivotValues[2].is_published, 1)
  })

  test('save many related rows with different pivot values', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const user = new User()
    user.username = 'virk'

    const post = new Post()
    post.title = 'Adonis 101'

    const lucid = new Post()
    lucid.title = 'Lucid 101'

    await user.posts().saveMany([post, lucid], (pivotModel) => (pivotModel.is_published = true))
    assert.isTrue(user.$persisted)
    assert.isTrue(post.$persisted)
    assert.equal(String(post.getRelated('pivot').post_id), String(post._id))
    assert.equal(String(post.getRelated('pivot').user_id), String(user._id))
    assert.equal(post.getRelated('pivot').is_published, true)

    assert.isTrue(lucid.$persisted)
    assert.equal(String(lucid.getRelated('pivot').post_id), String(lucid._id))
    assert.equal(String(lucid.getRelated('pivot').user_id), String(user._id))
    assert.equal(lucid.getRelated('pivot').is_published, true)
  })

  test('create related row', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const user = new User()
    user.username = 'virk'

    const post = await user.posts().create({ title: 'Adonis 101' })
    assert.isTrue(post.$persisted)
    assert.equal(post.title, 'Adonis 101')
    assert.equal(String(post.getRelated('pivot').post_id), String(post._id))
    assert.equal(String(post.getRelated('pivot').user_id), String(user._id))
  })

  test('create many related rows', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const user = new User()
    user.username = 'virk'

    const posts = await user.posts().createMany([{ title: 'Adonis 101' }, { title: 'Lucid 101' }])
    assert.isTrue(posts[0].$persisted)
    assert.equal(String(posts[0].getRelated('pivot').user_id), String(user._id))

    assert.isTrue(posts[1].$persisted)
    assert.equal(String(posts[1].getRelated('pivot').user_id), String(user._id))
  })

  test('attach should not attach duplicate records', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const user = await User.create({ username: 'virk' })
    const post = await Post.create({ title: 'Adonis 101' })
    await user.posts().attach(post._id)
    await user.posts().attach(post._id)
    const pivotValues = await ioc.use('Database').collection('post_user').find()
    assert.lengthOf(pivotValues, 1)
  })

  test('attach should grow the private pivotInstances array', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const user = await User.create({ username: 'virk' })
    const post = await Post.create({ title: 'Adonis 101' })
    const userPosts = user.posts()
    await userPosts.attach(post.id)
    assert.lengthOf(userPosts._existingPivotInstances, 1)
    const cachedPost = await userPosts.attach(post.id)
    assert.deepEqual(cachedPost[0], userPosts._existingPivotInstances[0])
    assert.lengthOf(userPosts._existingPivotInstances, 1)
    const pivotValues = await ioc.use('Database').collection('post_user').find()
    assert.lengthOf(pivotValues, 1)
  })

  test('attach look in the database and ignore existing relations', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post).withPivot('is_published')
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const user = await User.create({ username: 'virk' })
    const post = await Post.create({ title: 'Adonis 101' })
    await ioc.use('Database').collection('post_user').insert({ post_id: post._id, user_id: user._id })
    const userPost = user.posts()
    await userPost.attach(post._id)
    const pivotValues = await ioc.use('Database').collection('post_user').find()
    assert.lengthOf(pivotValues, 1)
  })

  test('attach using explicit pivotModel', async (assert) => {
    class Post extends Model {
    }

    class PostUser extends Model {
      static get collection () {
        return 'post_user'
      }
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post).pivotModel(PostUser)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()
    PostUser._bootIfNotBooted()

    const user = await User.create({ username: 'virk' })
    const post = await Post.create({ title: 'Adonis 101' })
    await ioc.use('Database').collection('post_user').insert({ post_id: post._id, user_id: user._id })
    await ioc.use('Database').collection('post_user').find()
    const userPost = user.posts()
    await userPost.attach(post._id)
    assert.instanceOf(userPost._existingPivotInstances[0], PostUser)
    const pivotValues = await ioc.use('Database').collection('post_user').find()
    assert.lengthOf(pivotValues, 1)
  })

  test('save should not attach existing relations', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const user = await User.create({ username: 'virk' })
    const post = await Post.create({ title: 'Adonis 101' })
    await ioc.use('Database').collection('post_user').insert({ post_id: post._id, user_id: user._id })
    await ioc.use('Database').collection('post_user').find()
    await user.posts().save(post)
    const postsCount = await ioc.use('Database').collection('posts').find()
    const pivotCount = await ioc.use('Database').collection('post_user').find()
    assert.lengthOf(postsCount, 1)
    assert.lengthOf(pivotCount, 1)
  })

  test('detach existing relations', async (assert) => {
    class Post extends Model {
    }

    class PostUser extends Model {
      static get collection () {
        return 'post_user'
      }
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post).pivotModel(PostUser)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()
    PostUser._bootIfNotBooted()

    const user = await User.create({ username: 'virk' })
    const post = await Post.create({ title: 'Adonis 101' })
    const userPost = user.posts()
    await userPost.attach(post._id)
    await userPost.detach()
    const postsCount = await ioc.use('Database').collection('posts').find()
    const pivotCount = await ioc.use('Database').collection('post_user').find()
    assert.lengthOf(postsCount, 1)
    assert.lengthOf(pivotCount, 0)
    assert.lengthOf(userPost._existingPivotInstances, 0)
  })

  test('detach only specific existing relations', async (assert) => {
    class Post extends Model {
    }

    class PostUser extends Model {
      static get collection () {
        return 'post_user'
      }
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post).pivotModel(PostUser)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()
    PostUser._bootIfNotBooted()

    const user = await User.create({ username: 'virk' })
    const post1 = await Post.create({ title: 'Adonis 101' })
    const post2 = await Post.create({ title: 'Lucid 101' })
    const userPost = user.posts()
    await userPost.attach([post1._id, post2._id])
    await userPost.detach(post1._id)
    const postsCount = await ioc.use('Database').collection('posts').find()
    const pivotCount = await ioc.use('Database').collection('post_user').find()
    assert.lengthOf(postsCount, 2)
    assert.lengthOf(pivotCount, 1)
    assert.lengthOf(userPost._existingPivotInstances, 1)
    assert.equal(String(userPost._existingPivotInstances[0].post_id), String(post2._id))
  })

  test('delete existing relation', async (assert) => {
    class Post extends Model {
    }

    class PostUser extends Model {
      static get collection () {
        return 'post_user'
      }
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post).pivotModel(PostUser)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()
    PostUser._bootIfNotBooted()

    const user = await User.create({ username: 'virk' })
    const post1 = await Post.create({ title: 'Adonis 101' })
    const post2 = await Post.create({ title: 'Lucid 101' })
    const userPost = user.posts()
    await userPost.attach([post1._id, post2._id])
    await user.posts().where('_id', post1._id).delete()
    const postsCount = await ioc.use('Database').collection('posts').find()
    const postUserCount = await ioc.use('Database').collection('post_user').find()
    assert.lengthOf(postsCount, 1)
    assert.lengthOf(postUserCount, 1)
  })

  test('update existing relation', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const user = await User.create({ username: 'virk' })
    const post1 = await Post.create({ title: 'Adonis 101' })
    const post2 = await Post.create({ title: 'Lucid 101' })
    const userPost = user.posts()
    await userPost.attach([post1._id, post2._id])
    await user.posts().where('_id', post1._id).update({ title: 'Adonis 102' })
    const post = await ioc.use('Database').collection('posts').where('_id', post1._id).find()
    assert.equal(post[0].title, 'Adonis 102')
  })

  test('throw exception when saveMany doesn\'t  receives an array', async (assert) => {
    assert.plan(1)

    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const user = new User()
    user.username = 'virk'

    const post = new Post()
    post.title = 'Adonis 101'

    try {
      await user.posts().saveMany(post)
    } catch ({ message }) {
      assert.equal(message, 'E_INVALID_PARAMETER: belongsToMany.saveMany expects an array of related model instances instead received object')
    }
  })

  test('throw exception when createMany doesn\'t  receives an array', async (assert) => {
    assert.plan(1)

    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const user = new User()
    user.username = 'virk'

    try {
      await user.posts().createMany({})
    } catch ({ message }) {
      assert.equal(message, 'E_INVALID_PARAMETER: belongsToMany.createMany expects an array of related model instances instead received object')
    }
  })

  test('select few fields from related model when eagerloading', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const user = await User.create({ username: 'virk' })
    const post = await Post.create({ title: 'Adonis 101' })
    const userPost = user.posts()
    await userPost.attach(post._id)

    await User.query().with('posts', (builder) => {
      builder.select('title')
    }).fetch()
  })

  test('select few fields from related model', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    User._bootIfNotBooted()
    Post._bootIfNotBooted()

    const user = await User.create({ username: 'virk' })
    const post = await Post.create({ title: 'Adonis 101' })
    const userPost = user.posts()
    await userPost.attach(post._id)

    await user.posts().select('title').fetch()
  })
})
