import mongoose from 'mongoose'

const UNSDomainSchema = new mongoose.Schema({
  tokenId: {
    type: String,
    required: true
  },
  tld: {
    type: String,
    required: true,
    default: 'anyone'
  },
  name: {
    type: String,
    required: true
  },
  owner: {
    type: String,
    required: false
  }
})

export const UNSDomain = mongoose.model('UNSDomain', UNSDomainSchema)
