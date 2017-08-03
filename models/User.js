'use strict'

// const Model = use('LucidMongo')

class User {
  // timestamp
  static get createTimestamp () { return 'createdAt' }

  static get updateTimestamp () { return 'updatedAt' }

  // sessions () {
  //   return this.hasMany('App/Models/Session', '_id', 'userId')
  // }
}

module.exports = User
