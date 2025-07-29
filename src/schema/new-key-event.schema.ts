import mongoose from 'mongoose'

const NewKeyEventSchema = new mongoose.Schema({
  eventName: {
    type: String,
    required: true,
    default: 'NewKeyEvent'
  },
  blockNumber: {
    type: Number,
    required: true
  },
  blockHash: {
    type: String,
    required: true
  },
  transactionHash: {
    type: String,
    required: true
  },
  tokenId: {
    type: String,
    required: true
  },
  keyIndex: {
    type: String,
    required: true
  },
  key: {
    type: String,
    required: true
  }
})

export const NewKeyEvent = mongoose.model('NewKeyEvent', NewKeyEventSchema)
