'use strict'

/**
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const Schema = use('Adonis/Src/Schema')

class User extends Schema {
  up () {
    this.create('users', function (collection) {
      collection.increments()
      collection.string('username')
      collection.string('email')
      collection.string('firstname')
      collection.string('lastname')
      collection.string('password')
      collection.timestamps()
    })
  }

  down () {
    this.drop('users')
  }
}

module.exports = User
