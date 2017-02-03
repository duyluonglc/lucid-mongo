'use strict'

/**
 * adonis-lucidMongo
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const ServiceProvider = require('adonis-fold').ServiceProvider

class LucidMongoProvider extends ServiceProvider {
  * register () {
    this.app.bind('Adonis/Src/LucidMongo', function () {
      return require('../src/LucidMongo/Model')
    })
  }
}

module.exports = LucidMongoProvider
