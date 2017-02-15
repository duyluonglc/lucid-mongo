# AdonisJS Lucid MongoDB

> **NB - WORK IN PROGRESS**

> :pray: This repository is forked of adonis-lucid to connect with mongodb.

Adonis-lucid is a database query builder and ORM for Adonis framework. It also has support for database migrations, seeds and factories.

But it not support MongoDB. So I've forked and make new repository adonis-lucid-mongo because adonis has no plan to support mongodb in core framework

You can learn more about AdonisJS and all of its awesomeness on http://adonisjs.com :evergreen_tree:

You can see example here [adonis-mongodb-boilerplate](https://github.com/duyluonglc/adonis-mongodb-boilerplate)

## <a name="getting-started"></a>Getting Started

To setup this package

```bash
$ npm i --save adonis-lucid-mongodb
```

and then register lucid providers inside the your `bootstrap/app.js` file.

```javascript
const providers = [
  'adonis-lucid-mongodb/providers/DatabaseProvider',
  'adonis-lucid-mongodb/providers/LucidProvider',
  'adonis-lucid-mongodb/providers/SchemaProvider',
  'adonis-lucid-mongodb/providers/MigrationsProvider',
  'adonis-lucid-mongodb/providers/CommandsProvider',
  'adonis-lucid-mongodb/providers/FactoryProvider',
  'adonis-lucid-mongodb/providers/SeederProvider',  
]
```

setting up aliases inside `bootstrap/app.js` file.

```javascript
const aliases = {
  Database: 'Adonis/Src/Database',
  LucidMongo: 'Adonis/Src/LucidMongo',
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
  | interacting with SQL databases.
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
      database: Env.get('DB_DATABASE', 'adonis')
    }
  }

}
```
## Usage
The usage of LucidMongo is similar to Lucid

[Official Documentation of Lucid here](http://adonisjs.com/docs/2.0/installation)

### Query

This package support `where` method with some type of params
```js
const users =  yield User.where('name', 'peter').fetch()

const users =  yield User.where({name: 'peter'}).fetch()

const user =  yield User.where('name').equal('peter').first()
```

### Aggregation
```js
  const max = yield User.query().max('age')

  const total = yield Employ.where(active, true).sum('salary', '$department_id')

  const avg = yield Employ.where(active, true).avg('salary', {department: '$department_id', role: '$role_id'})
```

### Addition relations
1. `morphMany:` A model can belong to more than one other model, on a single association. For example, you might have a Picture model that belongs to either an Author model or a Reader model
2. `embedsOne:` EmbedsOne is used to represent a model that embeds another model, for example, a Customer embeds one billingAddress.
3. `embedsMany:` Use an embedsMany relation to indicate that a model can embed many instances of another model. For example, a Customer can have multiple email addresses and each email address is a complex object that contains label and address.
4. `referMany:` Similar to populate of mongoosejs

### Nested query

```js
  const user = User.with('emails').find(1)

  const user = User.with('emails', 'phone').find(1)

  const user = User.with(['emails', 'phone']).find(1)

  const user = User.with({relation: 'email', 'scope': {verified: true}}).find(1)

  const user = User.with({relation: 'email', 'scope': query => {
    query.where(active, true).limit(1)
  }}).find(1)

```

### Migration
Current only support create, drop, rename collection and index
```js
up () {
  this.create('articles', (collection) => {
    collection.index('name_of_index', {title: 1})
  })

  this.rename('articles', 'posts')
}
```

### <a name="contribution-guidelines"></a>Contribution Guidelines

In favor of active development we accept contributions for everyone. You can contribute by submitting a bug, creating pull requests or even improving documentation.
