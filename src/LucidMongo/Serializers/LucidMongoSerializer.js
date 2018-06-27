'use strict'

/*
 * lucid-mongo
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const { ioc } = require('@adonisjs/fold')
const debug = require('debug')('adonis:auth')

/**
 * LucidMongo serializer uses lucidMongo model to validate
 * and fetch user details.
 *
 * @class LucidMongoSerializer
 * @constructor
 */
class LucidMongoSerializer {
  constructor (Hash) {
    this.Hash = Hash
    this._config = null
    this._Model = null
    this._Token = null
    this._queryCallback = null
  }

  /* istanbul ignore next */
  /**
   * Dependencies to be injected by Ioc container
   *
   * @attribute inject
   *
   * @return {Array}
   */
  static get inject () {
    return ['Adonis/Src/Hash']
  }

  /**
   * Returns an instance of the model query
   *
   * @method _getQuery
   *
   * @return {Object}
   *
   * @private
   */
  _getQuery () {
    const query = this._Model.query()
    if (typeof (this._queryCallback) === 'function') {
      this._queryCallback(query)
      this._queryCallback = null
    }
    return query
  }

  /**
   * Setup config on the serializer instance. It
   * is import and needs to be done as the
   * first step before using the serializer.
   *
   * @method setConfig
   *
   * @param  {Object}  config
   */
  setConfig (config) {
    this._config = config
    this._Model = ioc.make(this._config.model)
    this._Token = ioc.make(this._config.token)
  }

  /**
   * Returns the primary key for the
   * model. It is used to set the
   * session key
   *
   * @method primaryKey
   *
   * @return {String}
   */
  get primaryKey () {
    return this._Model.primaryKey
  }

  /**
   * Add runtime constraints to the query builder. It
   * is helpful when auth has extra constraints too
   *
   * @method query
   *
   * @param  {Function} callback
   *
   * @chainable
   */
  query (callback) {
    this._queryCallback = callback
    return this
  }

  /**
   * Returns a user instance using the primary
   * key
   *
   * @method findById
   *
   * @param  {Number|String} id
   *
   * @return {User|Null}  The model instance or `null`
   */
  async findById (id) {
    debug('finding user with primary key as %s', id)
    const user = await this._getQuery().where(this.primaryKey, id).first()
    if (user) {
      user.$attributes[this.primaryKey] = user.primaryKeyValue
      return user
    }
    return null
  }

  /**
   * Finds a user using the uid field
   *
   * @method findByUid
   *
   * @param  {String}  uid
   *
   * @return {Model|Null} The model instance or `null`
   */
  async findByUid (uid) {
    debug('finding user with %s as %s', this._config.uid, uid)
    const user = await this._getQuery().where(this._config.uid, uid).first()
    if (user) {
      user.$attributes[this.primaryKey] = user.primaryKeyValue
      return user
    }
    return null
  }

  /**
   * Validates the password field on the user model instance
   *
   * @method validateCredentails
   *
   * @param  {Model}            user
   * @param  {String}            password
   *
   * @return {Boolean}
   */
  async validateCredentails (user, password) {
    if (!user || !user[this._config.password]) {
      return false
    }
    return this.Hash.verify(password, user[this._config.password])
  }

  /**
   * Finds a user with token
   *
   * @method findByToken
   *
   * @param  {String}    token
   * @param  {String}    type
   *
   * @return {Object|Null}
   */
  async findByToken (token, type) {
    if (!this._Token) {
      return null
    }

    debug('finding user for %s token', token)

    token = await this._Token.where({ token, type, is_revoked: false }).first()
    if (token) {
      const user = await token.user().first()
      if (user) {
        user.$attributes[this.primaryKey] = user.primaryKeyValue
        return user
      }
      return null
    }
    return null
  }

  /**
   * Save token for a user. Tokens are usually secondary
   * way to login a user when their primary login is
   * expired
   *
   * @method saveToken
   *
   * @param  {Object}  user
   * @param  {String}  token
   * @param  {String}  type
   *
   * @return {void}
   */
  async saveToken (user, token, type) {
    const tokenInstance = new (user.tokens()).RelatedModel()
    tokenInstance.token = token
    tokenInstance.type = type
    tokenInstance.is_revoked = false
    debug('saving token for %s user with %j payload', user.primaryKeyValue, tokenInstance)
    await user.tokens().save(tokenInstance)
  }

  /**
   * Revoke token(s) or all tokens for a given user
   *
   * @method revokeTokens
   *
   * @param  {Object}           user
   * @param  {Array|String}     [tokens = null]
   * @param  {Boolean}          [inverse = false]
   *
   * @return {Number}           Number of impacted rows
   */
  async revokeTokens (user, tokens = null, inverse = false) {
    const query = user.tokens()
    if (tokens) {
      tokens = Array.isArray(tokens) ? tokens : [tokens]
      inverse ? query.where('token').nin(tokens) : query.where('token').in(tokens)
      debug('revoking %j tokens for %s user', tokens, user.primaryKeyValue)
    } else {
      debug('revoking all tokens for %s user', user.primaryKeyValue)
    }
    return query.update({ is_revoked: true })
  }

  /**
   * Delete token(s) or all tokens for a given user
   *
   * @method deleteTokens
   *
   * @param  {Object}           user
   * @param  {Array|String}     [tokens = null]
   * @param  {Boolean}          [inverse = false]
   *
   * @return {Number}           Number of impacted rows
   */
  async deleteTokens (user, tokens = null, inverse = false) {
    const query = user.tokens()
    if (tokens) {
      tokens = Array.isArray(tokens) ? tokens : [tokens]
      inverse ? query.where('token').nin(tokens) : query.where('token').in(tokens)
      debug('deleting %j tokens for %s user', tokens, user.primaryKeyValue)
    } else {
      debug('deleting all tokens for %s user', user.primaryKeyValue)
    }
    return query.delete()
  }

  /**
   * Returns all non-revoked list of tokens for a given user.
   *
   * @method listTokens
   * @async
   *
   * @param  {Object}   user
   * @param  {String}   type
   *
   * @return {Object}
   */
  async listTokens (user, type) {
    return user.tokens().where({ type, is_revoked: false }).fetch()
  }

  /**
   * A fake instance of serializer with empty set
   * of array
   *
   * @method fakeResult
   *
   * @return {Object}
   */
  fakeResult () {
    return new this._Model.Serializer([])
  }
}

module.exports = LucidMongoSerializer
