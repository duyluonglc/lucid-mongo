## Registering provider

Make sure to register the lucid mongo provider to make use of `Database` and `LucidMongo` models. The providers are registered inside `start/app.js`

```js
const providers = [
  'lucid-mongo/providers/LucidMongoProvider'
]
```

### Config mongodb collection
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
    connectionString: Env.get('DB_CONNECTION_STRING', ''),
    connection: {
      host: Env.get('DB_HOST', 'localhost'),
      port: Env.get('DB_PORT', 27017),
      username: Env.get('DB_USER', 'admin'),
      password: Env.get('DB_PASSWORD', ''),
      database: Env.get('DB_DATABASE', 'adonis'),
      options: {
        // replicaSet: Env.get('DB_REPLICA_SET', '')
        // ssl: Env.get('DB_SSL, '')
        // connectTimeoutMS: Env.get('DB_CONNECT_TIMEOUT_MS', 15000),
        // socketTimeoutMS: Env.get('DB_SOCKET_TIMEOUT_MS', 180000),
        // w: Env.get('DB_W, 0),
        // readPreference: Env.get('DB_READ_PREFERENCE', 'secondary'),
        // authSource: Env.get('DB_AUTH_SOURCE', ''),
        // authMechanism: Env.get('DB_AUTH_MECHANISM', ''),
        // other options
      }
    }
  }
}
```

### Environment Variables

The configuration file `config/database.js` references **environment variables** from `.env` file. Make sure to set them accordingly for development and production envorinment. 

```
DB_CONNECTION=mongodb
```

When using mongodb set following

```
DB_HOST=127.0.0.1
DB_PORT=27017
DB_USER=admin
DB_PASSWORD=
DB_DATABASE=adonis
```

### Configuring Auth serializer
Edit the config/auth.js file for including the serializer. For example on the api schema
```js
  session: {
    serializer: 'LucidMongo',
    model: 'App/Models/User',
    scheme: 'session',
    uid: 'email',
    password: 'password'
  },
  
  basic: {
    serializer: 'LucidMongo',
    model: 'App/Models/User',
    scheme: 'basic',
    uid: 'email',
    password: 'password'
  },

  jwt: {
    serializer: 'LucidMongo',
    model: 'App/Models/User',
    token: 'App/Models/Token',
    scheme: 'jwt',
    uid: 'email',
    password: 'password',
    expiry: '20m',
    options: {
      secret: 'self::app.appKey'
    }
  },

  api: {
    serializer: 'LucidMongo',
    scheme: 'api',
    model: 'App/Models/User',
    token: 'App/Models/Token',
    uid: 'username',
    password: '',
    expiry: '30d',
  },
```

## Usage 

Once done you can access `Database` provider and run mongo queries as follows.

```js
const Database = use('Database')

await Database.collection('users').find()
await Database.collection('users').paginate()
```

## Migrations Provider

This repo also comes with a migrations and seeds provider to run to migrate your database using incremental migrations.

Make sure to register migrations provider under `aceProviders` array.

```js
const aceProviders = [
  'lucid-mongo/providers/MigrationsProvider'
]
```

After this running `adonis --help` will list a set of commands under `migration` namespace.
