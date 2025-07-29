import mongoose from 'mongoose'

const DiscoverNewKeyEventsStateSchema = new mongoose.Schema({
  lastSafeCompleteBlock: {
    type: Number,
    required: true
  }
})

export const DiscoverNewKeyEventsState = mongoose.model(
  'DiscoverNewKeyEventsState',
  DiscoverNewKeyEventsStateSchema
)
