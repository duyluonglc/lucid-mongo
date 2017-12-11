# Lucid Mongo

lucid-mongo is a mongo query builder and ORM. It also has support for database migrations, seeds and factories as @adonis/lucid.

<a target='_blank' rel='nofollow' href='https://app.codesponsor.io/link/eirsozktUrMNsBqxuDUzA528/duyluonglc/lucid-mongo'>
  <img alt='Sponsor' width='888' height='68' src='https://app.codesponsor.io/embed/eirsozktUrMNsBqxuDUzA528/duyluonglc/lucid-mongo.svg' />
</a>

[![Version](https://img.shields.io/npm/v/lucid-mongo.svg)](https://www.npmjs.com/package/lucid-mongo)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](http://standardjs.com/)
[![Build Status](https://travis-ci.org/duyluonglc/lucid-mongo.svg?branch=develop)](https://travis-ci.org/duyluonglc/lucid-mongo)
[![Coverage Status](https://img.shields.io/coveralls/duyluonglc/lucid-mongo/develop.svg)](https://coveralls.io/github/duyluonglc/lucid-mongo?branch=develop)
[![Greenkeeper badge](https://badges.greenkeeper.io/duyluonglc/lucid-mongo.svg)](https://greenkeeper.io/)
> :pray: This repository is base on @adonis/lucid and only work with mongodb.
## Features?

Apart from being just a query builder, lucid-mongo has following features.

1. ES6 classes based data Models.
2. Model Hooks
3. Associations
4. Serializers ( Vanilla and JSON API )
5. Migrations
6. Factories and Seeds

Lucid-mongo version 2.0 now can be used as standalone or used with AdonisJS
You can learn more about AdonisJS and all of its awesomeness on http://adonisjs.com :evergreen_tree:

You can see example with AdonisJS framework here [adonis-mongodb-boilerplate](https://github.com/duyluonglc/adonis-mongodb-boilerplate)

## Node/OS Target

This repo/branch is supposed to run fine on all major OS platforms and targets `Node.js >=7.0`

## <a name="getting-started"></a>Installation

## Use with AdonisJS framework

Install npm using `adonis` command.

```js
adonis install lucid-mongo
```

### Breaking update
| Adonis version  | Lucid Mongo version |
| ------------- | ------------- |
| 3.x.x  | 1.x.x  |
| 4.x.x  | 2.x.x  |

[See the doc of v1.x here](https://github.com/duyluonglc/lucid-mongo/blob/1.x/README.md)

Make sure to register the lucid provider to make use of `Database` and `LucidMongo` models. The providers are registered inside `start/app.js`

```js
const providers = [
  // ...
  'lucid-mongo/providers/LucidMongoProvider'
]

const aceProviders = [
  // ...
  'lucid-mongo/providers/MigrationsProvider'
]
```
the config automatic create to `config/database.js` file

```js
module.exports = {

  /*
  |--------------------------------------------------------------------------
  | Default Connection
  |--------------------------------------------------------------------------
  |
  | Connection defines the default connection settings to be used while
  | interacting with Mongodb databases.
  |
  */
  connection: Env.get('DB_CONNECTION', 'mongodb'),
  /*-------------------------------------------------------------------------*/

  mongodb: {
    client: 'mongodb',
    connection: {
      host: Env.get('DB_HOST', 'localhost'),
      port: Env.get('DB_PORT', 27017),
      user: Env.get('DB_USER', 'root'),
      password: Env.get('DB_PASSWORD', ''),
      database: Env.get('DB_DATABASE', 'adonis'),
      auth: {
         source: Env.get('DB_AUTH_SOURCE', ''),
         mechanism: Env.get('DB_AUTH_MECHANISM', '')
      },
      ssl: ('DB_SSL, '')
    }
  }

}
```

## Use standalone (still in development)
To setup this package as standalone package

```bash
$ npm i --save lucid-mongo
```

```js
const config = {
  connection: 'mongodb',
  mongodb: {
    client: 'mongodb',
    connection: {
      host: 'localhost',
      port: 27017,
      user: 'my_user',
      password: 'my_password',
      database: 'my_database'
    }
  }
}
```
```js
// Models/User.js
const { Models, Model } = require('./')(config)

class User extends Model {

}

Models.add('App/Model/User', User)

module.exports = User
```
```js
// index.js
async function test () {

  const users = await User.where({ isActive: false }).fetch()

  console.log(users.toJSON())
}

test()

```

### Query

```js
const users =  await User.all()

const users =  await User.where('name', 'peter').fetch()

const users =  await User.where({ name: 'peter' })
  .limit(10).skip(20).fetch()

const users =  await User.where({
  or: [
    { gender: 'female', age: { gte: 20 } },
    { gender: 'male', age: { gte: 22 } }
  ]
}).fetch()

const user =  await User
  .where('name').eq('peter')
  .where('age').gt(18).lte(60)
  .sort('-age')
  .first()

const users =  await User
  .where({ age: { gte: 18 } })
  .sort({age: -1})
  .fetch()

const users =  await User
  .where('age', '>=', 18)
  .fetch()

const users =  await User
  .where('age').gt(18)
  .paginate(2, 100)

const users =  await User.where(function() {
  this.where('age', '>=', 18)
}).fetch()


// to query geo near you need declare field type as geometry and add 2d or 2dsphere index in migration file
const images = await Image.where({location: {near: {lat: 1, lng: 1}, maxDistance: 5000}}).fetch()

const images = await Image.where({location: {nearSphere: {lat: 1, lng: 1}, maxDistance: 500}}).fetch()
```
[More Documentation of mquery](https://github.com/aheckmann/mquery)

### Aggregation
```js
  const count = await Customer.count()

  const count = await Customer
    .where({ invited: { $exist: true } })
    .count('position')

  const max = await Employee.max('age')

  const total = await Employee
    .where(active, true)
    .sum('salary', 'department_id')

  const avg = await Employee
    .where(active, true)
    .avg('salary', { department: 'department_id', role: '$role_id' })
```

### Relations
This package support relations like adonis-lucid:
- hasOne
- belongsTo
- hasMany
- hasManyThrough
- belongsToMany

[More Documentation of adonis relationships](http://adonisjs.com/docs/3.2/relationships)

mongodb has no join query so this package has no query like: `has`, `whereHas`, `doesntHave`, `whereDoesntHave`

### Addition relations
1. `morphMany:` A model can belong to more than one other model, on a single association. For example, you might have a Picture model that belongs to either an Author model or a Reader model
```js
class Author extends Model {

  pictures () {
    return this.morphMany('App/Model/Picture', 'pictureableType', 'pictureableId')
  }

}

class Reader extends Model {

  pictures () {
    return this.morphMany('App/Model/Picture', 'pictureableType', 'pictureableId')
  }

}

class Picture extends Model {

  imageable () {
    return this.morphTo('App/Model', 'pictureable_type', 'pictureable_id')
  }

}
```
2. `embedsOne:` EmbedsOne is used to represent a model that embeds another model, for example, a Customer embeds one billingAddress.
```js
class Customer extends Model {

  billingAddress () {
    return this.embedsOne('App/Model/Address', '_id', 'billingAddress')
  }

}
```
3. `embedsMany:` Use an embedsMany relation to indicate that a model can embed many instances of another model. For example, a Customer can have multiple email addresses and each email address is a complex object that contains label and address.
```js
class Customer extends Model {

  emails () {
    return this.embedsMany('App/Model/Email', '_id', 'emails')
  }

}
```
4. `referMany:` Population is the process of automatically replacing the specified paths in the document with document(s) from other collection(s)
```js
class Bill extends Model {

  items () {
    return this.referMany('App/Model/Item', '_id', 'items')
  }

}
```

### Query relationships

```js
  const user = await User.with('emails').find(1)

  const user = await User.with('emails', query => query.where({ status: 'verified' })).find(1)

  const user = await User.with(['emails', 'phones']).find(1)

  const user = await User.with({
    email: {where: {verified: true}, sort: '-age'}
  }).find(1)

  const user = await User.with({email: query => {
    query.where(active, true)
  }}).find(1)

```

### Query logging
To show query logs run this command:
- Linux, MacOS `DEBUG=mquery npm run dev`
- Windows `setx DEBUG mquery && npm run dev`

### Migration
Current only support create, drop, rename collection and index
```js
up () {

  this.create('articles', (collection) => {
    collection.index('title_index', {title: 1})
  })

  this.collection('users', (collection) => {
    collection.index('email_index', {email: 1}, {unique: true})
  })

  this.collection('image', (collection) => {
    collection.index('location_index', {location: '2dsphere'}, {'2dsphereIndexVersion': 2})
  })

  this.rename('articles', 'posts')

  this.create('posts', (collection) => {
    collection.dropIndex('title_index')
  })

  this.drop('articles', 'posts')
}
```

### Field type
> Type of `mongodb.ObjectID`
The objectId fields will be converted to mongodb.ObjectID before save to db.
```js
class Article extends LucidMongo {
  static get objectIdFields() { return ['_id', 'categoryId'] } //default return ['_id']
}
```
The where query conditions will be converted to objectId too
```js
const article = await Article.find('58ccb403f895502b84582c63')
const articles = await Article
  .where({
    department_id: { in: ['58ccb403f895502b84582c63', '58ccb403f895502b84582c63'] }
  })
  .fetch()
```

> Type of `date`
```js
class Staff extends LucidMongo {
  static get dateFields() { return ['dob'] }
}
```
The field declare as date will be converted to moment js object after get from db
```js
const staff = await Staff.first()
const yearAgo = staff.dob.fromNow()
```
You can set attribute of model as moment js object, field will be converted to date before save to db
```js
staff.dob = moment(request.input('dob'))
```
The where query conditions will be converted to date too
```js
const user = await User
  .where({ created_at: { gte: '2017-01-01' } })
  .fetch()
```
Date type is UTC timezone
> Type of `geometry`
```js
class Image extends LucidMongo {
  static get geoFields() { return ['location'] }
}
```
When declare field type as geometry the field will be transformed to geoJSON type

```js
const image = await Image.create({
  fileName: fileName,
  location: {lat: 1, lng: 1}
})
```
Result:
```json
{ "type" : "Point", "coordinates" : [ 1, 1 ] }
```
After get from db it will be retransformed to
```js
{lat: 1, lng: 1}
```

### Use query builder
```js
  const Database = use('Database')
  const db = await Database.connection('mongodb')

  const users = await db.collection('users').find()

  const phone = await db.collection('phones')
    .where({userId: '58ccb403f895502b84582c63'}).findOne()

  const count = await db.collection('user')
    .where({active: true}).count()
```

### <a name="contribution-guidelines"></a>Contribution Guidelines

In favor of active development we accept contributions for everyone. You can contribute by submitting a bug, creating pull requests or even improving documentation.
