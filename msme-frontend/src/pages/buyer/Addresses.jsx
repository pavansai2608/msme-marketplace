import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import axios from 'axios'
import BuyerNavbar from '../../components/BuyerNavbar'
import { FaPlus, FaEllipsisV, FaCrosshairs, FaMapMarkerAlt } from 'react-icons/fa'
import { fetchStates } from '../../services/locationService'
import { addressSchema } from '../../lib/schemas'
import { ListSkeleton } from '../../components/Skeletons'
import { useAddresses, useSaveAddress, useDeleteAddress } from '../../hooks/useAddresses'
import { useToast } from '../../components/Toast'

const EMPTY_ADDRESS = {
  name: '',
  phone: '',
  pincode: '',
  locality: '',
  street: '',
  city: '',
  state: '',
  landmark: '',
  altPhone: '',
  type: 'Home',
}

export default function Addresses() {
  const toast = useToast()
  const [showForm, setShowForm] = useState(false)
  const [gettingLocation, setGettingLocation] = useState(false)
  const [apiStates, setApiStates] = useState([])
  const [editingId, setEditingId] = useState(null)

  const { data: addresses = [], isPending } = useAddresses()
  const saveMutation = useSaveAddress()
  const deleteMutation = useDeleteAddress()
  const loading = saveMutation.isPending

  // Ten fields of useState replaced by one form. addressSchema carries the
  // same rules the API validates against.
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(addressSchema),
    mode: 'onBlur',
    defaultValues: EMPTY_ADDRESS,
  })

  const type = watch('type')

  useEffect(() => {
    fetchStates().then(setApiStates)
  }, [])

  const resetForm = () => {
    reset(EMPTY_ADDRESS)
    setEditingId(null)
  }

  const onSubmit = (values) => {
    saveMutation.mutate(
      { id: editingId, values },
      {
        onSuccess: () => {
          setShowForm(false)
          resetForm()
        },
      }
    )
  }

  const handleEdit = (addr) => {
    reset({ ...EMPTY_ADDRESS, ...addr, type: addr.type === 'Work' ? 'Work' : 'Home' })
    setEditingId(addr._id)
    setShowForm(true)
  }

  const handleDelete = (id) => {
    if (!window.confirm('Are you sure you want to delete this address?')) return
    deleteMutation.mutate(id)
  }

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser')
      return
    }
    setGettingLocation(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords
          const res = await axios.get(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          )
          if (res.data && res.data.address) {
            const addr = res.data.address
            const opts = { shouldValidate: true, shouldDirty: true }
            setValue('pincode', (addr.postcode || '').replace(/\D/g, '').slice(0, 6), opts)
            setValue('city', addr.city || addr.town || addr.village || addr.county || '', opts)
            setValue(
              'locality',
              addr.suburb || addr.neighbourhood || addr.state_district || '',
              opts
            )
            setValue(
              'street',
              (addr.road || '') + (addr.house_number ? ', ' + addr.house_number : ''),
              opts
            )
            if (addr.state) setValue('state', addr.state, opts)
          }
        } catch (err) {
          console.error('Geo error', err)
        } finally {
          setGettingLocation(false)
        }
      },
      (_err) => {
        toast.error('Unable to retrieve your location. Please grant permission.')
        setGettingLocation(false)
      }
    )
  }

  return (
    <div style={{ background: 'var(--background)', minHeight: '100vh', paddingBottom: '80px' }}>
      <BuyerNavbar />

      <div style={{ maxWidth: '1200px', margin: '60px auto', padding: '0 60px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginBottom: '60px',
          }}
        >
          <div>
            <h1
              style={{
                fontSize: '1.5rem',
                fontWeight: 800,
                color: 'var(--text-main)',
                letterSpacing: '-0.5px',
                fontFamily: "'Sora', sans-serif",
              }}
            >
              Shipping Addresses
            </h1>
            <p
              style={{
                color: 'var(--text-muted)',
                marginTop: '4px',
                fontWeight: 600,
                fontSize: '0.75rem',
              }}
            >
              Your list of verified delivery addresses
            </p>
          </div>
          {!showForm && (
            <button
              className="btn-primary"
              onClick={() => {
                resetForm()
                setShowForm(true)
              }}
              style={{ padding: '12px 24px', borderRadius: '12px', fontSize: '0.85rem' }}
            >
              <FaPlus size={10} /> ADD NEW ADDRESS
            </button>
          )}
        </div>

        {showForm && (
          <div
            style={{
              background: 'white',
              padding: '40px',
              borderRadius: '32px',
              marginBottom: '40px',
              boxShadow: 'var(--shadow)',
              border: '1px solid var(--border-soft)',
            }}
          >
            <h2
              style={{
                fontSize: '1.25rem',
                fontWeight: 800,
                marginBottom: '32px',
                color: '#111827',
                fontFamily: "'Sora', sans-serif",
              }}
            >
              {editingId ? 'EDIT ADDRESS' : 'ADD NEW ADDRESS'}
            </h2>

            <button
              type="button"
              onClick={handleGetCurrentLocation}
              disabled={gettingLocation}
              style={{
                width: '100%',
                background: '#000',
                color: '#fff',
                border: 'none',
                padding: '20px',
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                cursor: gettingLocation ? 'default' : 'pointer',
                fontWeight: 800,
                fontSize: '1rem',
                marginBottom: '48px',
                transition: 'all 0.3s',
              }}
            >
              <FaCrosshairs /> {gettingLocation ? 'LOCATING...' : 'AUTODETECT MY LOCATION'}
            </button>

            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '40px',
                  marginBottom: '40px',
                }}
              >
                {[
                  { label: 'Recipient Name', ph: 'Full legal name', key: 'name' },
                  { label: 'Primary Contact', ph: '10-digit mobile', key: 'phone', digits: 10 },
                  { label: 'Postal Code', ph: '6-digit PIN', key: 'pincode', digits: 6 },
                  { label: 'Neighborhood', ph: 'Locality / Area', key: 'locality' },
                ].map((f) => (
                  <div key={f.label}>
                    <label
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 900,
                        color: '#9CA3AF',
                        textTransform: 'uppercase',
                        letterSpacing: '1.5px',
                        marginBottom: '12px',
                        display: 'block',
                      }}
                    >
                      {f.label}
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder={f.ph}
                      inputMode={f.digits ? 'numeric' : undefined}
                      aria-invalid={Boolean(errors[f.key])}
                      {...register(f.key, {
                        // Numeric fields can only ever hold digits, capped at
                        // the length the schema (and the API) require.
                        onChange: f.digits
                          ? (e) => {
                              e.target.value = e.target.value.replace(/\D/g, '').slice(0, f.digits)
                            }
                          : undefined,
                      })}
                    />
                    {errors[f.key] && (
                      <div
                        style={{ color: '#DC2626', fontSize: 11, marginTop: 6, fontWeight: 600 }}
                      >
                        {errors[f.key].message}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: '40px' }}>
                <label
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 900,
                    color: '#9CA3AF',
                    textTransform: 'uppercase',
                    letterSpacing: '1.5px',
                    marginBottom: '12px',
                    display: 'block',
                  }}
                >
                  Logistical Address
                </label>
                <textarea
                  className="input-field"
                  placeholder="Street, Suite, Apartment details"
                  aria-invalid={Boolean(errors.street)}
                  {...register('street')}
                  style={{ minHeight: '140px', resize: 'none' }}
                />
                {errors.street && (
                  <div style={{ color: '#DC2626', fontSize: 11, marginTop: 6, fontWeight: 600 }}>
                    {errors.street.message}
                  </div>
                )}
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '40px',
                  marginBottom: '48px',
                }}
              >
                <div>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="City"
                    aria-invalid={Boolean(errors.city)}
                    {...register('city')}
                  />
                  {errors.city && (
                    <div style={{ color: '#DC2626', fontSize: 11, marginTop: 6, fontWeight: 600 }}>
                      {errors.city.message}
                    </div>
                  )}
                </div>
                <div>
                  <label
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 900,
                      color: '#9CA3AF',
                      textTransform: 'uppercase',
                      letterSpacing: '1.5px',
                      marginBottom: '12px',
                      display: 'block',
                    }}
                  >
                    State
                  </label>
                  <select
                    className="input-field"
                    aria-invalid={Boolean(errors.state)}
                    {...register('state')}
                  >
                    <option value="">Select State</option>
                    {apiStates.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  {errors.state && (
                    <div style={{ color: '#DC2626', fontSize: 11, marginTop: 6, fontWeight: 600 }}>
                      {errors.state.message}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: '60px' }}>
                <label
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 900,
                    color: '#9CA3AF',
                    textTransform: 'uppercase',
                    letterSpacing: '1.5px',
                    marginBottom: '20px',
                    display: 'block',
                  }}
                >
                  Classify Address As
                </label>
                <div style={{ display: 'flex', gap: '20px' }}>
                  {['Home', 'Work'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setValue('type', t, { shouldDirty: true })}
                      style={{
                        padding: '20px',
                        borderRadius: '20px',
                        border: '2px solid',
                        borderColor: type === t ? '#000' : '#F3F4F6',
                        background: type === t ? '#000' : 'white',
                        color: type === t ? '#fff' : '#6B7280',
                        fontWeight: 800,
                        cursor: 'pointer',
                        flex: 1,
                        transition: 'all 0.3s',
                        fontSize: '0.9rem',
                      }}
                    >
                      {t.toUpperCase()} ADDRESS
                    </button>
                  ))}
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '24px',
                  borderTop: '1px solid #F3F4F6',
                  paddingTop: '48px',
                }}
              >
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading}
                  style={{ flex: 2, padding: '24px', borderRadius: '20px', fontSize: '1.1rem' }}
                >
                  {loading ? 'SAVING...' : 'SAVE ADDRESS'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    resetForm()
                  }}
                  className="btn-outline"
                  style={{
                    flex: 1,
                    padding: '24px',
                    borderRadius: '20px',
                    fontSize: '1.1rem',
                    color: '#EF4444',
                    borderColor: '#FEE2E2',
                  }}
                >
                  DISCARD
                </button>
              </div>
            </form>
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(440px, 1fr))',
            gap: '40px',
          }}
        >
          {isPending && !showForm && <ListSkeleton rows={2} height={150} />}

          {!isPending && (addresses || []).length === 0 && !showForm && (
            <div
              style={{
                gridColumn: '1 / -1',
                textAlign: 'center',
                padding: '120px 40px',
                background: 'white',
                borderRadius: '40px',
                border: '1px solid #F3F4F6',
                boxShadow: 'var(--shadow)',
              }}
            >
              <div
                style={{
                  background: '#F9FAFB',
                  width: '100px',
                  height: '100px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 32px',
                }}
              >
                <FaMapMarkerAlt size={42} color="#D1D5DB" />
              </div>
              <h3 style={{ fontSize: '2rem', color: '#111827', marginBottom: '12px' }}>
                Address list is empty
              </h3>
              <p style={{ color: '#6B7280', fontSize: '1.1rem' }}>
                Add your first delivery address to proceed.
              </p>
            </div>
          )}

          {(addresses || []).map((addr, idx) => (
            <div
              key={addr._id || idx}
              style={{
                padding: '48px',
                background: 'white',
                border: '1px solid #F3F4F6',
                borderRadius: '40px',
                position: 'relative',
                boxShadow: 'var(--shadow)',
                transition: 'all 0.3s',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '32px',
                }}
              >
                <span
                  style={{
                    background: '#000',
                    color: 'white',
                    fontSize: '0.65rem',
                    fontWeight: 900,
                    padding: '6px 12px',
                    borderRadius: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '1.5px',
                  }}
                >
                  {addr.type || 'HOME'}
                </span>
                <div style={{ color: '#E5E7EB' }}>
                  <FaEllipsisV />
                </div>
              </div>

              <h4
                style={{
                  fontSize: '1.1rem',
                  fontWeight: 800,
                  color: 'var(--text-main)',
                  marginBottom: '4px',
                  letterSpacing: '-0.5px',
                }}
              >
                {addr.name}
              </h4>
              <p
                style={{
                  fontWeight: 800,
                  color: 'var(--text-muted)',
                  marginBottom: '12px',
                  fontSize: '0.85rem',
                }}
              >
                {addr.phone}
              </p>

              <div
                style={{
                  fontSize: '0.85rem',
                  color: 'var(--text-grey)',
                  lineHeight: '1.6',
                  marginBottom: '24px',
                  fontWeight: 500,
                }}
              >
                {addr.street}
                <br />
                {addr.locality}, {addr.city}
                <br />
                {addr.state} —{' '}
                <span style={{ fontWeight: 800, color: 'var(--text-main)' }}>{addr.pincode}</span>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '24px',
                  borderTop: '1px solid #F3F4F6',
                  paddingTop: '24px',
                }}
              >
                <button
                  onClick={() => handleEdit(addr)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#111827',
                    fontWeight: 900,
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    letterSpacing: '0.8px',
                  }}
                >
                  EDIT
                </button>
                <button
                  onClick={() => handleDelete(addr._id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#EF4444',
                    fontWeight: 900,
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    letterSpacing: '0.8px',
                  }}
                >
                  DELETE
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
