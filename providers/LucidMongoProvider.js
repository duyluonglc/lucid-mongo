'use strict'

/*
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const { ioc, ServiceProvider } = require('@adonisjs/fold')

class LucidMongoProvider extends ServiceProvider {
  /**
   * Registering the database manager under
   * Adonis/Src/Database namespace.
   *
   * @method _registerDatabase
   *
   * @return {void}
   *
   * @private
   */
  _registerDatabase () {
    this.app.singleton('Adonis/Src/Database', (app) => {
      const Config = app.use('Adonis/Src/Config')
      const Database = require('../src/Database/Manager')
      return new Database(Config)
    })
    this.app.alias('Adonis/Src/Database', 'Database')
  }

  /**
   * Registering the lucid model under
   * Adonis/Src/Model namespace.
   *
   * @method _registerModel
   *
   * @return {void}
   *
   * @private
   */
  _registerModel () {
    this.app.bind('Adonis/Src/Model', (app) => require('../src/LucidMongo/Model'))
    this.app.alias('Adonis/Src/Model', 'Model')
  }

  /**
   * Registering the serializer for auth
   */
  _registerSerializer () {
    try {
      if (ioc.use('Adonis/Src/Auth')) {
        ioc.extend('Adonis/Src/Auth',
          'LucidMongo',
          (app) => require('../src/LucidMongo/Serializers/LucidMongoSerializer'),
          'serializer')
      }
    } catch (error) { }
  }

  /**
   * Adds the unique rule to the validator
   *
   * @method _addUniqueRule
   *
   * @private
   */
  _addUniqueRule () {
    try {
      const { extend } = this.app.use('Adonis/Addons/Validator')
      const Database = this.app.use('Adonis/Src/Database')
      const validatorRules = new (require('../src/Validator'))(Database)

      /**
       * Extend by adding the rule
       */
      extend('unique', validatorRules.unique.bind(validatorRules), '{{field}} has already been taken by someone else')
    } catch (error) { }
  }

  /**
   * Register all the required providers
   *
   * @method register
   *
   * @return {void}
   */
  register () {
    this._registerDatabase()
    this._registerModel()
    this._registerSerializer()
  }

  /**
   * Boot the provider
   *
   * @method boot
   *
   * @return {void}
   */
  boot () {
    this._addUniqueRule()

    /**
     * Setup ioc resolver for internally accessing fold
     * methods.
     */
    require('../lib/iocResolver').setFold(require('@adonisjs/fold'))
  }
}

module.exports = LucidMongoProvider
