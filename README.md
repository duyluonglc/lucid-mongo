# AdonisJS Lucid MongoDB

> **NB - WORK IN PROGRESS**

> :pray: This repository is forked of adonis-lucid to connect with mongodb.

Adonis-lucid is a database query builder and ORM for Adonis framework. It also has support for database migrations, seeds and factories.

But it not support MongoDB. So I've forked and make new repository adonis-lucid-mongo because adonis has no plan to support mongodb in core framework

You can learn more about AdonisJS and all of its awesomeness on http://adonisjs.com :evergreen_tree:


## <a name="getting-started"></a>Getting Started

LucidMongo is included by default with every new adonis application, but here are the steps, if in case you want to set it up manually.

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

[Official Documentation](http://adonisjs.com/docs/2.0/installation)

## <a name="contribution-guidelines"></a>Contribution Guidelines

In favor of active development we accept contributions for everyone. You can contribute by submitting a bug, creating pull requests or even improving documentation.
