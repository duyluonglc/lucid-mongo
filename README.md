# AdonisJS Lucid MongoDB

> **NB - WORK IN PROGRESS**

[![Version](https://img.shields.io/npm/v/adonis-lucid-mongodb.svg?style=flat-square)](https://www.npmjs.com/package/adonis-lucid-mongodb)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](http://standardjs.com/)
[![Build Status](https://travis-ci.org/duyluonglc/lucid-mongo.svg?branch=1.x)](https://travis-ci.org/duyluonglc/lucid-mongo)
[![Coverage Status](https://img.shields.io/coveralls/duyluonglc/lucid-mongo/1.x.svg?style=flat-square)](https://coveralls.io/github/duyluonglc/lucid-mongo?branch=1.x)
[![Greenkeeper badge](https://badges.greenkeeper.io/duyluonglc/lucid-mongo.svg)](https://greenkeeper.io/)

> :pray: This repository is base on adonis-lucid. This package only work with mongodb.

### Breaking update
Version 2.x was published to npm
| Adonis version  | Lucid Mongo version |
| ------------- | ------------- |
| 3.x.x  | 1.x.x  |
| 4.x.x  | 2.x.x  |

Adonis-lucid-mongodb is a mongo query builder and ODM for Adonis framework. It also has support for database migrations, seeds and factories as Adonis-lucid.

You can learn more about AdonisJS and all of its awesomeness on http://adonisjs.com :evergreen_tree:

You can see example here [adonis-mongodb-boilerplate](https://github.com/duyluonglc/adonis-mongodb-boilerplate)

> Note: If you decided use this package you need replace all setting of adonis-lucid by this package. See [install](https://github.com/duyluonglc/adonis-lucid-mongodb#installation) steps for more detail

## Usage
The usage of LucidMongo is similar to Lucid

[Official Documentation of Lucid here](http://adonisjs.com/docs/2.0/installation)

### Query

```js
const users =  yield User.all()

const users =  yield User.where('name', 'peter').fetch()

const users =  yield User.where({name: 'peter'}).limit(10).skip(20).fetch()

const users =  yield User.where({or: [{gender: 'female', age: {gte: 20}}, {gender: 'male', age: {gte: 22}}]}).fetch()
const user =  yield User.where('name').eq('peter').where('age').gt(18).lte(60).sort('-age').first()

const users =  yield User.where({age: {gte: 18}}).sort({age: -1}).fetch()

const users =  yield User.where('age', '>=', 18).fetch()

const users =  yield User.where('age').gt(18).paginate(2, 100)

const users =  yield User.where(function() {
  this.where('age', '>=', 18)
}).fetch()


// to query geo near you need declare field type as geometry and add 2d or 2dsphere index in migration file
const images = yield Image.where({location: {near: {lat: 1, lng: 1}, maxDistance: 5000}}).fetch()

const images = yield Image.where({location: {nearSphere: {lat: 1, lng: 1}, maxDistance: 500}}).fetch()
```
[More Documentation of mquery](https://github.com/aheckmann/mquery)

### Aggregation
```js
  const count = yield Customer.count()

  const count = yield Customer.where({invited: {$exist: true}}).count('position')

  const max = yield Employee.max('age')

  const total = yield Employee.where(active, true).sum('salary', 'department_id')

  const avg = yield Employee.where(active, true).avg('salary', {department: 'department_id', role: '$role_id'})
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
    return this.morphTo('App/Model', 'pictureableType', 'pictureableId')
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
  const user = yield User.with('emails').find(1)

  const user = yield User.with('emails', 'phone').fetch()

  const user = yield User.with(['emails', 'phone']).fetch()

  const user = yield User.with({
    relation: 'familyMembers', 
    scope: {
        where: { verified: true }, 
        sort: '-age'
    }
  }).fetch()

  const user = yield User.with({
    relation: 'familyMembers', 
    scope: query => {
      query.where(active, true).where('age').lt(18)
    }
  }).fetch()

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
const article = yield Article.find('58ccb403f895502b84582c63')
const articles = yield Article.where({department_id: {in: ['58ccb403f895502b84582c63', '58ccb403f895502b84582c63']}}).fetch()
```

> Type of `date`
```js
class Staff extends LucidMongo {
  static get dateFields() { return ['dob'] }
}
```
The field declare as date will be converted to moment js object after get from db
```js
const staff = yield Staff.first()
const yearAgo = staff.dob.fromNow()
```
You can set attribute of model as moment js object, field will be converted to date before save to db
```js
staff.dob = moment(request.input('dob'))
```
The where query conditions will be converted to date too
```js
const user = yield User.where({created_at: {gte: '2017-01-01'}}).fetch()
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
const image = yield Image.create({
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

### Get the mongodb drive
You can get the instance of mongodb drive to execute raw query
```js
  const Database = use('Database')
  const mongo = yield Database.connection('mongodb')
  const users = yield mongo.collection('users').find().toArray()
  const phone = yield mongo.collection('phones').findOne({userId: user._id})
```
[More document about mongo drive here](http://mongodb.github.io/node-mongodb-native/2.2/api/index.html)

## <a name="getting-started"></a>Installation

To setup this package

```bash
$ npm i --save adonis-lucid-mongodb
```

and then register lucid providers inside the your `bootstrap/app.js` file.
you should complete replace all setting of `adonis-lucid` with `adonis-lucid-mongodb`

```javascript
const providers = [
  // ...
  // 'adonis-lucid/providers/DatabaseProvider',
  // 'adonis-lucid/providers/LucidMongoProvider',
  // 'adonis-lucid/providers/FactoryProvider'  
  'adonis-lucid-mongodb/providers/DatabaseProvider',
  'adonis-lucid-mongodb/providers/LucidMongoProvider',
  'adonis-lucid-mongodb/providers/FactoryProvider',
]

const aceProviders = [
  // ...
  // 'adonis-lucid/providers/CommandsProvider',
  // 'adonis-lucid/providers/MigrationsProvider',
  // 'adonis-lucid/providers/SchemaProvider',
  // 'adonis-lucid/providers/SeederProvider',  
  'adonis-lucid-mongodb/providers/CommandsProvider',
  'adonis-lucid-mongodb/providers/MigrationsProvider',
  'adonis-lucid-mongodb/providers/SchemaProvider',
  'adonis-lucid-mongodb/providers/SeederProvider',
]
```

setting up aliases inside `bootstrap/app.js` file.

```javascript
const aliases = {
  Database: 'Adonis/Src/Database',
  Lucid: 'Adonis/Src/LucidMongo',
  Schema: 'Adonis/Src/Schema'
  Migrations: 'Adonis/Src/Migrations',
  Factory: 'Adonis/Src/Factory'
}
```

add config to `config/database.js` file

```javascript
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
        source: Env.get('DB_AUTH_SOURCE', 'admin'),
        mechanism: Env.get('DB_AUTH_MECHANISM', 'MONGODB-CR')
      }
    }
  }

}
```

### <a name="contribution-guidelines"></a>Contribution Guidelines

In favor of active development we accept contributions for everyone. You can contribute by submitting a bug, creating pull requests or even improving documentation.
