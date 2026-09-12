import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import * as productApi from '../../api/productApi'
import axios from 'axios'
import SellerOnboarding from './SellerOnboarding'
import { fetchStates, fetchDistricts } from '../../services/locationService'
import { 
  FaThLarge as DashboardIcon, 
  FaBox as InventoryIcon, 
  FaClipboardList as OrdersIcon, 
  FaUserCog as AccountIcon,
  FaPlus, FaTrashAlt, FaStore, FaSignOutAlt, FaMapMarkerAlt, FaPhone, FaSave, FaEdit, FaCheck, FaTimes, FaImage, FaChartLine
} from 'react-icons/fa'
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from 'recharts'
import { FaRobot, FaLightbulb, FaMagic, FaGavel, FaMoneyCheckAlt, FaTruck, FaExternalLinkAlt, FaSearch, FaSpinner, FaSync, FaGlobe } from 'react-icons/fa'



// ── Comprehensive Indian MSME Category → Size/Unit Config ──────────────────
const CATEGORY_SIZES = [

  // ── PHONES & ELECTRONICS (Colors) ──────────────────────────────────────────
  { keywords: ['phone', 'mobile', 'smartphone', 'iphone', 'tablet', 'samsung', 'oneplus', 'vivo', 'oppo', 'xiaomi', 'realme', 'poco'],
    label: 'Color Variant', sizes: ['Black', 'White', 'Blue', 'Green', 'Gold', 'Silver', 'Red', 'Pink'] },

  // ── FOOTWEAR ───────────────────────────────────────────────────────────────
  { keywords: ['shoe', 'footwear', 'chappal', 'sandal', 'slipper', 'boot', 'loafer',
      'sneaker', 'heel', 'mojari', 'jutti', 'kolhapuri', 'bata', 'hawai'],
    label: 'Shoe Size (India)', sizes: ['5', '6', '7', '8', '9', '10', '11', '12'] },

  // ── TOP WEAR ────────────────────────────────────────────────────────────────
  { keywords: ['shirt', 'kurta', 'kurti', 'top', 'blouse', 'tshirt', 't-shirt',
      'hoodie', 'jacket', 'sweater', 'sherwani', 'achkan', 'waistcoat', 'baniyan',
      'vest', 'sweatshirt', 'coat', 'blazer', 'kameez'],
    label: 'Apparel Size', sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'] },

  // ── ETHNIC / FULL-BODY WEAR ─────────────────────────────────────────────────
  { keywords: ['saree', 'sari', 'lehenga', 'dupatta', 'chunni', 'ghagra', 'anarkali',
      'salwar suit', 'churidar', 'sharara', 'kaftan'],
    label: 'Size', sizes: ['Free Size', 'S', 'M', 'L', 'XL', 'XXL'] },

  // ── BOTTOM WEAR ─────────────────────────────────────────────────────────────
  { keywords: ['pant', 'jean', 'trouser', 'salwar', 'palazzo', 'pajama', 'dhoti',
      'lungi', 'cargo', 'track pant', 'short', 'bermuda', 'churidar'],
    label: 'Waist Size', sizes: ['26', '28', '30', '32', '34', '36', '38', '40', '42'] },

  // ── FOOD STAPLES (Rice, Dal, Atta, Grains) ──────────────────────────────────
  { keywords: ['rice', 'basmati', 'dal', 'daal', 'atta', 'flour', 'maida', 'wheat',
      'lentil', 'grain', 'seed', 'pulses', 'poha', 'murmura', 'sooji', 'besan',
      'ragi', 'jowar', 'bajra', 'oats', 'suji'],
    label: 'Weight', sizes: ['500g', '1kg', '2kg', '5kg', '10kg', '25kg'] },

  // ── PICKLES, JAMS & SAUCES ──────────────────────────────────────────────────
  { keywords: ['pickle', 'achar', 'achaar', 'jam', 'jelly', 'murabba', 'chutney',
      'sauce', 'ketchup', 'paste', 'kasundi', 'dip', 'spread'],
    label: 'Pack Size', sizes: ['100g', '200g', '500g', '1kg', '2kg'] },

  // ── SPICES & MASALA ─────────────────────────────────────────────────────────
  { keywords: ['masala', 'spice', 'powder', 'haldi', 'turmeric', 'mirch', 'chilli',
      'cumin', 'jeera', 'coriander', 'dhaniya', 'pepper', 'garam masala',
      'biryani masala', 'rasam', 'sambar', 'curry', 'methi', 'ajwain', 'hing',
      'asafoetida', 'cardamom', 'elaichi', 'clove', 'laung'],
    label: 'Weight', sizes: ['50g', '100g', '200g', '500g', '1kg'] },

  // ── OILS & GHEE ─────────────────────────────────────────────────────────────
  { keywords: ['oil', 'ghee', 'butter', 'vanaspati', 'dalda', 'coconut oil',
      'mustard oil', 'groundnut oil', 'sunflower oil', 'sesame oil'],
    label: 'Volume / Weight', sizes: ['250ml', '500ml', '1L', '2L', '5L', '15L'] },

  // ── SWEETS & MITHAI ─────────────────────────────────────────────────────────
  { keywords: ['sweet', 'mithai', 'ladoo', 'barfi', 'halwa', 'peda', 'gulab jamun',
      'jalebi', 'rasgulla', 'rasmalai', 'mysore pak', 'kaju katli', 'kaju barfi',
      'gujiya', 'malpua', 'sandesh', 'kalakand'],
    label: 'Weight', sizes: ['100g', '250g', '500g', '1kg', '2kg'] },

  // ── SNACKS & NAMKEEN ────────────────────────────────────────────────────────
  { keywords: ['namkeen', 'snack', 'chips', 'biscuit', 'cookie', 'cracker', 'papad',
      'khakhra', 'mathri', 'murukku', 'chakli', 'sev', 'bhujia', 'mixture',
      'chivda', 'popcorn', 'wafer', 'fryums'],
    label: 'Pack Weight', sizes: ['50g', '100g', '200g', '500g', '1kg'] },

  // ── TEA & COFFEE ────────────────────────────────────────────────────────────
  { keywords: ['tea', 'chai', 'coffee', 'masala chai', 'green tea', 'black tea',
      'herbal tea', 'kadak chai', 'darjeeling'],
    label: 'Weight', sizes: ['100g', '250g', '500g', '1kg'] },

  // ── BEVERAGES & DRINKS ──────────────────────────────────────────────────────
  { keywords: ['juice', 'sharbat', 'squash', 'drink', 'beverage', 'syrup', 'sherbet',
      'lassi', 'buttermilk', 'chaas', 'nimbupani', 'aam panna', 'kokum'],
    label: 'Volume', sizes: ['200ml', '500ml', '1L', '2L', '5L'] },

  // ── DAIRY ───────────────────────────────────────────────────────────────────
  { keywords: ['milk', 'paneer', 'curd', 'yogurt', 'dahi', 'cheese', 'cream',
      'khoya', 'mawa', 'condensed milk', 'buttermilk', 'chaas'],
    label: 'Weight / Volume', sizes: ['200g', '500g', '1kg', '2kg', '5kg'] },

  // ── FRESH FRUITS & VEGETABLES ───────────────────────────────────────────────
  { keywords: ['vegetable', 'sabzi', 'sabji', 'fruit', 'phal', 'tomato', 'potato',
      'onion', 'aloo', 'pyaz', 'tamatar', 'spinach', 'mushroom', 'mango', 'banana',
      'apple', 'orange', 'corn', 'carrot', 'garlic', 'lemon', 'ginger', 'palak'],
    label: 'Weight', sizes: ['500g', '1kg', '2kg', '5kg', '10kg'] },

  // ── DRY FRUITS & NUTS ───────────────────────────────────────────────────────
  { keywords: ['dry fruit', 'dryfruit', 'cashew', 'kaju', 'almond', 'badam',
      'raisin', 'sultana', 'pista', 'pistachio', 'walnut', 'akhrot', 'date',
      'khajur', 'fig', 'anjeer', 'apricot', 'mixed nuts'],
    label: 'Weight', sizes: ['100g', '250g', '500g', '1kg'] },

  // ── HONEY & NATURAL SWEETENERS ──────────────────────────────────────────────
  { keywords: ['honey', 'shahad', 'jaggery', 'gur', 'sugar', 'khandsari', 'mishri',
      'palm sugar', 'maple', 'agave'],
    label: 'Weight', sizes: ['100g', '250g', '500g', '1kg', '2kg'] },

  // ── AYURVEDA & HERBAL ───────────────────────────────────────────────────────
  { keywords: ['ayurved', 'herbal', 'neem', 'tulsi', 'amla', 'ashwagandha',
      'triphala', 'chyawanprash', 'brahmi', 'giloy', 'moringa', 'aloevera',
      'aloe vera', 'shatavari', 'arjuna', 'guduchi', 'shankhpushpi'],
    label: 'Pack Size', sizes: ['50g', '100g', '200g', '500g', '1kg'] },

  // ── COSMETICS & BEAUTY ──────────────────────────────────────────────────────
  { keywords: ['cosmetic', 'beauty', 'skincare', 'lipstick', 'kajal', 'kohl',
      'mehndi', 'henna', 'sindoor', 'bindi', 'cream', 'lotion', 'serum',
      'shampoo', 'soap', 'face wash', 'moisturizer', 'toner', 'mask', 'hair oil',
      'conditioner', 'body wash', 'talcum', 'powder', 'deodorant', 'perfume',
      'cologne', 'nail polish', 'sunscreen'],
    label: 'Size (ml/g)', sizes: ['25ml', '50ml', '100ml', '200ml', '500ml'] },

  // ── JEWELLERY & ACCESSORIES ─────────────────────────────────────────────────
  { keywords: ['jewellery', 'jewelry', 'necklace', 'ring', 'bangle', 'bangles',
      'earring', 'anklet', 'bracelet', 'pendant', 'mangalsutra', 'maang tikka',
      'nose ring', 'chain', 'haar', 'kangan', 'payaal', 'kamarbandh'],
    label: 'Size', sizes: ['Free Size', 'Small', 'Medium', 'Large'] },

  // ── HANDICRAFTS & ARTWORK ───────────────────────────────────────────────────
  { keywords: ['handicraft', 'craft', 'pottery', 'ceramic', 'diyas', 'diya',
      'bamboo', 'cane', 'wicker', 'brass', 'copper', 'marble', 'terracotta',
      'handmade', 'sculpture', 'idol', 'statue', 'painting', 'artwork',
      'madhubani', 'warli', 'pattachitra'],
    label: 'Size', sizes: ['Small', 'Medium', 'Large', 'XL'] },

  // ── FABRIC & TEXTILES ───────────────────────────────────────────────────────
  { keywords: ['fabric', 'cloth', 'kapda', 'textile', 'silk', 'cotton', 'linen',
      'velvet', 'chiffon', 'georgette', 'khadi', 'jute', 'lace', 'net', 'organza',
      'crepe', 'denim', 'canvas', 'flannel'],
    label: 'Length (meters)', sizes: ['1m', '2m', '2.5m', '5m', '10m', '20m'] },

  // ── HOME DECOR ──────────────────────────────────────────────────────────────
  { keywords: ['decor', 'frame', 'candle', 'vase', 'cushion', 'pillow', 'curtain',
      'wall art', 'lamp', 'lantern', 'showpiece', 'figurine', 'clock', 'mirror'],
    label: 'Size', sizes: ['Small', 'Medium', 'Large', 'XL'] },

  // ── KITCHEN & UTENSILS ──────────────────────────────────────────────────────
  { keywords: ['kitchen', 'utensil', 'vessel', 'tawa', 'kadai', 'pressure cooker',
      'casserole', 'bowl', 'plate', 'thali', 'glass', 'jar', 'container',
      'spoon', 'spatula', 'ladle', 'peeler', 'grater', 'steamer'],
    label: 'Size', sizes: ['Small', 'Medium', 'Large', 'XL'] },

  // ── FURNITURE ───────────────────────────────────────────────────────────────
  { keywords: ['furniture', 'chair', 'table', 'cupboard', 'shelf', 'wardrobe',
      'almirah', 'sofa', 'divan', 'bed', 'mattress', 'desk', 'stool',
      'bookshelf', 'cabinet', 'rack'],
    label: 'Size', sizes: ['Single', 'Small', 'Medium', 'Large', 'King', 'Queen'] },

  // ── STATIONERY & BOOKS ──────────────────────────────────────────────────────
  { keywords: ['book', 'notebook', 'diary', 'stationery', 'pen', 'pencil',
      'eraser', 'ruler', 'scale', 'stapler', 'file', 'folder', 'notepad'],
    label: 'Units', sizes: ['1', '2', '5', '10', '20', '50'] },

  // ── ELECTRONICS & GADGETS ───────────────────────────────────────────────────
  { keywords: ['electronic', 'laptop', 'mobile', 'phone', 'tablet', 'gadget',
      'camera', 'tv', 'charger', 'cable', 'earphone', 'speaker', 'mouse',
      'keyboard', 'fan', 'bulb', 'led', 'inverter', 'battery'],
    label: 'Units', sizes: ['1', '2', '5', '10', '20'] },

  // ── HARDWARE & TOOLS ────────────────────────────────────────────────────────
  { keywords: ['hardware', 'tool', 'drill', 'hammer', 'screw', 'bolt', 'nut',
      'wire', 'pipe', 'fitting', 'valve', 'switch', 'socket', 'tape', 'cutter',
      'spanner', 'wrench', 'file', 'saw'],
    label: 'Units / Pack', sizes: ['1', '5', '10', '25', '50', '100'] },

  // ── AGRICULTURE INPUTS ──────────────────────────────────────────────────────
  { keywords: ['fertilizer', 'fertiliser', 'organic manure', 'manure', 'compost',
      'plant food', 'soil', 'potting mix', 'pest', 'insecticide', 'pesticide',
      'fungicide', 'herbicide', 'seeds packet', 'seedling'],
    label: 'Weight / Volume', sizes: ['500g', '1kg', '5kg', '10kg', '25kg', '50kg'] },

  // ── SPORTS & FITNESS ────────────────────────────────────────────────────────
  { keywords: ['sport', 'fitness', 'gym', 'yoga mat', 'dumbbell', 'cricket',
      'football', 'badminton', 'tennis', 'cycle', 'rope', 'gloves', 'bat', 'ball'],
    label: 'Size / Units', sizes: ['Small', 'Medium', 'Large', 'XL', 'Free Size'] },

  // ── LUGGAGE & BAGS ──────────────────────────────────────────────────────────
  { keywords: ['bag', 'purse', 'handbag', 'backpack', 'travel bag', 'trolley',
      'suitcase', 'wallet', 'beltbag', 'clutch', 'potli', 'jhola', 'tote'],
    label: 'Size', sizes: ['Small', 'Medium', 'Large', 'XL'] },

  // ── BABY & KIDS ─────────────────────────────────────────────────────────────
  { keywords: ['baby', 'kids', 'children', 'infant', 'toddler', 'toy', 'diaper',
      'napkin', 'romper', 'frock', 'school bag'],
    label: 'Age / Size', sizes: ['0-6m', '6-12m', '1-2yr', '2-3yr', '3-5yr', '5-8yr', '8-12yr'] },

  // ── PUJA & RELIGIOUS ────────────────────────────────────────────────────────
  { keywords: ['puja', 'pooja', 'agarbatti', 'incense', 'dhoop', 'camphor',
      'kapoor', 'kumkum', 'roli', 'chandan', 'sandal', 'flowers', 'garland',
      'maala', 'prasad', 'tilak', 'rosary'],
    label: 'Pack Size', sizes: ['Small', 'Medium', 'Large', 'Box of 10', 'Box of 25'] },
]

const DEFAULT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
function getSizeConfig(category) {
  if (!category) return { label: 'Size / Quantity', sizes: DEFAULT_SIZES }
  const c = category.toLowerCase().trim()
  for (const cfg of CATEGORY_SIZES) {
    if (cfg.keywords.some(k => c.includes(k))) return cfg
  }
  return { label: 'Size / Quantity', sizes: DEFAULT_SIZES }
}


function FinanceTab({ stats, onRefresh }) {
  const loanProducts = [
    { id: 1, bank: 'SBI MSME Loan', amount: '₹10,00,000', interest: '8.5% p.a.', link: 'https://sbi.co.in/web/business/msme/loans' },
    { id: 2, bank: 'HDFC Business Growth', amount: '₹25,00,000', interest: '10.2% p.a.', link: 'https://www.hdfcbank.com/personal/borrow/popular-loans/business-loan' },
    { id: 3, bank: 'SIDBI Micro-finance', amount: '₹5,00,000', interest: '7.0% p.a.', link: 'https://www.sidbi.in/en/products/direct-lending' },
  ]

  // Mock eligibility logic: Needs > ₹50,000 revenue AND > 10 orders
  const isEligible = (stats.totalSales || 0) > 50000 && (stats.totalOrders || 0) > 10

  return (
    <div className="animate-fade-in" style={{ padding: '0 20px' }}>
      <header style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: "'Sora', sans-serif" }}>Financial Institution Gateway</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Pre-approved micro-loans and credit facilities based on your marketplace performance.</p>
          </div>
          <button className="btn-outline" onClick={onRefresh} style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FaSync /> Refresh Status
          </button>
        </div>
      </header>

      <div className="glass-card" style={{ padding: '40px', marginBottom: '48px', borderLeft: '8px solid var(--secondary)', background: 'var(--border-soft)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-main)' }}>Micro-Loan Eligibility</h3>
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>
              Maintain consistent sales and order volume to unlock pre-approved credit facilities from our banking partners.
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Financial Status</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-main)' }}>{stats.totalSales > 0 ? 'ACTIVE' : 'PENDING'}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px' }}>
        {loanProducts.map(lp => (
          <div key={lp.id} className="glass-card" style={{ padding: '32px', border: '1px solid var(--border-soft)', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div style={{ background: 'var(--text-main)', color: 'white', padding: '12px', borderRadius: '12px' }}>
                <FaMoneyCheckAlt size={20} />
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>{lp.interest}</div>
            </div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', fontWeight: 800 }}>{lp.bank}</h4>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>Up to <strong style={{ color: 'var(--text-main)' }}>{lp.amount}</strong></div>
            
            <a 
              href="https://sbi.bank.in/web/business/home" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn-outline" 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '10px', 
                textDecoration: 'none',
                borderRadius: '99px',
                padding: '14px'
              }}
            >
              Apply Now <FaExternalLinkAlt size={14} />
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}

function SchemesTab() {
  const [filter, setFilter] = useState('')
  const [districtFilter, setDistrictFilter] = useState('All India')
  const [categoryFilter, setCategoryFilter] = useState('All Categories')
  const [allStates, setAllStates] = useState(['All India'])
  const [successScheme, setSuccessScheme] = useState(null)
  
  // Use cached data for instant initial render
  const [schemes, setSchemes] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_schemes')
      return cached ? JSON.parse(cached) : []
    } catch { return [] }
  })
  const [loadingSchemes, setLoadingSchemes] = useState(schemes.length === 0)

  useEffect(() => {
    fetchStates().then(states => {
      if(states && states.length) setAllStates(['All India', ...states])
    }).catch(err => setAllStates(['All India', 'Maharashtra', 'Karnataka', 'Gujarat']))
  }, [])

  const fetchSchemes = async () => {
    // Only show full-page loader if we have no cached data at all
    if (schemes.length === 0) setLoadingSchemes(true)
    try {
      const url = `/api/schemes?district=${encodeURIComponent(districtFilter)}&category=${encodeURIComponent(categoryFilter)}`
      const { data } = await axios.get(url, { withCredentials: true })
      setSchemes(data.data || [])
      localStorage.setItem('cached_schemes', JSON.stringify(data.data))
    } catch (err) {
      console.error('Failed to fetch schemes via API', err.response?.data || err.message)
    } finally {
      setLoadingSchemes(false)
    }
  }

  const [applying, setApplying] = useState(null)
  const handleApply = (schemeTitle) => {
    setApplying(schemeTitle)
    setTimeout(() => {
      setApplying(null)
      setSuccessScheme(schemeTitle)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 800)
  }

  useEffect(() => {
    fetchSchemes()
  }, [districtFilter, categoryFilter])

  const categories = ['All Categories', 'Manufacturing', 'Service', 'General', 'Retail']

  if (loadingSchemes) return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <FaSpinner className="spin" size={32} color="var(--secondary)" />
      <p style={{ marginTop: '16px', color: 'var(--text-muted)' }}>Fetching latest government schemes...</p>
    </div>
  )

  const filtered = schemes.filter(s => {
    const matchesText = (s.title + s.benefit).toLowerCase().includes(filter.toLowerCase())
    const matchesDistrict = districtFilter === 'All India' || s.district === districtFilter || s.district === 'All India'
    const matchesCategory = categoryFilter === 'All Categories' || s.category === categoryFilter || s.category === 'All Categories'
    return matchesText && matchesDistrict && matchesCategory
  })

  return (
    <div className="animate-fade-in" style={{ padding: '0 20px' }}>
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: "'Sora', sans-serif" }}>Government Scheme Portal</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Central & State government benefits for your business category.</p>
        
        {successScheme && (
          <div style={{ background: '#dcfce7', color: '#166534', padding: '16px 24px', borderRadius: '12px', marginTop: '24px', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #bbf7d0', animation: 'slideDown 0.4s ease' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FaCheck size={14} /> Application intent for "{successScheme}" recorded! Our district advisor will contact you soon.
            </span>
            <button onClick={() => setSuccessScheme(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 900, color: '#166534' }}>✕</button>
          </div>
        )}
        
        <div style={{ display: 'flex', gap: '20px', marginTop: '32px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <FaSearch style={{ position: 'absolute', left: '16px', top: '15px', color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder="Search schemes..." 
              className="input-field" 
              style={{ paddingLeft: '44px' }}
              value={filter}
              onChange={e => setFilter(e.target.value)}
            />
          </div>
          <select 
            className="input-field" 
            style={{ width: '200px' }}
            value={districtFilter}
            onChange={e => setDistrictFilter(e.target.value)}
          >
            {allStates.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select 
            className="input-field" 
            style={{ width: '200px' }}
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
          >
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        {filtered.length === 0 ? (
          <div className="glass-card" style={{ gridColumn: '1 / -1', padding: '60px', textAlign: 'center', border: '1px dashed var(--border)' }}>
             <FaGavel size={40} style={{ opacity: 0.1, marginBottom: '20px' }} />
             <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>No schemes found matching your filters. Try selecting 'All Categories'.</p>
             <button className="btn-outline" onClick={() => { setCategoryFilter('All Categories'); setDistrictFilter('All India'); }} style={{ marginTop: '20px' }}>Reset Filters</button>
          </div>
        ) : (
          filtered.map((s, i) => (
            <div key={i} className="glass-card" style={{ padding: '32px', border: '1px solid var(--border-soft)', background: 'white' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ padding: '8px 16px', background: '#e0e7ff', color: '#3730a3', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>{s.district}</div>
                <FaGavel color="var(--secondary)" />
              </div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '1.15rem', fontWeight: 800 }}>{s.title}</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600, marginBottom: '10px' }}>{s.benefit}</p>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                <strong>Eligibility:</strong> {s.eligible}
              </div>
              <button 
                className={successScheme === s.title ? "btn-outline" : "btn-primary"} 
                style={{ width: '100%', fontSize: '0.85rem', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: successScheme === s.title ? '#f0fdf4' : undefined, color: successScheme === s.title ? '#15803d' : undefined, borderColor: successScheme === s.title ? '#bbf7d0' : undefined }} 
                onClick={() => handleApply(s.title)}
                disabled={applying === s.title || successScheme === s.title}
              >
                {applying === s.title ? <FaSpinner className="spin" /> : successScheme === s.title ? <><FaCheck /> Applied Successfully</> : 'Apply Now'}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function LogisticsTab({ user, orders, onRefresh }) {
  const [trackingId, setTrackingId] = useState('')
  const [trackResult, setTrackResult] = useState(null)
  const [tracking, setTracking] = useState(false)
  const [trackError, setTrackError] = useState('')
  const [activeFilter, setActiveFilter] = useState('All')

  // Assign Carrier modal state
  const [assignModal, setAssignModal] = useState(null) // order object
  const [assignCarrier, setAssignCarrier] = useState('BlueDart Express')
  const [assignAWB, setAssignAWB] = useState('')
  const [assignStatus, setAssignStatus] = useState('Dispatched')
  const [assigning, setAssigning] = useState(false)

  const statusFilters = ['All', 'Ordered', 'Dispatched', 'Shipped', 'Delivered']

  const filteredOrders = (orders || []).filter(o =>
    activeFilter === 'All' ? true : o.status === activeFilter
  )

  const stats = {
    total:      orders?.length || 0,
    dispatched: orders?.filter(o => o.status === 'Dispatched' || o.status === 'Shipped').length || 0,
    delivered:  orders?.filter(o => o.status === 'Delivered').length || 0,
    pending:    orders?.filter(o => o.status === 'Ordered').length || 0,
  }

  const statusColors = {
    Ordered:    { bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6' },
    Dispatched: { bg: '#fefce8', text: '#92400e', dot: '#f59e0b' },
    Shipped:    { bg: '#f3e8ff', text: '#6d28d9', dot: '#8b5cf6' },
    Delivered:  { bg: '#f0fdf4', text: '#15803d', dot: '#22c55e' },
    Cancelled:  { bg: '#fef2f2', text: '#991b1b', dot: '#ef4444' },
  }

  // Real tracking: look up order by AWB
  const handleTrack = async () => {
    if (!trackingId.trim()) return
    setTracking(true); setTrackError(''); setTrackResult(null)
    try {
      const { data } = await axios.get(`/api/orders/track/${trackingId.trim()}`, { withCredentials: true })
      const order = data.data
      // Build timeline based on actual status
      const allStatuses = ['Ordered', 'Packed', 'Dispatched', 'Shipped', 'Delivered']
      const currIdx = allStatuses.indexOf(order.status)
      const events = allStatuses.slice(0, currIdx + 1).reverse().map((s, i) => ({
        event: s === 'Ordered' ? 'Order Confirmed' : s === 'Packed' ? 'Order Packed' : s === 'Dispatched' ? 'Picked Up by Courier' : s === 'Shipped' ? 'In Transit' : 'Delivered to Customer',
        time: i === 0 ? 'Latest update' : `Earlier`,
        location: order.shippingAddress?.city || 'India',
        done: true
      }))
      setTrackResult({ order, events })
    } catch (err) {
      setTrackError(err.response?.data?.message || 'No order found with this tracking ID')
    } finally {
      setTracking(false)
    }
  }

  // Assign carrier to order
  const handleAssign = async () => {
    if (!assignAWB.trim()) return alert('Enter an AWB / tracking number')
    setAssigning(true)
    try {
      await axios.put(`/api/orders/${assignModal._id}/assign-carrier`, {
        carrier: assignCarrier,
        trackingId: assignAWB.trim(),
        status: assignStatus
      }, { withCredentials: true })
      setAssignModal(null)
      setAssignAWB('')
      if (onRefresh) onRefresh()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to assign carrier')
    } finally {
      setAssigning(false)
    }
  }

  const CARRIERS = [
    { name: 'BlueDart Express', feature: 'Best Express', avgDays: '1–2d', rating: 4.8 },
    { name: 'Delhivery',        feature: 'Most Affordable', avgDays: '2–4d', rating: 4.6 },
    { name: 'DTDC',             feature: 'Wide Reach', avgDays: '2–5d', rating: 4.3 },
    { name: 'Ekart Logistics',  feature: 'Flipkart Network', avgDays: '2–3d', rating: 4.5 },
    { name: 'Shiprocket',       feature: 'Aggregator', avgDays: '2–5d', rating: 4.4 },
  ]

  const carrierLogos = { 'BlueDart Express': '🔵', 'Delhivery': '🟠', 'DTDC': '🟡', 'Ekart Logistics': '🟢', 'Shiprocket': '🚀' }

  return (
    <div className="animate-fade-in" style={{ padding: '0 20px' }}>

      {/* Assign Carrier Modal */}
      {assignModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
          onClick={() => setAssignModal(null)}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '40px', width: '90%', maxWidth: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Assign Carrier</h2>
              <button onClick={() => setAssignModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: '#94a3b8' }}>✕</button>
            </div>

            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px', marginBottom: '24px', fontSize: '0.9rem' }}>
              <div style={{ fontWeight: 700 }}>Order #{assignModal._id?.slice(-6).toUpperCase()}</div>
              <div style={{ color: 'var(--text-muted)', marginTop: '4px' }}>{assignModal.buyer?.name} · ₹{assignModal.totalAmount?.toLocaleString()}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{assignModal.shippingAddress?.street}, {assignModal.shippingAddress?.city}, {assignModal.shippingAddress?.state} – {assignModal.shippingAddress?.pincode}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Select Carrier</label>
                <select value={assignCarrier} onChange={e => setAssignCarrier(e.target.value)}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1.5px solid var(--border-soft)', fontSize: '1rem', fontWeight: 600, outline: 'none' }}>
                  {CARRIERS.map(c => <option key={c.name} value={c.name}>{carrierLogos[c.name]} {c.name}</option>)}
                </select>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>AWB / Tracking Number</label>
                  {assignCarrier === 'Shiprocket' && !assignAWB && (
                    <button 
                      onClick={async () => {
                        try {
                          const { data } = await axios.post(`/api/orders/${assignModal._id}/generate-waybill`, {}, { withCredentials: true });
                          setAssignAWB(data.trackingId);
                        } catch (err) { alert('Failed to generate AWB'); }
                      }}
                      style={{ background: 'none', border: 'none', color: 'var(--secondary)', fontWeight: 800, fontSize: '0.7rem', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      Auto-Generate AWB
                    </button>
                  )}
                </div>
                <input type="text" value={assignAWB} onChange={e => setAssignAWB(e.target.value.toUpperCase())}
                  placeholder="e.g. BD123456789IN"
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1.5px solid var(--border-soft)', fontSize: '1rem', fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Update Order Status</label>
                <select value={assignStatus} onChange={e => setAssignStatus(e.target.value)}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1.5px solid var(--border-soft)', fontSize: '1rem', fontWeight: 600, outline: 'none' }}>
                  <option value="Dispatched">Dispatched</option>
                  <option value="Shipped">Shipped</option>
                  <option value="Delivered">Delivered</option>
                </select>
              </div>
              <button onClick={handleAssign} disabled={assigning}
                style={{ width: '100%', padding: '16px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', marginTop: '8px', opacity: assigning ? 0.7 : 1 }}>
                {assigning ? 'Saving...' : `✔ Assign to ${assignCarrier}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: "'Sora', sans-serif", letterSpacing: '-0.04em', marginBottom: '6px' }}>Logistics Control</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Manage shipments, assign carriers, and track orders in real-time.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '10px 18px', borderRadius: '12px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }}></div>
          <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#15803d' }}>All Systems Operational</span>
        </div>
      </header>

      {/* KPI Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '20px', marginBottom: '40px' }}>
        {[
          { label: 'Total Orders',    value: stats.total,     color: '#1e40af', bg: '#eff6ff', border: '#bfdbfe' },
          { label: 'Pending Dispatch',value: stats.pending,   color: '#92400e', bg: '#fefce8', border: '#fde68a' },
          { label: 'In Transit',      value: stats.dispatched,color: '#6d28d9', bg: '#f3e8ff', border: '#ddd6fe' },
          { label: 'Delivered',       value: stats.delivered, color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
        ].map((k, i) => (
          <div key={i} style={{ padding: '20px 16px', borderRadius: '12px', background: k.bg, border: `1.2px solid ${k.border}` }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: k.color, lineHeight: 1 }}>{k.value}</div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: k.color, marginTop: '6px', textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.8 }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px', marginBottom: '40px' }}>
        {/* Real Tracking - Full Width */}
        <div className="glass-card" style={{ padding: '28px', background: 'white', border: '1px solid var(--border-soft)' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', fontWeight: 800 }}>📦 Track a Shipment</h3>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
            <input type="text" className="input-field" placeholder="Enter AWB / Tracking Number..."
              value={trackingId} onChange={e => setTrackingId(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleTrack()}
              style={{ flex: 1, borderRadius: '10px', fontFamily: 'monospace' }} />
            <button className="btn-primary" onClick={handleTrack} disabled={tracking}
              style={{ padding: '0 28px', borderRadius: '10px', minWidth: '110px' }}>
              {tracking ? <FaSync className="spin" /> : 'Track'}
            </button>
          </div>

          {trackError && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '12px 16px', borderRadius: '10px', color: '#991b1b', fontSize: '0.85rem', fontWeight: 600, marginBottom: '16px' }}>
              ⚠ {trackError}
            </div>
          )}

          {trackResult ? (() => {
            const o = trackResult.order
            const sc = statusColors[o.status] || { bg: '#f1f5f9', text: '#64748b', dot: '#94a3b8' }
            return (
              <div style={{ animation: 'fadeIn 0.3s ease' }}>
                <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>AWB: {o.trackingId}</div>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem', marginTop: '2px' }}>{o.logisticsProvider || 'Unknown Carrier'}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>{o.buyer?.name} · ₹{o.totalAmount?.toLocaleString()}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '20px', background: sc.bg, color: sc.text, fontWeight: 700, fontSize: '0.82rem' }}>
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: sc.dot }}></span>
                      {o.status}
                    </span>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                      {o.shippingAddress?.city}, {o.shippingAddress?.state}
                    </div>
                  </div>
                </div>
                <div style={{ position: 'relative', paddingLeft: '20px' }}>
                  <div style={{ position: 'absolute', left: '7px', top: 0, bottom: 0, width: '2px', background: '#e2e8f0' }} />
                  {trackResult.events.map((ev, i) => (
                    <div key={i} style={{ position: 'relative', marginBottom: '16px', paddingLeft: '16px' }}>
                      <div style={{ position: 'absolute', left: '-14px', top: '4px', width: '10px', height: '10px', borderRadius: '50%', background: i === 0 ? 'var(--secondary)' : '#cbd5e1', border: '2px solid white' }} />
                      <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{ev.event}</div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{ev.location}</div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })() : !trackError && (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
              <FaTruck size={36} style={{ opacity: 0.12, marginBottom: '12px', display: 'block', margin: '0 auto 12px' }} />
              <p style={{ fontSize: '0.88rem' }}>Enter an AWB number to see real-time tracking from your orders.</p>
            </div>
          )}
        </div>
      </div>

      {/* Shipments Table */}
      <div className="glass-card" style={{ background: 'white', border: '1px solid var(--border-soft)', overflow: 'hidden' }}>
        <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>All Shipments</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            {statusFilters.map(f => (
              <button key={f} onClick={() => setActiveFilter(f)} style={{
                padding: '6px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: '0.8rem', transition: 'all 0.2s',
                background: activeFilter === f ? 'var(--primary)' : '#f1f5f9',
                color: activeFilter === f ? 'white' : 'var(--text-muted)',
              }}>{f}</button>
            ))}
          </div>
        </div>
        {filteredOrders.length === 0 ? (
          <div style={{ padding: '64px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <FaTruck size={40} style={{ opacity: 0.1, marginBottom: '16px', display: 'block', margin: '0 auto 16px' }} />
            <p>No orders in this category yet.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Order ID', 'Customer', 'Items', 'Amount', 'Carrier', 'AWB', 'Status', 'Action'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(o => {
                const sc = statusColors[o.status] || { bg: '#f1f5f9', text: '#64748b', dot: '#94a3b8' }
                return (
                  <tr key={o._id} style={{ borderTop: '1px solid var(--border-soft)', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fafafe'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '14px 16px', fontWeight: 700, fontSize: '0.82rem', color: 'var(--primary)', fontFamily: 'monospace' }}>#{o._id?.slice(-6).toUpperCase()}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{o.shippingAddress?.name || o.buyer?.name || 'Customer'}</div>
                      <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{o.shippingAddress?.city || ''}</div>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '0.83rem', color: 'var(--text-muted)' }}>{o.items?.length || o.products?.length || 0} item(s)</td>
                    <td style={{ padding: '14px 16px', fontWeight: 700, fontSize: '0.92rem' }}>₹{o.totalAmount?.toLocaleString()}</td>
                    <td style={{ padding: '14px 16px', fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                      {o.logisticsProvider ? (
                        <span>{carrierLogos[o.logisticsProvider] || '📦'} {o.logisticsProvider}</span>
                      ) : <span style={{ color: '#cbd5e1' }}>—</span>}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '0.8rem', fontFamily: 'monospace', color: o.trackingId ? 'var(--primary)' : '#cbd5e1', cursor: o.trackingId ? 'pointer' : 'default', fontWeight: 600 }}
                      onClick={() => { if (o.trackingId) { setTrackingId(o.trackingId); setTimeout(handleTrack, 100) } }}>
                      {o.trackingId || '—'}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '20px', background: sc.bg, color: sc.text, fontWeight: 700, fontSize: '0.76rem', whiteSpace: 'nowrap' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: sc.dot, flexShrink: 0 }}></span>
                        {o.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {o.status !== 'Delivered' && o.status !== 'Cancelled' && (
                        <button onClick={() => { setAssignModal(o); setAssignCarrier(o.logisticsProvider || 'BlueDart Express'); setAssignAWB(o.trackingId || ''); setAssignStatus(o.status === 'Ordered' ? 'Dispatched' : o.status) }}
                          style={{ padding: '6px 14px', borderRadius: '8px', background: 'var(--primary)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                          {o.trackingId ? 'Update' : 'Assign'}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function AnalyticsTab({ forecastData, globalRecommendations, onRefresh }) {
  const items = forecastData || []
  const recs = globalRecommendations || ["Keep monitoring your sales trends to build a more accurate AI baseline."]

  return (
    <div className="animate-fade-in" style={{ padding: '0 20px' }}>
      <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: "'Sora', sans-serif", display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'var(--text-main)', padding: '10px', borderRadius: '12px', color: 'white', display: 'flex' }}>
              <FaRobot size={20} />
            </div>
            AI Optimization Engine
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '6px' }}>XGBoost-driven forecasting & Linear Programming for stock optimization.</p>
        </div>
        <button className="btn-outline" onClick={onRefresh} style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FaSync /> Re-train Model
        </button>
      </header>

      {/* Global AI Insights */}
      <div className="glass-card" style={{ padding: '24px', marginBottom: '32px', borderLeft: '6px solid var(--primary)', background: '#f8fafc' }}>
        <h3 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
          <FaMagic color="var(--primary)" /> Smart Fleet Recommendations
        </h3>
        <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {recs.map((r, i) => (
            <li key={i} style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: '0.8rem' }}>{r}</li>
          ))}
        </ul>
      </div>

      {/* Production Optimization Advisor */}
      <div style={{ marginBottom: '48px' }}>
        <h3 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FaLightbulb color="#eab308" /> Inventory Health Index
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
          {items.length === 0 ? (
            <div className="glass-card" style={{ padding: '32px', gridColumn: '1 / -1', textAlign: 'center', border: '1px dashed var(--border)' }}>
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>Insufficient data for AI modeling. Start listing and selling to activate insights.</p>
            </div>
          ) : (
            items.map(f => (
              <div key={f.product_id} className="glass-card" style={{ 
                padding: '32px', 
                borderTop: '6px solid',
                borderTopColor: (f.inventory_alert?.status === 'understock' ? '#ef4444' : f.inventory_alert?.status === 'overstock' ? '#f59e0b' : '#22c55e'),
                background: 'white'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                   <div>
                     <h4 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', fontWeight: 800 }}>{f.name}</h4>
                     <span style={{ fontSize: '0.7rem', padding: '4px 8px', background: '#f1f5f9', borderRadius: '4px', fontWeight: 800, textTransform: 'uppercase' }}>{f.trend}</span>
                   </div>
                   <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Stock Status</div>
                      <div style={{ fontWeight: 900, color: (f.inventory_alert?.status === 'understock' ? '#ef4444' : '#15803d') }}>{(f.inventory_alert?.status || 'optimal').toUpperCase()}</div>
                   </div>
                </div>

                {/* Stock & Sales Metrics */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                  <div style={{ padding: '12px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '10px', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
                    <div style={{ fontSize: '0.65rem', color: '#3b82f6', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>Total Sales</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 900 }}>{f.total_sold || 0} units</div>
                  </div>
                  <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                    <div style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>Current Stock</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 900 }}>{f.current_stock || 0} units</div>
                  </div>
                  <div style={{ padding: '12px', background: 'rgba(245, 158, 11, 0.05)', borderRadius: '10px', border: '1px solid rgba(245, 158, 11, 0.1)', gridColumn: 'span 2' }}>
                    <div style={{ fontSize: '0.65rem', color: '#f59e0b', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>AI Recommended Stock</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 900 }}>{f.inventory_alert?.recommended_stock || 0} units</div>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>AI Recommended Action:</div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: 1.4 }}>"{f.inventory_alert?.action || 'No action needed.'}"</div>
                </div>

                <div style={{ marginTop: '16px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Smart Insights</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(f.insights || []).map((ins, i) => (
                      <div key={i} style={{ display: 'flex', gap: '8px', fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 500 }}>
                        <FaCheck color="#22c55e" style={{ marginTop: '3px' }} /> {ins}
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: '32px', width: '100%', height: 180 }}>
                   <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={f.forecast}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', fontSize: '0.8rem' }} />
                        <Bar dataKey="quantity" name="Predicted Demand" radius={[4, 4, 0, 0]}>
                           {(f.forecast || []).map((entry, index) => (
                             <Cell key={`cell-${index}`} fill={index === 2 ? 'var(--secondary)' : 'var(--primary)'} />
                           ))}
                        </Bar>
                      </BarChart>
                   </ResponsiveContainer>
                </div>
              </div>
            ))
          )}
        </div>
      </div>


      </div>
  )
}

function SellerSidebar({ activeTab, setActiveTab, logout }) {
  const tabs = [
    { id: 'overview',   icon: <DashboardIcon />, label: 'Market Overview' },
    { id: 'inventory',  icon: <InventoryIcon />, label: 'Boutique Inventory' },
    { id: 'analytics',  icon: <FaChartLine />,   label: 'AI Analytics' },
    { id: 'orders',     icon: <OrdersIcon />,    label: 'Customer Orders' },
    { id: 'logistics',  icon: <FaTruck />,       label: 'Logistics Panel' },
    { id: 'finance',    icon: <FaMoneyCheckAlt />, label: 'Finance & Loans' },
    { id: 'schemes',    icon: <FaGavel />,        label: 'Govt Schemes' },
    { id: 'account',    icon: <AccountIcon />,   label: 'Hub Settings' },


  ]
  return (
    <div className="sidebar" style={{ background: 'white', borderRight: '1px solid var(--border-soft)', padding: '32px 0', height: '100vh', position: 'sticky', top: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto', flexShrink: 0 }}>
      <div className="sidebar-logo" style={{ padding: '0 32px 48px', gap: '12px', display: 'flex', alignItems: 'center' }}>
        <div style={{ background: 'var(--text-main)', color: 'white', padding: '10px', borderRadius: '12px', boxShadow: '0 6px 15px rgba(0,0,0,0.1)' }}>
          <FaStore size={18} />
        </div>
        <span style={{ fontSize: '1.3rem', fontWeight: 800, letterSpacing: '-1px', fontFamily: "'Sora', sans-serif", color: 'var(--text-main)' }}>
          Seller<span style={{ color: 'var(--secondary)', fontWeight: 600 }}>Hub</span>
        </span>
      </div>
      <nav className="sidebar-nav">
        {tabs.map(t => (
          <div 
            key={t.id} 
            className={`sidebar-link ${activeTab === t.id ? 'active' : ''}`} 
            onClick={() => setActiveTab(t.id)}
            style={{ 
              padding: '14px 32px', 
              fontSize: '0.85rem', 
              fontWeight: activeTab === t.id ? 700 : 500,
              color: activeTab === t.id ? 'var(--text-main)' : 'var(--text-muted)',
              borderRight: activeTab === t.id ? '3px solid var(--secondary)' : 'none',
              background: activeTab === t.id ? 'rgba(197, 160, 89, 0.05)' : 'transparent',
              transition: 'var(--transition)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <span style={{ opacity: activeTab === t.id ? 1 : 0.6, fontSize: '1.1rem' }}>{t.icon}</span> {t.label}
          </div>
        ))}
      </nav>
      <div 
        className="sidebar-link" 
        style={{ color: '#ef4444', marginTop: 'auto', padding: '18px 40px', fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '12px', opacity: 0.8 }} 
        onMouseEnter={e => e.currentTarget.style.opacity = 1}
        onMouseLeave={e => e.currentTarget.style.opacity = 0.8}
        onClick={logout}
      >
        <FaSignOutAlt /> Sign Out
      </div>
    </div>
  )
}

function OverviewTab({ user, stats, orders, products, onRefresh }) {
  const chartData = stats.dailyRevenue || []
  
  const pendingDispNum = orders?.filter(o => o.status === 'Ordered')?.length || 0;
  const lowStockNum = products?.filter(p => p.totalStock < (p.lowStockThreshold || 5))?.length || 0;
  
  return (
    <div className="animate-fade-in" style={{ padding: '0 20px' }}>
      <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '6px', letterSpacing: '-1px', fontFamily: "'Sora', sans-serif" }}>
            Hello, {user.name.split(' ')[0]}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500 }}>
            Performance overview for <strong style={{ color: 'var(--text-main)' }}>{user.businessName}</strong>
          </p>
        </div>
        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
          <button className="btn-outline" onClick={onRefresh} style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', width: 'fit-content' }}>
            <FaSync /> Refresh Data
          </button>
          <div style={{ color: '#059669', fontWeight: 800, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#059669' }}></div> Online & Active
          </div>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '40px', marginBottom: '80px' }}>
        {[
          { icon: <DashboardIcon />, bg: 'var(--text-main)', color: 'white', label: 'Total Revenue', value: `₹${stats.totalSales?.toLocaleString() || 0}`, sub: 'Lifetime Earnings' },
          { icon: <OrdersIcon />,    bg: 'var(--text-main)', color: 'white', label: 'Active Orders', value: stats.activeOrders || 0, sub: `${pendingDispNum} pending dispatch` },
          { icon: <InventoryIcon />, bg: 'var(--text-main)', color: 'white', label: 'Stock Items', value: products.length, sub: `${lowStockNum} items low stock` },
        ].map((c, i) => (
          <div key={i} className="glass-card" style={{ padding: '24px', border: '1px solid var(--border-soft)', background: 'white', position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{ fontSize: '1.3rem', color: 'white', background: 'var(--text-main)', padding: '12px', borderRadius: '12px' }}>{c.icon}</div>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: i === 0 ? 'var(--secondary)' : '#64748B' }}>{c.sub}</div>
            </div>
            <div>
              <h6 style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 800, marginBottom: '6px' }}>{c.label}</h6>
              <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: "'Sora', sans-serif" }}>{c.value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue Graph Section */}
      <div className="glass-card" style={{ padding: '32px', marginBottom: '48px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
              <FaChartLine color="var(--primary)" /> Revenue Growth
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
              Daily performance for <strong>{(stats.month || new Date().toLocaleString('default', { month: 'long' }))} {(stats.year || new Date().getFullYear())}</strong>
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Month Total</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>₹{(chartData.reduce((acc, curr) => acc + curr.revenue, 0) || 0).toLocaleString()}</div>
          </div>
        </div>

        <div style={{ width: '100%', height: 350 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="day" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: '#94a3b8' }}
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: '#94a3b8' }}
                tickFormatter={(value) => `₹${value}`}
              />
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '12px', 
                  border: 'none', 
                  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                  padding: '12px'
                }}
                formatter={(value) => [`₹${value.toLocaleString()}`, 'Revenue']}
                labelFormatter={(label) => `Day ${label}`}
              />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                stroke="var(--primary)" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorRevenue)" 
                animationDuration={2000}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '32px' }}>
        <h3 style={{ marginBottom: '24px' }}>Recent Sales</h3>
        {orders.length === 0
          ? <p style={{ color: 'var(--text-muted)' }}>No sales yet.</p>
          : <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {orders.slice(0, 5).map(order => (
                <div key={order._id} style={{ padding: '20px', borderRadius: '16px', background: 'white', border: '1px solid var(--border)', boxShadow: 'var(--shadow)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed #e2e8f0', paddingBottom: '16px' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '1.2rem' }}>{order.buyer?.name ? order.buyer.name.charAt(0) : '?'}</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{order.buyer?.name || 'Customer'}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                          <span style={{ color: '#cbd5e1' }}>|</span>
                          <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>Total: ₹{order.totalAmount}</span>
                        </div>
                      </div>
                    </div>
                    <span className={`status-badge status-${order.status.toLowerCase()}`}>{order.status}</span>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                    {order.products.filter(p => p.seller === user._id || p.seller === user.id).map(item => (
                      <div key={item._id} style={{ display: 'flex', gap: '16px', background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #f1f5f9', alignItems: 'center' }}>
                         <img src={item.product?.images?.[0] || 'https://via.placeholder.com/60'} style={{ width: '60px', height: '60px', objectFit: 'contain', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '4px' }} alt={item.product?.name} />
                         <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.75rem', color: 'white', background: 'var(--secondary)', display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>{item.product?.category}</div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.product?.name}</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                              <span style={{ color: 'var(--text-main)', fontWeight: 700 }}>Qty: {item.quantity}</span> 
                              <span style={{ margin: '0 6px', color: '#cbd5e1' }}>•</span> 
                              Size: {item.size}
                            </div>
                         </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
        }
      </div>
    </div>
  )
}

function InventoryTab({ products, onAddNew, onEdit, onStockChange, onDelete, onRefresh }) {
  return (
    <div className="animate-fade-in" style={{ padding: '0 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: "'Sora', sans-serif" }}>Boutique Inventory</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Manage your high-end product collection and stock levels.</p>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <button className="btn-outline" onClick={onRefresh} style={{ padding: '16px' }}>
            <FaSync />
          </button>
          <button className="btn-primary" onClick={onAddNew} style={{ padding: '16px 32px' }}>
            <FaPlus /> List New Item
          </button>
        </div>
      </div>

      {products.length === 0
        ? <div className="glass-card" style={{ padding: '100px', textAlign: 'center', border: '1px solid var(--border-soft)' }}>
            <InventoryIcon size={64} style={{ marginBottom: '24px', opacity: 0.1 }} />
            <h3 style={{ color: 'var(--text-main)', marginBottom: '8px' }}>No products yet</h3>
            <p style={{ color: 'var(--text-muted)' }}>Start your boutique by adding your first product.</p>
          </div>
        : <div className="glass-card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border-soft)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--background-alt)', borderBottom: '1px solid var(--border-soft)' }}>
                  {['Product Details', 'Price', 'Status', 'Stock Allocation', 'Actions'].map((h, i) => (
                    <th key={i} style={{ textAlign: (i === 4) ? 'right' : 'left', padding: '16px 24px', fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 800 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.map(p => {
                   const isLowStock = p.totalStock < (p.lowStockThreshold || 5);
                   return (
                    <tr key={p._id} style={{ borderBottom: '1px solid var(--border-soft)', transition: 'var(--transition)', background: isLowStock ? '#fff5f5' : 'transparent' }}>
                      <td style={{ padding: '24px 32px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                          <div style={{ width: '48px', height: '60px', borderRadius: '10px', overflow: 'hidden', background: 'var(--background-alt)', border: '1px solid var(--border-soft)' }}>
                            <img src={p.images[0] || 'https://via.placeholder.com/64'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.src = 'https://via.placeholder.com/64' }} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-main)' }}>{p.name}</div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '2px' }}>{p.category}</div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-main)' }}>₹{p.price.toLocaleString()}</div>
                      </td>
                      <td style={{ padding: '24px 32px' }}>
                        <span style={{ 
                          fontSize: '0.65rem', fontWeight: 800, padding: '4px 10px', borderRadius: '6px',
                          background: p.isActive ? '#dcfce7' : '#f1f5f9',
                          color: p.isActive ? '#166534' : '#64748b',
                          textTransform: 'uppercase'
                        }}>
                          {p.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '24px 32px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {p.sizes.map(s => {
                            const shortData = { 'Black': 'BLK', 'White': 'WHT', 'Blue': 'BLU', 'Green': 'GRN', 'Gold': 'GLD', 'Silver': 'SLV', 'Red': 'RED', 'Pink': 'PNK', 'xs': 'XS', 's': 'S', 'm': 'M', 'l': 'L', 'xl': 'XL', 'xxl': 'XXL', 'Small': 'S', 'Medium': 'M', 'Large': 'L', 'Extra Large': 'XL', 'Single': 'XS', 'Double': 'S', 'Queen': 'M', 'King': 'L', 'Free Size': 'FS', '5': '5', '6': '6', '7': '7', '8': '8' }
                            const shortLabel = shortData[s.size] || shortData[s.size.toLowerCase()] || s.size.replace(/[^A-Za-z0-9]/g, '').substring(0, 3).toUpperCase()
                            return (
                                <div key={s.size} style={{ display: 'flex', alignItems: 'center', background: 'white', border: '1.5px solid var(--border-soft)', borderRadius: '8px', overflow: 'hidden' }}>
                                  <span title={s.size} style={{ padding: '6px 8px', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', background: 'var(--background-alt)', borderRight: '1.5px solid var(--border-soft)', textAlign: 'center', minWidth: '32px' }}>
                                    {shortLabel}
                                  </span>
                                  <input 
                                    title={`Update stock for ${s.size}`}
                                    type="number" 
                                    defaultValue={s.stock} 
                                    onBlur={e => onStockChange(p._id, s.size, e.target.value)}
                                    style={{ width: '50px', border: 'none', background: 'transparent', padding: '6px', fontSize: '0.85rem', textAlign: 'center', fontWeight: 700, outline: 'none' }} 
                                  />
                                </div>
                            )
                          })}
                        </div>
                        {isLowStock && <div style={{ color: '#ef4444', fontSize: '0.7rem', fontWeight: 800, marginTop: '12px' }}>⚠️ LOW STOCK ALERT</div>}
                      </td>
                      <td style={{ padding: '24px 32px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                          <button className="btn-outline" style={{ padding: '10px', borderRadius: '10px', width: '40px', height: '40px' }} onClick={() => onEdit(p)}><FaEdit /></button>
                          <button className="btn-outline" style={{ padding: '10px', borderRadius: '10px', width: '40px', height: '40px', color: '#ef4444' }} onClick={() => onDelete(p._id)}><FaTrashAlt /></button>
                        </div>
                      </td>
                    </tr>
                   )
                })}
              </tbody>
            </table>
          </div>
      }
    </div>
  )
}


function OrdersTab({ orders, user, onUpdateStatus, onGenerateWaybill, onRefresh }) {
  return (
    <div className="animate-fade-in" style={{ padding: '0 20px' }}>

      <header style={{ marginBottom: '48px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, fontFamily: "'Sora', sans-serif" }}>Customer Orders</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>Manage fulfillments and track shipping status for your boutique sales.</p>
          </div>
          <button className="btn-outline" onClick={onRefresh} style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FaSync /> Sync Orders
          </button>
        </div>
      </header>

      {orders.length === 0
        ? <div className="glass-card" style={{ padding: '100px', textAlign: 'center', border: '1px solid var(--border-soft)' }}>
            <OrdersIcon size={64} style={{ marginBottom: '24px', opacity: 0.1 }} />
            <p style={{ color: 'var(--text-muted)' }}>No orders found yet.</p>
          </div>
        : orders.map(order => (
          <div key={order._id} className="glass-card" style={{ marginBottom: '32px', padding: 0, border: '1px solid var(--border-soft)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', background: 'var(--background-alt)', borderBottom: '1px solid var(--border-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>Reference #{order._id.slice(-8).toUpperCase()}</div>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)' }}>{order.buyer.name}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Status</span>
                <select 
                  value={order.status} 
                  onChange={e => onUpdateStatus(order._id, e.target.value)} 
                  className="input-field" 
                  style={{ width: '160px', padding: '10px', fontWeight: 700, borderRadius: '10px', border: '1.5px solid var(--border-soft)' }}
                >
                  {['Ordered', 'Packed', 'Dispatched', 'Shipped', 'Delivered', 'Cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {order.status === 'Packed' && !order.trackingId && (
                  <button 
                    className="btn-primary" 
                    onClick={() => onGenerateWaybill(order._id)}
                    style={{ padding: '10px 20px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px', background: '#6366f1' }}
                  >
                    <FaTruck /> Generate Waybill
                  </button>
                )}
              </div>
            </div>
            {order.trackingId && (
              <div style={{ background: '#eef2ff', padding: '12px 32px', borderBottom: '1px solid #e0e7ff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.85rem' }}>
                  <FaTruck color="#4f46e5" />
                  <span style={{ color: '#4338ca', fontWeight: 700 }}>Shiprocket AWB: <span style={{ fontFamily: 'monospace' }}>{order.trackingId}</span></span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6366f1', fontWeight: 800 }}>STATUS: READY FOR PICKUP</div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '48px', padding: '32px' }}>
              <div>
                <h5 style={{ marginBottom: '20px', fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Purchased Items</h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {order.products.filter(p => p.seller === user._id || p.seller === user.id).map((p, idx) => (
                    <div key={`${order._id}-${idx}`} style={{ display: 'flex', gap: '20px', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-soft)', alignItems: 'center' }}>
                      <img src={p.product?.images?.[0]} style={{ width: '64px', height: '64px', borderRadius: '8px', objectFit: 'contain', background: 'white' }} onError={e => { e.target.src = 'https://via.placeholder.com/64' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{p.product?.name}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>{p.size} <span style={{ margin: '0 8px', color: '#CBD5E1' }}>•</span> Qty: {p.quantity}</div>
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>₹{((p.price || p.product?.price || 0) * p.quantity).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ background: 'var(--background-alt)', padding: '32px', borderRadius: '20px', border: '1px solid var(--border-soft)' }}>
                <h5 style={{ marginBottom: '20px', fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Fulfillment Address</h5>
                <div style={{ display: 'flex', gap: '12px', fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--text-main)' }}>
                  <FaMapMarkerAlt color="var(--secondary)" style={{ marginTop: '6px', flexShrink: 0 }} />
                  <div>
                    <strong style={{ display: 'block', marginBottom: '4px' }}>{order.shippingAddress?.name || order.buyer.name}</strong>
                    {order.shippingAddress?.street}<br />
                    {order.shippingAddress?.city}, {order.shippingAddress?.state} – {order.shippingAddress?.pincode}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '20px', fontSize: '0.9rem', alignItems: 'center' }}>
                  <FaPhone color="var(--secondary)" /> 
                  <span style={{ fontWeight: 600 }}>{order.shippingAddress?.phone || '—'}</span>
                </div>
              </div>
            </div>
          </div>
        ))
      }
    </div>
  )
}

function AccountTab({ user, editProfile, setEditProfile, newBusinessName, setNewBusinessName, newDistrict, setNewDistrict, newState, setNewState, onSave }) {
  const [allStates, setAllStates] = useState([])
  const [allDistricts, setAllDistricts] = useState([])

  useEffect(() => {
    fetchStates().then(setAllStates)
  }, [])

  useEffect(() => {
    if (newState) {
      fetchDistricts(newState).then(setAllDistricts)
    } else {
      setAllDistricts([])
    }
  }, [newState])

  return (
    <div className="animate-fade-in" style={{ padding: '0 20px', maxWidth: '1000px' }}>
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: "'Sora', sans-serif" }}>Hub Settings</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>Manage your merchant profile and business identity.</p>
      </header>

      <div className="glass-card" style={{ padding: '56px', border: '1px solid var(--border-soft)' }}>
        <div style={{ display: 'flex', gap: '32px', alignItems: 'center', marginBottom: '40px' }}>
          <div style={{ 
            width: '80px', height: '80px', borderRadius: '50%', 
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))', 
            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', 
            fontSize: '2rem', fontWeight: 800, boxShadow: '0 8px 24px rgba(0,0,0,0.1)'
          }}>
            {user.name.charAt(0)}
          </div>
            <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>{user.name}</h2>
              <span style={{ fontSize: '0.65rem', background: '#dcfce7', color: '#166534', padding: '4px 10px', borderRadius: '6px', fontWeight: 900, letterSpacing: '1px' }}>VERIFIED SELLER</span>
            </div>
            <p style={{ color: 'var(--text-muted)', marginTop: '4px', fontSize: '0.85rem', fontWeight: 600 }}>{user.email}</p>
          </div>
          <button 
            className="btn-outline" 
            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 24px', borderRadius: '12px', fontWeight: 700 }}
            onClick={() => setEditProfile(!editProfile)}
          >
            {editProfile ? <FaTimes /> : <FaEdit />}
            {editProfile ? 'Cancel Edit' : 'Edit Profile'}
          </button>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginBottom: '40px' }}>
          <div className="input-group" style={{ gridColumn: 'span 2' }}>
            <label className="input-label" style={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px', marginBottom: '12px', display: 'block' }}>Registered Business Name</label>
            <div style={{ position: 'relative' }}>
              <input 
                className="input-field" 
                value={newBusinessName} 
                onChange={e => setNewBusinessName(e.target.value)} 
                readOnly={!editProfile} 
                style={{ 
                  background: editProfile ? 'white' : 'var(--background-alt)', 
                  paddingRight: '48px', borderRadius: '12px', border: '1.5px solid var(--border-soft)',
                  fontWeight: 700, fontSize: '1.1rem'
                }} 
              />
              <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', opacity: 0.6 }} onClick={() => setEditProfile(!editProfile)}>
                {editProfile ? <FaTimes color="#94a3b8" /> : <FaEdit color="var(--secondary)" size={18} />}
              </div>
            </div>
          </div>
          
          <div className="input-group">
            <label className="input-label" style={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px', marginBottom: '12px', display: 'block' }}>State</label>
            <select 
              className="input-field" 
              value={newState} 
              onChange={e => { setNewState(e.target.value); setNewDistrict('') }}
              disabled={!editProfile}
              style={{ background: editProfile ? 'white' : 'var(--background-alt)', borderRadius: '12px', border: '1.5px solid var(--border-soft)', fontWeight: 700, fontSize: '0.9rem' }}
            >
              <option value="">Select State</option>
              {allStates.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="input-group">
            <label className="input-label" style={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px', marginBottom: '12px', display: 'block' }}>District</label>
            <select 
              className="input-field" 
              value={newDistrict} 
              onChange={e => setNewDistrict(e.target.value)}
              disabled={!editProfile || !newState}
              style={{ background: editProfile ? 'white' : 'var(--background-alt)', borderRadius: '12px', border: '1.5px solid var(--border-soft)', fontWeight: 700, fontSize: '0.9rem' }}
            >
              <option value="">Select District</option>
              {allDistricts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div className="input-group" style={{ gridColumn: 'span 2' }}>
            <label className="input-label" style={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px', marginBottom: '12px', display: 'block' }}>PAN Identification Name</label>
            <input 
              className="input-field" 
              value={user.panCardName || '—'} 
              readOnly 
              style={{ background: 'var(--background-alt)', borderRadius: '12px', border: '1.5px solid var(--border-soft)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-muted)' }} 
            />
          </div>
        </div>
        
        {editProfile && (
          <button className="btn-primary" style={{ width: '100%', marginTop: '32px', padding: '18px', borderRadius: '12px' }} onClick={onSave}>
            <FaSave /> Confirm Profile Update
          </button>
        )}
      </div>
    </div>
  )
}

function ProductForm({ newProduct, setNewProduct, isEditing, onSubmit, onClose }) {
  const sizeConfig = getSizeConfig(newProduct.category)

  const updateImageField = (idx, val) => {
    const updated = [...newProduct.images]; updated[idx] = val
    setNewProduct({ ...newProduct, images: updated })
  }
  const removeImageField = idx => setNewProduct({ ...newProduct, images: newProduct.images.filter((_, i) => i !== idx) })
  const addImageField = () => setNewProduct({ ...newProduct, images: [...newProduct.images, ''] })

  const addRawMaterial = () => setNewProduct({...newProduct, rawMaterials: [...newProduct.rawMaterials, { name: '', quantityPerUnit: 1, stock: 0 }]})
  const updateRawMaterial = (idx, field, val) => {
    const updated = [...newProduct.rawMaterials]; 
    updated[idx] = { ...updated[idx], [field]: field === 'name' ? val : parseFloat(val) || 0 };
    setNewProduct({ ...newProduct, rawMaterials: updated })
  }
  const removeRawMaterial = idx => setNewProduct({ ...newProduct, rawMaterials: newProduct.rawMaterials.filter((_, i) => i !== idx) })

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }}>
      <div className="glass-card" style={{ width: '90%', maxWidth: '860px', maxHeight: '90vh', overflowY: 'auto', padding: '48px', position: 'relative' }}>
        <button style={{ position: 'absolute', top: '24px', right: '24px', background: 'none', border: 'none', cursor: 'pointer' }} onClick={onClose}><FaTimes size={20} color="#64748b" /></button>
        <h2 style={{ marginBottom: '8px', fontWeight: 800, fontSize: '2rem' }}>{isEditing ? 'Edit Product' : 'List New Product'}</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>Fill in product details. Advanced inventory options enabled.</p>

        <form onSubmit={onSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }}>
            <div className="input-group"><label className="input-label">Product Name</label>
              <input type="text" className="input-field" required value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} placeholder="e.g. Silk Saree" /></div>
            <div className="input-group"><label className="input-label">SKU (Optional)</label>
              <input type="text" className="input-field" value={newProduct.sku} onChange={e => setNewProduct({ ...newProduct, sku: e.target.value })} placeholder="Auto-generated if empty" /></div>
            <div className="input-group"><label className="input-label">Category</label>
              <input type="text" className="input-field" required value={newProduct.category} placeholder="e.g. Saree, Shirt..."
                onChange={e => {
                  const cat = e.target.value
                  const { sizes } = getSizeConfig(cat)
                  setNewProduct({ ...newProduct, category: cat, sizes: sizes.map(s => ({ size: s, stock: 0 })) })
                }} /></div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px', marginBottom: '24px' }}>
             <div className="input-group">
               <label className="input-label">Status</label>
               <select className="input-field" value={newProduct.isActive} onChange={e => setNewProduct({...newProduct, isActive: e.target.value === 'true'})}>
                 <option value="true">Active / Published</option>
                 <option value="false">Inactive / Hidden</option>
               </select>
             </div>
             <div className="input-group">
               <label className="input-label">Low Stock Alert at</label>
               <input type="number" className="input-field" value={newProduct.lowStockThreshold} onChange={e => setNewProduct({...newProduct, lowStockThreshold: parseInt(e.target.value) || 0})} />
             </div>
             <div className="input-group" style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '32px' }}>
               <input type="checkbox" checked={newProduct.autoDelist} onChange={e => setNewProduct({...newProduct, autoDelist: e.target.checked})} />
               <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Auto-delist when out of stock</label>
             </div>
          </div>

          <div className="input-group"><label className="input-label">Description</label>
            <textarea className="input-field" style={{ minHeight: '80px', resize: 'vertical' }} required value={newProduct.description} onChange={e => setNewProduct({ ...newProduct, description: e.target.value })} /></div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
            <div className="input-group"><label className="input-label">Price (₹)</label>
              <input type="number" className="input-field" required value={newProduct.price} onChange={e => setNewProduct({ ...newProduct, price: e.target.value })} /></div>
            <div className="input-group">
              <label className="input-label">Product Images (URLs)</label>
              {newProduct.images.map((url, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <FaImage style={{ position: 'absolute', left: 12, top: 15, color: '#94a3b8' }} />
                    <input type="text" className="input-field" style={{ paddingLeft: '40px' }} placeholder="https://image-url.com" value={url} onChange={e => updateImageField(idx, e.target.value)} />
                  </div>
                  {newProduct.images.length > 1 && (
                    <button type="button" onClick={() => removeImageField(idx)} style={{ background: '#fee2e2', border: 'none', color: '#ef4444', borderRadius: '8px', width: '45px', cursor: 'pointer' }}><FaTrashAlt /></button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addImageField} className="btn-outline" style={{ fontSize: '0.8rem', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}><FaPlus /> Add Image</button>
            </div>
          </div>

          <div style={{ marginBottom: '32px', background: '#f8fafc', padding: '24px', borderRadius: '16px', border: '1px solid var(--border)', marginTop: '20px' }}>
            <label className="input-label">Stock by {sizeConfig.label}</label>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '12px' }}>
              {newProduct.sizes.map((s, idx) => (
                <div key={s.size} style={{ textAlign: 'center', minWidth: '60px' }}>
                  <div style={{ fontSize: '0.7rem', marginBottom: '6px', fontWeight: 800, color: 'var(--primary)', whiteSpace: 'nowrap' }}>{s.size}</div>
                  <input type="number" min="0" className="input-field" style={{ padding: '8px', textAlign: 'center', width: '60px' }} value={s.stock}
                    onChange={e => {
                      const updatedSizes = [...newProduct.sizes]
                      updatedSizes[idx] = { ...updatedSizes[idx], stock: parseInt(e.target.value) || 0 }
                      setNewProduct({ ...newProduct, sizes: updatedSizes })
                    }} />
                </div>
              ))}
            </div>
          </div>

          {/* Raw Materials Tracker */}
          <div style={{ marginBottom: '32px', padding: '24px', border: '1px solid var(--secondary)', borderRadius: '16px', background: 'rgba(197, 160, 89, 0.05)' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
               <label className="input-label" style={{ margin: 0 }}>Raw Materials Tracker</label>
               <button type="button" onClick={addRawMaterial} className="btn-outline" style={{ fontSize: '0.75rem', padding: '6px 12px' }}>+ Add Material</button>
             </div>
             {newProduct.rawMaterials.length === 0 ? (
               <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>No raw materials tracked for this product.</p>
             ) : (
               <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                 {newProduct.rawMaterials.map((rm, idx) => (
                   <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 40px', gap: '12px', alignItems: 'center' }}>
                     <input type="text" className="input-field" placeholder="Material Name" value={rm.name} onChange={e => updateRawMaterial(idx, 'name', e.target.value)} />
                     <input type="number" className="input-field" placeholder="Qty / Unit" value={rm.quantityPerUnit} onChange={e => updateRawMaterial(idx, 'quantityPerUnit', e.target.value)} />
                     <input type="number" className="input-field" placeholder="In Stock" value={rm.stock} onChange={e => updateRawMaterial(idx, 'stock', e.target.value)} />
                     <button type="button" onClick={() => removeRawMaterial(idx)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}><FaTrashAlt /></button>
                   </div>
                 ))}
               </div>
             )}
          </div>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn-outline" onClick={onClose} style={{ padding: '12px 32px' }}>Cancel</button>
            <button type="submit" className="btn-primary" style={{ padding: '12px 40px' }}>{isEditing ? 'Save Changes' : 'Create Listing'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}


// ── Main Dashboard Component ─────────────────────────────────────────────────
export default function SellerDashboard() {
  const { user, setUser, logout, refreshUser } = useAuth()
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('seller_active_tab') || 'overview'
  })

  // Initialize from cache for "instant" feel
  const [products, setProducts] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_seller_products')
      return cached ? JSON.parse(cached) : []
    } catch { return [] }
  })
  
  const [orders, setOrders] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_seller_orders')
      return cached ? JSON.parse(cached) : []
    } catch { return [] }
  })
  
  const [stats, setStats] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_seller_stats')
      return cached ? JSON.parse(cached) : { totalSales: 0, activeOrders: 0 }
    } catch { return { totalSales: 0, activeOrders: 0 } }
  })

  const [forecast, setForecast] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_seller_forecast')
      return cached ? JSON.parse(cached) : []
    } catch { return [] }
  })

  const [globalRecs, setGlobalRecs] = useState([])
  const [isSyncing, setIsSyncing] = useState(false)

  const [loading, setLoading] = useState(products.length === 0 && orders.length === 0)
  const [showAddForm, setShowAddForm] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editId, setEditId] = useState(null)
  const [editProfile, setEditProfile] = useState(false)
  const [newBusinessName, setNewBusinessName] = useState(user?.businessName || '')
  const [newDistrict, setNewDistrict] = useState(user?.district || '')
  const [newState, setNewState] = useState(user?.state || '')

  // Removed onboarding_skipped as it should be mandatory for new sellers
  const [onboardingSkipped, setOnboardingSkipped] = useState(false);

  const fetchProducts = async () => {
    try { 
      const data = await productApi.getSellerProducts(); 
      setProducts(data.data) 
      localStorage.setItem('cached_seller_products', JSON.stringify(data.data))
    }
    catch (err) { console.error(err) }
  }
  const fetchOrders = async () => {
    try { 
      const { data } = await axios.get('/api/orders/seller', { withCredentials: true }); 
      setOrders(data.data) 
      localStorage.setItem('cached_seller_orders', JSON.stringify(data.data))
    }
    catch (err) { console.error(err) }
  }
  const fetchStats = async () => {
    try { 
      const { data } = await axios.get('/api/orders/seller/stats', { withCredentials: true }); 
      setStats(data.data) 
      localStorage.setItem('cached_seller_stats', JSON.stringify(data.data))
    }
    catch (err) { console.error(err) }
  }

  const fetchForecast = async () => {
    try {
      const { data } = await axios.get('/api/orders/seller/forecast', { withCredentials: true });
      setForecast(data.data)
      setGlobalRecs(data.global_recommendations || [])
      localStorage.setItem('cached_seller_forecast', JSON.stringify(data.data))
    } catch (err) { console.error(err) }
  }

  const refreshAll = async () => {
    setIsSyncing(true)
    try {
      await Promise.all([fetchProducts(), fetchOrders(), fetchStats(), fetchForecast()])
    } catch (err) {
      console.error('Background sync failed:', err)
    } finally {
      setIsSyncing(false)
    }
  }

  const blankProduct = {
    name: '', description: '', price: '', category: '', images: [''],
    sku: '', isActive: true, lowStockThreshold: 5, autoDelist: true,
    rawMaterials: [],
    sizes: [{ size: 'XS', stock: 0 }, { size: 'S', stock: 0 }, { size: 'M', stock: 0 },
            { size: 'L', stock: 0 }, { size: 'XL', stock: 0 }, { size: 'XXL', stock: 0 }]
  }

  const [newProduct, setNewProduct] = useState(blankProduct)

  const navigate = useNavigate()

  // Ensure we have latest data on mount
  useEffect(() => {
    if (refreshUser) refreshUser()
  }, [])

  useEffect(() => {
    if (!loading && !user) navigate('/login')
  }, [user, loading, navigate])

  useEffect(() => {
    localStorage.setItem('seller_active_tab', activeTab)
  }, [activeTab])
  
  // Sync local states when user data updates (e.g. after save)
  useEffect(() => {
    if (user) {
      setNewBusinessName(user.businessName || '')
      setNewDistrict(user.district || '')
      setNewState(user.state || '')
    }
  }, [user])

  // Sync profile fields whenever user object updates (e.g. after save)
  useEffect(() => {
    setNewBusinessName(user?.businessName || '')
    setNewState(user?.state || '')
    setNewDistrict(user?.district || '')
  }, [user])

  console.log('Seller Dashboard User:', user);
  
  // Robust isComplete check
  // Any user with a business name is considered "onboarded" and can access the dashboard.
  const isComplete = (!!user?.businessName) || (user?.isProfileComplete === true);
  
  const [connectionSlow, setConnectionSlow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!user && !loading) setConnectionSlow(true);
    }, 10000); // Increased to 10s for slower connections
    return () => clearTimeout(timer);
  }, [user, loading]);
  
  console.log('Seller Dashboard isComplete:', isComplete);

  useEffect(() => {
    if (isComplete) {
      // Trigger all fetches in background
      fetchProducts()
      fetchOrders()
      fetchStats()
      fetchForecast()
      setLoading(false)
    } else {
      setLoading(false)
    }
  }, [isComplete])

  // Safety: If auth is supposedly done but user is still null, something is wrong
  // but we shouldn't crash. Show loading if user is missing.
  // Never block the whole hub for loading if we have a user
  if (!user) return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: '20px', textAlign: 'center' }}>
      <div className="spinner-seller" style={{ width: '50px', height: '50px', border: '3px solid #e2e8f0', borderTop: '3px solid #0f172a', borderRadius: '50%', animation: 'spin-seller 1s linear infinite', marginBottom: '20px' }}></div>
      <style>{`@keyframes spin-seller { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>Initializing Seller Hub</h3>
      <p style={{ color: '#64748b', maxWidth: '300px', lineHeight: 1.5, fontSize: '0.9rem' }}>
        {connectionSlow ? "We're having trouble connecting to the server. Please ensure your backend is running on port 5000." : "Accelerating your business environment..."}
      </p>
      <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
        {connectionSlow && (
          <button 
            onClick={() => window.location.reload()}
            style={{ padding: '12px 24px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}
          >
            Retry Connection
          </button>
        )}
        <button 
          onClick={() => navigate('/login')}
          style={{ padding: '12px 24px', background: 'transparent', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}
        >
          Sign In Again
        </button>
      </div>
    </div>
  )


  const handleUpdateStatus = async (orderId, newStatus) => {
    try { await axios.put(`/api/orders/${orderId}/status`, { status: newStatus }, { withCredentials: true }); fetchOrders() }
    catch (err) { console.error(err) }
  }

  const handleGenerateWaybill = async (orderId) => {
    try {
      const { data } = await axios.post(`/api/orders/${orderId}/generate-waybill`, {}, { withCredentials: true });
      alert(`Success! Waybill Generated: ${data.trackingId}`);
      fetchOrders();
    } catch (err) { console.error(err); alert('Logistics API Error: ' + (err.response?.data?.message || err.message)) }
  }

  const handleOpenEdit = product => {
    setNewProduct({ 
      name: product.name, 
      description: product.description, 
      price: product.price, 
      category: product.category, 
      images: product.images.length > 0 ? product.images : [''], 
      sizes: product.sizes,
      sku: product.sku || '',
      isActive: product.isActive !== undefined ? product.isActive : true,
      lowStockThreshold: product.lowStockThreshold || 5,
      autoDelist: product.autoDelist !== undefined ? product.autoDelist : true,
      rawMaterials: product.rawMaterials || []
    })
    setIsEditing(true); setEditId(product._id); setShowAddForm(true)
  }

  const handleAddProduct = async e => {
    e.preventDefault()
    const validImages = newProduct.images.filter(url => url.trim() !== '')
    if (!validImages.length) return alert('Please add at least one valid image URL')
    try {
      const productToSave = { ...newProduct, images: validImages }
      if (isEditing) await productApi.updateProduct(editId, productToSave)
      else await productApi.addProduct(productToSave)
      handleCloseForm(); fetchProducts()
    } catch (err) { alert('Failed: ' + (err.response?.data?.message || err.message)) }
  }
  const handleCloseForm = () => { setShowAddForm(false); setIsEditing(false); setEditId(null); setNewProduct(blankProduct) }
  const handleDeleteProduct = async productId => {
    if (!window.confirm('Delete this product?')) return
    try { await productApi.deleteProduct(productId); setProducts(products.filter(p => p._id !== productId)) }
    catch (err) { alert('Failed to delete: ' + (err.response?.data?.message || err.message)) }
  }
  const handleStockChange = async (productId, size, newStock) => {
    try {
      const product = products.find(p => p._id === productId)
      const updatedSizes = product.sizes.map(s => s.size === size ? { ...s, stock: parseInt(newStock) || 0 } : s)
      const data = await productApi.updateProduct(productId, { sizes: updatedSizes })
      setProducts(products.map(p => p._id === productId ? data.data : p))
    } catch (err) { console.error(err) }
  }
  const handleUpdateProfile = async () => {
    try {
      const data = await productApi.updateProfile({ 
        businessName: newBusinessName,
        district: newDistrict,
        state: newState
      })
      setUser(data.user); setEditProfile(false); alert('Profile updated!')
      
      // Update local storage if needed to reflect profile completion
      fetchProducts(); fetchOrders(); fetchStats();
    } catch (err) { alert(err.response?.data?.message || 'Update failed') }
  }

  if (!isComplete) return (
    <SellerOnboarding onComplete={async () => {
      try { const { getMe } = await import('../../api/authApi'); const data = await getMe(); setUser(data.user) }
      catch (e) { /* ignore */ }
      fetchProducts(); fetchOrders(); fetchStats()
    }} />
  )

  return (
    <div className="seller-layout">
      {isSyncing && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: 'rgba(15, 23, 42, 0.9)', color: 'white', padding: '10px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem', fontWeight: 700, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', animation: 'fadeIn 0.3s ease' }}>
          <FaSync className="spin" size={14} /> Syncing Data...
        </div>
      )}
      <SellerSidebar activeTab={activeTab} setActiveTab={setActiveTab} logout={logout} />
      <main className="dashboard-content">
        {activeTab === 'overview'  && <OverviewTab user={user} stats={stats} orders={orders} products={products} onRefresh={refreshAll} />}
        {activeTab === 'inventory' && <InventoryTab products={products} onAddNew={() => setShowAddForm(true)} onEdit={handleOpenEdit} onStockChange={handleStockChange} onDelete={handleDeleteProduct} onRefresh={refreshAll} />}
        {activeTab === 'analytics' && <AnalyticsTab forecastData={forecast} globalRecommendations={globalRecs} onRefresh={refreshAll} />}
        {activeTab === 'orders'    && <OrdersTab orders={orders} user={user} onUpdateStatus={handleUpdateStatus} onGenerateWaybill={handleGenerateWaybill} onRefresh={refreshAll} />}
        {activeTab === 'logistics' && <LogisticsTab user={user} orders={orders} onRefresh={refreshAll} />}
        {activeTab === 'finance'   && <FinanceTab stats={stats} onRefresh={refreshAll} />}
        {activeTab === 'schemes'   && <SchemesTab />}
        {activeTab === 'account'   && <AccountTab user={user} editProfile={editProfile} setEditProfile={setEditProfile} newBusinessName={newBusinessName} setNewBusinessName={setNewBusinessName} newDistrict={newDistrict} setNewDistrict={setNewDistrict} newState={newState} setNewState={setNewState} onSave={handleUpdateProfile} />}



      </main>
      {showAddForm && <ProductForm newProduct={newProduct} setNewProduct={setNewProduct} isEditing={isEditing} onSubmit={handleAddProduct} onClose={handleCloseForm} />}
    </div>
  )
}
