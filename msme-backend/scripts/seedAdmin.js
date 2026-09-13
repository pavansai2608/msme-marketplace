/**
 * Promotes an existing user to admin.
 *
 *   node scripts/seedAdmin.js someone@example.com
 *
 * This is the ONLY way to create an admin. No HTTP route can set the admin
 * role: /api/auth/update-profile strips `role` from the body and
 * /api/auth/become-seller hardcodes 'seller'. The account must already exist -
 * register through the app first, then run this against that email.
 */
require('dotenv').config()
const mongoose = require('mongoose')
const User = require('../models/User')

const main = async () => {
  const email = (process.argv[2] || '').toLowerCase().trim()
  if (!email) {
    console.error('Usage: node scripts/seedAdmin.js <email>')
    process.exit(1)
  }

  if (!process.env.MONGO_URL) {
    console.error('❌ MONGO_URL is not set. Check msme-backend/.env')
    process.exit(1)
  }

  await mongoose.connect(process.env.MONGO_URL, { serverSelectionTimeoutMS: 20000 })

  const user = await User.findOne({ email })
  if (!user) {
    console.error(`❌ No user with email ${email}. Register that account first.`)
    await mongoose.disconnect()
    process.exit(1)
  }

  if (user.role === 'admin' && user.isActive !== false) {
    console.log(`✓ ${email} is already an admin. Nothing to do.`)
    await mongoose.disconnect()
    return
  }

  const previousRole = user.role

  // updateOne rather than save(): password is select:false here, so it is not
  // loaded, and this keeps the pre-save hashing hook out of the picture
  // entirely. isActive is forced true because a suspended admin would be
  // promoted and then blocked at the door by verifyToken.
  await User.updateOne({ _id: user._id }, { $set: { role: 'admin', isActive: true } })

  console.log(`✅ ${email} promoted: ${previousRole} -> admin`)
  console.log('   Sign out and back in for the change to apply to an open session.')
  await mongoose.disconnect()
}

main().catch(async (err) => {
  console.error('❌', err.message)
  await mongoose.disconnect().catch(() => {})
  process.exit(1)
})
