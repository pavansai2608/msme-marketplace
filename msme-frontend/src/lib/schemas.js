import { z } from 'zod'

/**
 * Shared validation rules.
 *
 * These deliberately mirror what the API enforces, so the client never accepts
 * something the server will reject (or vice versa):
 *
 *   password  min 8   - User.password minlength: [8, ...] in models/User.js
 *   pincode   6 digits - savedAddresses.pincode match in models/User.js
 *   phone     10 digits - savedAddresses.phone match in models/User.js
 *
 * Client validation is a courtesy, not a control: the server re-checks all of
 * it. Keeping the two in step is what stops a form from "succeeding" into a
 * 400.
 */

const PHONE = /^\d{10}$/
const PINCODE = /^\d{6}$/

export const password = z.string().min(8, 'Password must be at least 8 characters')

export const email = z.string().min(1, 'Email is required').email('Enter a valid email address')

export const phone = z
  .string()
  .min(1, 'Phone number is required')
  .regex(PHONE, 'Phone must be exactly 10 digits')

export const pincode = z
  .string()
  .min(1, 'Pincode is required')
  .regex(PINCODE, 'Pincode must be exactly 6 digits')

// Optional but, when filled in, held to the same shape. '' has to be allowed
// explicitly: an untouched optional input submits an empty string, not
// undefined, and a bare regex would reject it.
export const optionalPhone = z
  .string()
  .refine((v) => v === '' || PHONE.test(v), 'Phone must be exactly 10 digits')

export const loginSchema = z.object({
  email,
  password,
})

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Full name is required'),
  email,
  password,
})

// The full address used by the saved-addresses page.
export const addressSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  phone,
  pincode,
  locality: z.string().trim().min(1, 'Locality is required'),
  street: z.string().trim().min(1, 'Address is required'),
  city: z.string().trim().min(1, 'City is required'),
  state: z.string().trim().min(1, 'State is required'),
  landmark: z.string().optional(),
  altPhone: optionalPhone.optional(),
  type: z.enum(['Home', 'Work']).default('Home'),
})

// Checkout collects a narrower address than the saved-addresses page. The
// shared fields keep identical rules; the difference is only which are asked
// for, so a checkout address is always a valid saved address too.
export const checkoutAddressSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  phone,
  street: z.string().trim().min(1, 'Address is required'),
  city: z.string().trim().min(1, 'City is required'),
  state: z.string().trim().min(1, 'State is required'),
  pincode,
})

const sizeRow = z.object({
  size: z.string().trim().min(1, 'Size is required'),
  stock: z.coerce.number().int('Stock must be a whole number').min(0, 'Stock cannot be negative'),
})

const imageUrl = z.string().trim().url('Each image must be a valid URL')

export const productSchema = z.object({
  name: z.string().trim().min(2, 'Product name is required'),
  description: z.string().trim().min(10, 'Give buyers at least a short description'),
  // Inputs hand back strings; coerce so the API receives a real number.
  price: z.coerce.number().positive('Price must be greater than zero'),
  category: z.string().trim().min(1, 'Category is required'),
  images: z.array(imageUrl).min(1, 'Add at least one image URL'),
  sizes: z.array(sizeRow).min(1, 'Add at least one size or variant'),
  district: z.string().optional(),
  state: z.string().optional(),
})

/**
 * The shape the product FORM works in.
 *
 * Identical to productSchema except that images are wrapped in objects:
 * react-hook-form's useFieldArray tracks rows by an injected id and silently
 * yields no fields at all for an array of bare strings. The URL rule itself is
 * shared, so the two cannot drift.
 */
export const productFormSchema = productSchema.extend({
  images: z.array(z.object({ url: imageUrl })).min(1, 'Add at least one image URL'),
})

/** Form values -> the payload the API expects (images back to plain strings). */
export const toProductPayload = (values) => ({
  ...values,
  images: (values.images || []).map((entry) => entry.url),
})

/** An existing product -> form values. */
export const toProductForm = (product) => ({
  ...product,
  images: (product.images?.length ? product.images : ['']).map((url) => ({ url })),
})
