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

test.group('Relations | Has Many Through - Has Many ', (group) => {
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
    await ioc.use('Adonis/Src/Database').collection('countries').delete()
    await ioc.use('Adonis/Src/Database').collection('users').delete()
    await ioc.use('Adonis/Src/Database').collection('posts').delete()
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

  test('fetch related row', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.hasMany(Post)
      }
    }

    class Country extends Model {
      posts () {
        return this.manyThrough(User, 'posts')
      }
    }

    User._bootIfNotBooted()
    Country._bootIfNotBooted()
    Post._bootIfNotBooted()

    const rsCountry = await ioc.use('Database').collection('countries').insert({ name: 'India' })
    const rsUser = await ioc.use('Database').collection('users').insert({ country_id: rsCountry.insertedIds[0], username: 'virk' })
    await ioc.use('Database').collection('posts').insert({ user_id: rsUser.insertedIds[0], title: 'Adonis 101' })

    const country = await Country.find(rsCountry.insertedIds[0])
    const posts = await country.posts().fetch()
    assert.instanceOf(posts, VanillaSerializer)
    assert.equal(posts.size(), 1)
  })

  test('eagerload related rows', async (assert) => {
    class Post extends Model {
    }

    class User extends Model {
      posts () {
        return this.hasMany(Post)
      }
    }

    class Country extends Model {
      posts () {
        return this.manyThrough(User, 'posts')
      }
    }

    User._bootIfNotBooted()
    Country._bootIfNotBooted()
    Post._bootIfNotBooted()

    const rsCountry = await ioc.use('Database').collection('countries').insert({ name: 'India' })
    const rsUser = await ioc.use('Database').collection('users').insert({ country_id: rsCountry.insertedIds[0], username: 'virk' })
    await ioc.use('Database').collection('posts').insert({ user_id: rsUser.insertedIds[0], title: 'Adonis 101' })

    const countries = await Country.query().with('posts', (builder) => {
      builder.selectThrough('_id')
    }).fetch()

    assert.equal(countries.size(), 1)
    const country = countries.first()

    assert.instanceOf(country.getRelated('posts'), VanillaSerializer)
    assert.equal(country.getRelated('posts').size(), 1)
  })
})

test.group('Relations | Has Many Through - Belongs To', (group) => {
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
    await ioc.use('Adonis/Src/Database').collection('countries').delete()
    await ioc.use('Adonis/Src/Database').collection('users').delete()
    await ioc.use('Adonis/Src/Database').collection('profiles').delete()
  })

  group.after(async () => {
    await helpers.dropCollections(ioc.use('Adonis/Src/Database'))
    try {
      await fs.remove(path.join(__dirname, './tmp'))
    } catch (error) {
      if (process.platform !== 'win32' || error.code !== 'EBUSY') {
        throw error
      }
    }
  }).timeout(0)

  test('select related rows', async (assert) => {
    class User extends Model {
    }

    class Profile extends Model {
      user () {
        return this.belongsTo(User)
      }
    }

    class Country extends Model {
      users () {
        return this.manyThrough(Profile, 'user')
      }
    }

    User._bootIfNotBooted()
    Country._bootIfNotBooted()
    Profile._bootIfNotBooted()

    const rsCountry = await ioc.use('Database').collection('countries').insert([{ name: 'India' }, { name: 'Uk' }])

    const rsUser = await ioc.use('Database').collection('users').insert([
      { username: 'virk' },
      { username: 'nikk' }
    ])

    await ioc.use('Database').collection('profiles').insert([
      { user_id: rsUser.insertedIds[0], profile_name: 'Virk', country_id: rsCountry.insertedIds[0] },
      { user_id: rsUser.insertedIds[0], profile_name: 'Virk', country_id: rsCountry.insertedIds[1] },
      { user_id: rsUser.insertedIds[1], profile_name: 'Nikk', country_id: rsCountry.insertedIds[0] }
    ])

    const india = await Country.find(rsCountry.insertedIds[0])
    const indianUsers = await india.users().fetch()
    assert.equal(indianUsers.size(), 2)
    assert.deepEqual(indianUsers.rows.map((user) => user.username), ['virk', 'nikk'])
    const uk = await Country.find(rsCountry.insertedIds[1])
    const ukUsers = await uk.users().fetch()
    assert.equal(ukUsers.size(), 1)
    assert.deepEqual(ukUsers.rows.map((user) => user.username), ['virk'])
  })

  test('eagerload related rows', async (assert) => {
    class User extends Model {
    }

    class Profile extends Model {
      user () {
        return this.belongsTo(User)
      }
    }

    class Country extends Model {
      users () {
        return this.manyThrough(Profile, 'user')
      }

      profiles () {
        return this.hasMany(Profile)
      }
    }

    User._bootIfNotBooted()
    Country._bootIfNotBooted()
    Profile._bootIfNotBooted()

    const rsCountry = await ioc.use('Database').collection('countries').insert([{ name: 'India' }, { name: 'Uk' }])

    const rsUser = await ioc.use('Database').collection('users').insert([
      { username: 'virk' },
      { username: 'nikk' }
    ])

    await ioc.use('Database').collection('profiles').insert([
      { user_id: rsUser.insertedIds[0], profile_name: 'Virk', country_id: rsCountry.insertedIds[0] },
      { user_id: rsUser.insertedIds[0], profile_name: 'Virk', country_id: rsCountry.insertedIds[1] },
      { user_id: rsUser.insertedIds[1], profile_name: 'Nikk', country_id: rsCountry.insertedIds[0] }
    ])

    const countries = await Country.query().with('users').with('profiles').sort('_id').fetch()
    assert.equal(countries.size(), 2)
    assert.equal(countries.first().getRelated('users').size(), 2)
    assert.equal(countries.last().getRelated('users').size(), 1)
  })
})

test.group('Relations | Has Many Through - Belongs To Many', (group) => {
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
    await ioc.use('Adonis/Src/Database').collection('categories').delete()
    await ioc.use('Adonis/Src/Database').collection('sections').delete()
    await ioc.use('Adonis/Src/Database').collection('posts').delete()
    await ioc.use('Adonis/Src/Database').collection('post_section').delete()
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

  test('selected related rows', async (assert) => {
    class Post extends Model {
    }

    class Section extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    class Category extends Model {
      posts () {
        return this.manyThrough(Section, 'posts')
      }
    }

    Category._bootIfNotBooted()
    Section._bootIfNotBooted()
    Post._bootIfNotBooted()

    const rsCategory = await ioc.use('Database').collection('categories').insert([{ name: 'Sql' }, { name: 'Javascript' }])
    const rsSection = await ioc.use('Database').collection('sections').insert([
      { name: 'Loops', category_id: rsCategory.insertedIds[1] },
      { name: 'Conditionals', category_id: rsCategory.insertedIds[1] }
    ])
    const rsPost = await ioc.use('Database').collection('posts').insert({ title: 'For each loop' })
    await ioc.use('Database').collection('post_section').insert({ post_id: rsPost.insertedIds[0], section_id: rsSection.insertedIds[0] })

    const js = await Category.find(rsCategory.insertedIds[1])
    const posts = await js.posts().fetch()
    assert.equal(posts.size(), 1)
    assert.equal(posts.rows[0].title, 'For each loop')
  })

  test('eagerload related rows', async (assert) => {
    class Post extends Model {
    }

    class Section extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    class Category extends Model {
      posts () {
        return this.manyThrough(Section, 'posts')
      }
    }

    Category._bootIfNotBooted()
    Section._bootIfNotBooted()
    Post._bootIfNotBooted()

    const rsCategory = await ioc.use('Database').collection('categories').insert([{ name: 'Sql' }, { name: 'Javascript' }])

    const rsSection = await ioc.use('Database').collection('sections').insert([
      { name: 'Loops', category_id: rsCategory.insertedIds[1] },
      { name: 'Conditionals', category_id: rsCategory.insertedIds[1] },
      { name: 'Transactions', category_id: rsCategory.insertedIds[0] }
    ])

    const rsPost = await ioc.use('Database').collection('posts').insert([{ title: 'For each loop' }, { title: 'Transactions 101' }])

    await ioc.use('Database').collection('post_section').insert([
      { post_id: rsPost.insertedIds[0], section_id: rsSection.insertedIds[0] },
      { post_id: rsPost.insertedIds[1], section_id: rsSection.insertedIds[2] }
    ])

    const categories = await Category.query().with('posts').orderBy('id', 'asc').fetch()
    assert.instanceOf(categories, VanillaSerializer)
    assert.equal(categories.size(), 2)
    assert.equal(categories.last().getRelated('posts').size(), 1)
    assert.equal(categories.last().getRelated('posts').toJSON()[0].title, 'For each loop')
    assert.equal(categories.first().getRelated('posts').size(), 1)
    assert.equal(categories.first().getRelated('posts').toJSON()[0].title, 'Transactions 101')
  })

  test('add constraints when eager loading', async (assert) => {
    class Post extends Model {
    }

    class Section extends Model {
      posts () {
        return this.belongsToMany(Post)
      }
    }

    class Category extends Model {
      posts () {
        return this.manyThrough(Section, 'posts')
      }
    }

    Category._bootIfNotBooted()
    Section._bootIfNotBooted()
    Post._bootIfNotBooted()

    const rsCategory = await ioc.use('Database').collection('categories').insert([{ name: 'Sql' }, { name: 'Javascript' }])

    const rsSection = await ioc.use('Database').collection('sections').insert([
      { name: 'Loops', category_id: rsCategory.insertedIds[1], is_active: true },
      { name: 'Conditionals', category_id: rsCategory.insertedIds[1], is_active: true },
      { name: 'Transactions', category_id: rsCategory.insertedIds[0] }
    ])

    const rsPost = await ioc.use('Database').collection('posts').insert([{ title: 'For each loop' }, { title: 'Transactions 101' }])

    await ioc.use('Database').collection('post_section').insert([
      { post_id: rsPost.insertedIds[0], section_id: rsSection.insertedIds[0] },
      { post_id: rsPost.insertedIds[1], section_id: rsSection.insertedIds[2] }
    ])

    const categories = await Category.query().with('posts', (builder) => {
      builder.whereThrough('is_active', true)
    }).fetch()

    assert.instanceOf(categories, VanillaSerializer)
    assert.equal(categories.size(), 2)
    assert.equal(categories.last().getRelated('posts').size(), 1)
    assert.equal(categories.last().getRelated('posts').toJSON()[0].title, 'For each loop')
    assert.equal(categories.first().getRelated('posts').size(), 0)
  })
})
