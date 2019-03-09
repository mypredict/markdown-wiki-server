const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const userSchema = new Schema({
  id: String,
  name: String,
  email: String,
  avatar_url: String,
  documents: {
    type: Array,
    default: []
  }
}, {
  versionKey: false,
  timestamps: {
    createdAt: 'created'
  }
});
const LoginModel = mongoose.model('users', userSchema);
module.exports = LoginModel;