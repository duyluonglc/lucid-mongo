
      const Schema = use('Schema')
      class User extends Schema {
        up () {
          this.createTable('schema_users', (table) => {
            table.increments()
            table.string('username')
          })
        }
      }

      module.exports = User
