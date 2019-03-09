const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const documentSchema = new Schema({
  name: String,
  joinURL: String,
  users: {
    type: Array,
    default: []
  },
  files: {
    type: Array,
    default: []
  }
}, {
  versionKey: false,
  timestamps: {
    createdAt: 'created',
    updatedAt: 'updated'
  }
});
const documentModel = mongoose.model('documents', documentSchema);
module.exports = documentModel;