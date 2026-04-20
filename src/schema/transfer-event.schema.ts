import mongoose from 'mongoose'

const TransferEventSchema = new mongoose.Schema({
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
  from: {
    type: String,
    required: true
  },
  to: {
    type: String,
    required: true
  },
  isProcessed: {
    type: Boolean,
    required: true,
    default: false
  }
})

TransferEventSchema.index({ tokenId: 1 })
TransferEventSchema.index({ isProcessed: 1 })

export const TransferEvent = mongoose.model(
  'TransferEvent',
  TransferEventSchema
)
