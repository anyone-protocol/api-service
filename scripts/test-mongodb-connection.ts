import mongoose from 'mongoose'

async function testMongodbConnection() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017'
  console.log(`Connecting to MongoDB at ${uri}...`)
  const goose = await mongoose.connect(uri)
  await goose.disconnect()
}

testMongodbConnection().then(() => {
  console.log('Connected to MongoDB successfully!')
  process.exit(0)
}).catch((error) => {
  console.error('Error during MongoDB connection test:', error)
  process.exit(1)
})
