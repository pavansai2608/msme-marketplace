/**
 * Admin-only reporting and moderation.
 *
 * Every handler here assumes it sits behind verifyToken + requireRole('admin'),
 * which re-reads the role from the database on each request. Nothing in this
 * file re-checks the role, so the routes must never be mounted without it.
 */
const User = require('../models/User')
const Product = require('../models/Product')
const Order = require('../models/Order')

const ORDER_STATUSES = Order.schema.path('status').enumValues

// A user-supplied search string is interpolated into a RegExp, so the regex
// metacharacters have to be neutralised first - otherwise '(' is a syntax
// error that 500s and '.*' scans the whole collection.
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const paging = (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1)
  // Capped so a client cannot ask for the entire collection in one response.
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20))
  return { page, limit, skip: (page - 1) * limit }
}

const envelope = (data, total, page, limit) => ({
  success: true,
  data,
  pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
})

// @desc    Platform-wide counters for the admin dashboard
// @route   GET /api/admin/stats
// @access  Admin
exports.getStats = async (req, res) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const [roleCounts, products, orders, revenue, ordersLast7Days, inactiveUsers] =
      await Promise.all([
        User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
        Product.countDocuments(),
        Order.countDocuments(),
        // Revenue counts every order that was not cancelled, including ones
        // still in flight. Restricting it to 'Delivered' would report far less
        // than the platform has actually taken.
        Order.aggregate([
          { $match: { status: { $ne: 'Cancelled' } } },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } },
        ]),
        Order.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
        User.countDocuments({ isActive: false }),
      ])

    const users = { buyer: 0, seller: 0, admin: 0, total: 0 }
    roleCounts.forEach(({ _id, count }) => {
      if (_id in users) users[_id] = count
      users.total += count
    })

    return res.status(200).json({
      success: true,
      data: {
        users,
        inactiveUsers,
        products,
        orders,
        totalRevenue: revenue[0]?.total || 0,
        ordersLast7Days,
        revenueBasis: 'Sum of totalAmount across all orders except Cancelled',
        generatedAt: new Date().toISOString(),
      },
    })
  } catch (err) {
    console.error('❌ admin getStats:', err.message)
    return res.status(500).json({ success: false, message: err.message })
  }
}

// @desc    Paginated user list, searchable by name and email
// @route   GET /api/admin/users?page=&limit=&search=&role=
// @access  Admin
exports.getUsers = async (req, res) => {
  try {
    const { page, limit, skip } = paging(req.query)
    const search = (req.query.search || '').trim()

    const query = {}
    if (search) {
      const pattern = new RegExp(escapeRegex(search), 'i')
      query.$or = [{ name: pattern }, { email: pattern }]
    }
    if (req.query.role && ['buyer', 'seller', 'admin'].includes(req.query.role)) {
      query.role = req.query.role
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select('name email role isActive isVerified businessName district state createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ])

    // isActive is only defaulted on documents written since the field was
    // added; older rows have no value at all and must not read as suspended.
    const data = users.map((u) => ({ ...u, isActive: u.isActive !== false }))

    return res.status(200).json(envelope(data, total, page, limit))
  } catch (err) {
    console.error('❌ admin getUsers:', err.message)
    return res.status(500).json({ success: false, message: err.message })
  }
}

// @desc    Activate or deactivate a user
// @route   PATCH /api/admin/users/:id/status
// @access  Admin
exports.updateUserStatus = async (req, res) => {
  try {
    const { isActive } = req.body
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ success: false, message: 'isActive must be true or false' })
    }

    // Without this an admin can suspend their own account and lock every
    // admin route behind a 403 that nobody is left to lift.
    if (req.params.id === req.user.id && isActive === false) {
      return res
        .status(400)
        .json({ success: false, message: 'You cannot deactivate your own account' })
    }

    const user = await User.findById(req.params.id).select(
      'name email role isActive isVerified createdAt'
    )
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    user.isActive = isActive
    await user.save()

    return res.status(200).json({
      success: true,
      message: isActive ? 'User activated' : 'User deactivated',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
    })
  } catch (err) {
    console.error('❌ admin updateUserStatus:', err.message)
    return res.status(500).json({ success: false, message: err.message })
  }
}

// @desc    Paginated order list, filterable by status
// @route   GET /api/admin/orders?page=&limit=&status=
// @access  Admin
exports.getOrders = async (req, res) => {
  try {
    const { page, limit, skip } = paging(req.query)
    const status = (req.query.status || '').trim()

    const query = {}
    if (status && status !== 'All') {
      if (!ORDER_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Expected one of: ${ORDER_STATUSES.join(', ')}`,
        })
      }
      query.status = status
    }

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('buyer', 'name email')
        .populate('products.product', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(query),
    ])

    return res.status(200).json({
      ...envelope(orders, total, page, limit),
      statuses: ORDER_STATUSES,
    })
  } catch (err) {
    console.error('❌ admin getOrders:', err.message)
    return res.status(500).json({ success: false, message: err.message })
  }
}
