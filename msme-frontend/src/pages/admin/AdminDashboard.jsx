import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import * as adminApi from '../../api/adminApi'
import { qk } from '../../lib/queryClient'
import { useToast } from '../../components/Toast'
import {
  FaShieldAlt,
  FaUsers,
  FaStore,
  FaBoxOpen,
  FaClipboardList,
  FaRupeeSign,
  FaCalendarWeek,
  FaSearch,
  FaSignOutAlt,
  FaSync,
  FaUserSlash,
  FaUserCheck,
  FaExclamationTriangle,
} from 'react-icons/fa'

const PAGE_SIZE = 10

const money = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value || 0)

const date = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—'

// Every message shown to the admin comes from the server response where there
// is one, so a 403 or a validation failure reads as itself rather than as a
// generic "something went wrong".
const messageOf = (err, fallback) => err?.response?.data?.message || err?.message || fallback

const STATUS_COLOURS = {
  Ordered: { bg: '#eff6ff', fg: '#1d4ed8' },
  Packed: { bg: '#f5f3ff', fg: '#6d28d9' },
  Dispatched: { bg: '#fffbeb', fg: '#b45309' },
  Shipped: { bg: '#ecfeff', fg: '#0e7490' },
  Delivered: { bg: '#ecfdf5', fg: '#047857' },
  Cancelled: { bg: '#fef2f2', fg: '#b91c1c' },
}

const ROLE_COLOURS = {
  admin: { bg: '#f5f3ff', fg: '#6d28d9' },
  seller: { bg: '#eff6ff', fg: '#1d4ed8' },
  buyer: { bg: '#f1f5f9', fg: '#475569' },
}

function Pill({ text, palette }) {
  const c = palette || { bg: '#f1f5f9', fg: '#475569' }
  return (
    <span
      style={{
        padding: '4px 10px',
        borderRadius: '999px',
        background: c.bg,
        color: c.fg,
        fontSize: '0.7rem',
        fontWeight: 800,
        letterSpacing: '0.02em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </span>
  )
}

function Notice({ kind, children }) {
  const palette =
    kind === 'error'
      ? { bg: '#fef2f2', fg: '#b91c1c', border: '#fecaca' }
      : { bg: '#f8fafc', fg: 'var(--text-muted)', border: '#e2e8f0' }
  return (
    <div
      style={{
        padding: '28px',
        textAlign: 'center',
        color: palette.fg,
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        borderRadius: '12px',
        fontWeight: 600,
        fontSize: '0.875rem',
      }}
    >
      {kind === 'error' && (
        <FaExclamationTriangle style={{ marginRight: '8px', verticalAlign: '-2px' }} />
      )}
      {children}
    </div>
  )
}

function StatCard({ icon, label, value, sub, colour }) {
  return (
    <div className="glass-card" style={{ padding: '22px' }}>
      <div style={{ color: colour, marginBottom: '10px', fontSize: '1.35rem' }}>{icon}</div>
      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: '1.7rem', fontWeight: 800, lineHeight: 1.2 }}>{value}</div>
      {sub && (
        <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: '4px' }}>
          {sub}
        </div>
      )}
    </div>
  )
}

function Pager({ meta, onPage, busy }) {
  if (!meta) return null
  const { page, pages, total, limit } = meta
  const first = total === 0 ? 0 : (page - 1) * limit + 1
  const last = Math.min(page * limit, total)

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: '18px',
        flexWrap: 'wrap',
        gap: '12px',
      }}
    >
      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>
        {total === 0 ? 'No results' : `Showing ${first}–${last} of ${total}`}
      </span>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button
          className="btn-outline"
          style={{ padding: '6px 14px', fontSize: '0.78rem' }}
          disabled={busy || page <= 1}
          onClick={() => onPage(page - 1)}
        >
          Previous
        </button>
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>
          Page {page} of {pages}
        </span>
        <button
          className="btn-outline"
          style={{ padding: '6px 14px', fontSize: '0.78rem' }}
          disabled={busy || page >= pages}
          onClick={() => onPage(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  )
}

const th = { textAlign: 'left', padding: '12px 14px', fontSize: '0.72rem', letterSpacing: '0.04em' }
const td = { padding: '14px', fontSize: '0.85rem', borderTop: '1px solid #f1f5f9' }

export default function AdminDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState('users')

  // ── stats ────────────────────────────────────────────────────────────────
  const {
    data: stats = null,
    isPending: statsLoading,
    error: statsQueryError,
  } = useQuery({
    queryKey: qk.admin.stats(),
    queryFn: () => adminApi.getStats().then((r) => r.data),
    // An admin watching the dashboard wants current numbers, but not at the
    // cost of a request per re-render.
    staleTime: 15_000,
  })
  const statsError = statsQueryError
    ? messageOf(statsQueryError, 'Could not load platform stats')
    : ''

  // ── users ────────────────────────────────────────────────────────────────
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [userPage, setUserPage] = useState(1)

  // Debounced so a five-letter search is one request, not five.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim())
      setUserPage(1)
    }, 350)
    return () => clearTimeout(timer)
  }, [searchInput])

  const usersQuery = useQuery({
    queryKey: qk.admin.users({ page: userPage, search }),
    queryFn: () => adminApi.getUsers({ page: userPage, limit: PAGE_SIZE, search }),
    staleTime: 15_000,
    // Holds the current page on screen while the next one loads, so paging
    // does not flash an empty table.
    placeholderData: (previous) => previous,
  })
  const users = usersQuery.data?.data ?? []
  const usersMeta = usersQuery.data?.pagination ?? null
  const usersLoading = usersQuery.isPending
  const usersError = usersQuery.error ? messageOf(usersQuery.error, 'Could not load users') : ''

  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }) => adminApi.setUserStatus(id, isActive),

    onMutate: async ({ id, isActive }) => {
      const key = qk.admin.users({ page: userPage, search })
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData(key)

      // Optimistic: the row flips immediately rather than after the round trip.
      queryClient.setQueryData(key, (old) =>
        old ? { ...old, data: old.data.map((u) => (u._id === id ? { ...u, isActive } : u)) } : old
      )
      return { previous, key }
    },

    onError: (err, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(context.key, context.previous)
      }
      toast.error(messageOf(err, 'Could not change that account'))
    },

    onSuccess: (res) => {
      toast.success(res.message || 'Account updated')
      queryClient.invalidateQueries({ queryKey: qk.admin.stats() })
    },
  })

  const busyUserId = statusMutation.isPending ? statusMutation.variables?.id : null

  const toggleStatus = (target) => {
    const next = !target.isActive
    if (
      !next &&
      !window.confirm(
        `Deactivate ${target.name} (${target.email})? They will be blocked on their next request.`
      )
    ) {
      return
    }
    statusMutation.mutate({ id: target._id, isActive: next })
  }

  // ── orders ───────────────────────────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState('All')
  const [orderPage, setOrderPage] = useState(1)

  const ordersQuery = useQuery({
    queryKey: qk.admin.orders({ page: orderPage, status: statusFilter }),
    queryFn: () =>
      adminApi.getOrders({
        page: orderPage,
        limit: PAGE_SIZE,
        status: statusFilter === 'All' ? '' : statusFilter,
      }),
    staleTime: 15_000,
    placeholderData: (previous) => previous,
  })
  const orders = ordersQuery.data?.data ?? []
  const ordersMeta = ordersQuery.data?.pagination ?? null
  const orderStatuses = ordersQuery.data?.statuses ?? []
  const ordersLoading = ordersQuery.isPending
  const ordersError = ordersQuery.error ? messageOf(ordersQuery.error, 'Could not load orders') : ''

  // Marking everything stale is enough: React Query refetches whatever is
  // actually mounted, so this cannot fall out of step with the visible tab.
  const refreshAll = () => queryClient.invalidateQueries()

  // ── render ───────────────────────────────────────────────────────────────
  return (
    <div
      style={{ padding: '40px', maxWidth: '1280px', margin: '0 auto' }}
      className="animate-fade-in"
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '20px',
          flexWrap: 'wrap',
          marginBottom: '32px',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '2.2rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              fontFamily: "'Sora', sans-serif",
            }}
          >
            <FaShieldAlt color="var(--primary)" /> Admin Control Center
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '4px', fontSize: '0.9rem' }}>
            Signed in as {user?.email}
            {stats?.generatedAt &&
              ` · data as of ${new Date(stats.generatedAt).toLocaleTimeString()}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn-outline"
            style={{ padding: '10px 16px', fontSize: '0.8rem' }}
            onClick={refreshAll}
          >
            <FaSync style={{ verticalAlign: '-2px', marginRight: '6px' }} /> Refresh
          </button>
          <button
            className="btn-outline"
            style={{ padding: '10px 16px', fontSize: '0.8rem' }}
            onClick={() => navigate('/buyer')}
          >
            <FaStore style={{ verticalAlign: '-2px', marginRight: '6px' }} /> Storefront
          </button>
          <button
            className="btn-outline"
            style={{ padding: '10px 16px', fontSize: '0.8rem' }}
            onClick={logout}
          >
            <FaSignOutAlt style={{ verticalAlign: '-2px', marginRight: '6px' }} /> Sign out
          </button>
        </div>
      </div>

      {/* ── stats ── */}
      {statsError && (
        <div style={{ marginBottom: '28px' }}>
          <Notice kind="error">{statsError}</Notice>
        </div>
      )}

      {statsLoading && !stats ? (
        <div style={{ marginBottom: '32px' }}>
          <Notice>Loading platform stats…</Notice>
        </div>
      ) : stats ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
            gap: '18px',
            marginBottom: '36px',
          }}
        >
          <StatCard
            icon={<FaUsers />}
            colour="#2563eb"
            label="Total Users"
            value={stats.users.total.toLocaleString('en-IN')}
            sub={`${stats.users.buyer} buyers · ${stats.users.seller} sellers · ${stats.users.admin} admin`}
          />
          <StatCard
            icon={<FaUserSlash />}
            colour="#b91c1c"
            label="Deactivated"
            value={stats.inactiveUsers.toLocaleString('en-IN')}
            sub="Blocked on their next request"
          />
          <StatCard
            icon={<FaBoxOpen />}
            colour="#7c3aed"
            label="Products"
            value={stats.products.toLocaleString('en-IN')}
          />
          <StatCard
            icon={<FaClipboardList />}
            colour="#0e7490"
            label="Orders"
            value={stats.orders.toLocaleString('en-IN')}
          />
          <StatCard
            icon={<FaRupeeSign />}
            colour="#059669"
            label="Total Revenue"
            value={money(stats.totalRevenue)}
            sub="Excludes cancelled orders"
          />
          <StatCard
            icon={<FaCalendarWeek />}
            colour="#f59e0b"
            label="Orders (last 7 days)"
            value={stats.ordersLast7Days.toLocaleString('en-IN')}
          />
        </div>
      ) : null}

      {/* ── tabs ── */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
        {[
          ['users', 'Users', usersMeta?.total],
          ['orders', 'Orders', ordersMeta?.total],
        ].map(([key, label, count]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              border: '1px solid',
              borderColor: tab === key ? 'var(--primary)' : '#e2e8f0',
              background: tab === key ? 'var(--primary)' : 'transparent',
              color: tab === key ? '#fff' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            {label}
            {typeof count === 'number' && ` (${count})`}
          </button>
        ))}
      </div>

      {/* ── users tab ── */}
      {tab === 'users' && (
        <div className="glass-card" style={{ padding: '28px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap',
              marginBottom: '20px',
            }}
          >
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Users</h3>
            <div style={{ position: 'relative', minWidth: '280px' }}>
              <FaSearch
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  fontSize: '0.8rem',
                }}
              />
              <input
                className="input-field"
                style={{ paddingLeft: '38px', margin: 0 }}
                placeholder="Search by name or email"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
          </div>

          {usersError && (
            <div style={{ marginBottom: '16px' }}>
              <Notice kind="error">{usersError}</Notice>
            </div>
          )}

          {usersLoading ? (
            <Notice>Loading users…</Notice>
          ) : users.length === 0 ? (
            <Notice>
              {search ? `No users match “${search}”.` : 'No users have registered yet.'}
            </Notice>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '760px' }}>
                <thead style={{ background: '#f8fafc', color: 'var(--text-muted)' }}>
                  <tr>
                    <th style={th}>NAME</th>
                    <th style={th}>EMAIL</th>
                    <th style={th}>ROLE</th>
                    <th style={th}>BUSINESS</th>
                    <th style={th}>JOINED</th>
                    <th style={th}>STATUS</th>
                    <th style={{ ...th, textAlign: 'right' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const isSelf = u._id === user?._id || u.email === user?.email
                    return (
                      <tr key={u._id}>
                        <td style={{ ...td, fontWeight: 700 }}>
                          {u.name}
                          {isSelf && (
                            <span
                              style={{
                                color: 'var(--text-muted)',
                                fontWeight: 600,
                                fontSize: '0.72rem',
                              }}
                            >
                              {' '}
                              (you)
                            </span>
                          )}
                        </td>
                        <td style={{ ...td, color: 'var(--text-muted)' }}>{u.email}</td>
                        <td style={td}>
                          <Pill text={u.role} palette={ROLE_COLOURS[u.role]} />
                        </td>
                        <td style={{ ...td, color: 'var(--text-muted)' }}>
                          {u.businessName || '—'}
                        </td>
                        <td style={{ ...td, color: 'var(--text-muted)' }}>{date(u.createdAt)}</td>
                        <td style={td}>
                          <Pill
                            text={u.isActive ? 'Active' : 'Deactivated'}
                            palette={
                              u.isActive
                                ? { bg: '#ecfdf5', fg: '#047857' }
                                : { bg: '#fef2f2', fg: '#b91c1c' }
                            }
                          />
                        </td>
                        <td style={{ ...td, textAlign: 'right' }}>
                          <button
                            className="btn-outline"
                            style={{
                              padding: '6px 14px',
                              fontSize: '0.75rem',
                              opacity: isSelf ? 0.4 : 1,
                              cursor: isSelf ? 'not-allowed' : 'pointer',
                            }}
                            // The server refuses this too; disabling it here
                            // just avoids offering an action that cannot work.
                            disabled={isSelf || busyUserId === u._id}
                            title={isSelf ? 'You cannot deactivate your own account' : ''}
                            onClick={() => toggleStatus(u)}
                          >
                            {busyUserId === u._id ? (
                              'Working…'
                            ) : u.isActive ? (
                              <>
                                <FaUserSlash
                                  style={{ verticalAlign: '-2px', marginRight: '6px' }}
                                />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <FaUserCheck
                                  style={{ verticalAlign: '-2px', marginRight: '6px' }}
                                />
                                Activate
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <Pager meta={usersMeta} onPage={setUserPage} busy={usersLoading} />
        </div>
      )}

      {/* ── orders tab ── */}
      {tab === 'orders' && (
        <div className="glass-card" style={{ padding: '28px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap',
              marginBottom: '20px',
            }}
          >
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Orders</h3>
            <select
              className="input-field"
              style={{ margin: 0, minWidth: '200px' }}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setOrderPage(1)
              }}
            >
              <option value="All">All statuses</option>
              {orderStatuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {ordersError && (
            <div style={{ marginBottom: '16px' }}>
              <Notice kind="error">{ordersError}</Notice>
            </div>
          )}

          {ordersLoading ? (
            <Notice>Loading orders…</Notice>
          ) : orders.length === 0 ? (
            <Notice>
              {statusFilter === 'All'
                ? 'No orders have been placed yet.'
                : `No orders with status “${statusFilter}”.`}
            </Notice>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '820px' }}>
                <thead style={{ background: '#f8fafc', color: 'var(--text-muted)' }}>
                  <tr>
                    <th style={th}>ORDER</th>
                    <th style={th}>BUYER</th>
                    <th style={th}>ITEMS</th>
                    <th style={th}>PLACED</th>
                    <th style={th}>STATUS</th>
                    <th style={{ ...th, textAlign: 'right' }}>AMOUNT</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => {
                    const names = (o.products || []).map((p) => p.product?.name).filter(Boolean)
                    return (
                      <tr key={o._id}>
                        <td style={{ ...td, fontFamily: 'monospace', fontSize: '0.78rem' }}>
                          #{String(o._id).slice(-8)}
                        </td>
                        <td style={td}>
                          <div style={{ fontWeight: 700 }}>{o.buyer?.name || 'Deleted user'}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                            {o.buyer?.email || '—'}
                          </div>
                        </td>
                        <td style={{ ...td, color: 'var(--text-muted)' }}>
                          {names.length === 0
                            ? `${o.products?.length || 0} item(s)`
                            : names.length === 1
                              ? names[0]
                              : `${names[0]} +${names.length - 1} more`}
                        </td>
                        <td style={{ ...td, color: 'var(--text-muted)' }}>{date(o.createdAt)}</td>
                        <td style={td}>
                          <Pill text={o.status} palette={STATUS_COLOURS[o.status]} />
                        </td>
                        <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>
                          {money(o.totalAmount)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <Pager meta={ordersMeta} onPage={setOrderPage} busy={ordersLoading} />
        </div>
      )}
    </div>
  )
}
