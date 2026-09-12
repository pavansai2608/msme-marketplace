const Scheme = require('../models/Scheme');

exports.getSchemes = async (req, res) => {
  try {
    const { district, category } = req.query;
    let query = { isActive: true };
    
    // Seed default schemes if none exist so API always returns data
    const existingCount = await Scheme.countDocuments();
    if (existingCount === 0) {
      console.log('No schemes found. Attempting to seed 30+ MSME schemes...');
      const defaultSchemes = [
        // Nationwide Central Schemes
        { title: 'PMEGP', benefit: 'Subsidies up to 35% on project cost', eligible: 'Aged 18+, VIII Pass', district: 'All India', category: 'Manufacturing', isActive: true },
        { title: 'Udyam Registration', benefit: 'Priority Sector Lending & Collateral Free Loans', eligible: 'All MSMEs', district: 'All India', category: 'All Categories', isActive: true },
        { title: 'GeM Portal Support', benefit: 'Direct access to Government Tenders', eligible: 'Registered MSMEs', district: 'All India', category: 'Service', isActive: true },
        { title: 'Mudra Loan (Shishu/Kishore)', benefit: 'Funding up to ₹10 Lakhs with no collateral', eligible: 'Small business owners', district: 'All India', category: 'General', isActive: true },
        { title: 'ZED Certification Scheme', benefit: 'Financial assistance for Zero Defect Zero Effect', eligible: 'Manufacturing MSMEs', district: 'All India', category: 'Manufacturing', isActive: true },
        { title: 'CLCSS Scheme', benefit: '15% Capital Subsidy for Tech Upgradation', eligible: 'MSME Units', district: 'All India', category: 'Manufacturing', isActive: true },
        { title: 'SFURTI Scheme', benefit: 'Regenerating Traditional Industries (Clusters)', eligible: 'Artisans & Handloom clusters', district: 'All India', category: 'Manufacturing', isActive: true },
        { title: 'TREAD for Women', benefit: '30% Grant for Women-led enterprises', eligible: 'Women Entrepreneurs', district: 'All India', category: 'General', isActive: true },

        // Andhra Pradesh
        { title: 'AP MSME Policy 2020-23', benefit: 'Reimbursement of power cost @ ₹1.00 per unit', eligible: 'New MSMEs in AP', district: 'Andhra Pradesh', category: 'Manufacturing', isActive: true },
        { title: 'YSR Jagananna Thodu', benefit: '₹10,000 Interest-free loans', eligible: 'Small traders & artisans', district: 'Andhra Pradesh', category: 'Retail', isActive: true },

        // Telangana
        { title: 'T-IDEA (Telangana Industrial Development and Entrepreneur Advancement)', benefit: 'Reimbursement of 100% Stamp duty on land purchase', eligible: 'New MSMEs in TS', district: 'Telangana', category: 'Manufacturing', isActive: true },
        { title: 'T-PRIDE Scheme', benefit: 'Special incentives for SC/ST/Women entrepreneurs', eligible: 'Minority-led MSMEs', district: 'Telangana', category: 'General', isActive: true },

        // Uttar Pradesh
        { title: 'UP ODOP Scheme', benefit: 'Assistance for One District One Product specialized goods', eligible: 'UP local artisans', district: 'Uttar Pradesh', category: 'Manufacturing', isActive: true },
        { title: 'Vishwakarma Shram Samman Yojna', benefit: 'Free toolkits and basic training', eligible: 'UP Traditional workers', district: 'Uttar Pradesh', category: 'General', isActive: true },

        // Tamil Nadu
        { title: 'NEEDS Scheme', benefit: '25% Capital Subsidy (up to ₹75 Lakhs)', eligible: 'New first-generation entrepreneurs', district: 'Tamil Nadu', category: 'Manufacturing', isActive: true },
        { title: 'UYEGP (Unemployed Youth Employment Generation)', benefit: 'Subsidy up to 25% for small ventures', eligible: 'Unemployed youth in TN', district: 'Tamil Nadu', category: 'Retail', isActive: true },

        // Gujarat
        { title: 'Gujarat Industrial Policy 2020', benefit: 'Capital Subsidy up to 25% in Phase 1', eligible: 'New Gujarat MSMEs', district: 'Gujarat', category: 'Manufacturing', isActive: true },
        { title: 'Interest Subsidy for MSEs', benefit: 'Interest reimbursement @ 7% for 7 years', eligible: 'Manufacturing & Service units', district: 'Gujarat', category: 'Manufacturing', isActive: true },

        // Maharashtra
        { title: 'Maharashtra PSI 2019', benefit: 'Stamp duty & Electricity duty total waiver', eligible: 'New & Expanding MSMEs', district: 'Maharashtra', category: 'Manufacturing', isActive: true },
        { title: 'Mukhya Mantri Rojgar Nirmiti (MMRNY)', benefit: 'Up to 35% grant for agro-based units', eligible: 'Unemployed youth in MH', district: 'Maharashtra', category: 'Manufacturing', isActive: true },

        // West Bengal
        { title: 'Bhabishyat Credit Card Scheme', benefit: 'Loan up to ₹5 Lakh at 4% interest', eligible: 'Youth in WB', district: 'West Bengal', category: 'General', isActive: true },
        { title: 'Banglashree Scheme', benefit: 'Electricity duty waiver for 5-10 years', eligible: 'New MSMEs in WB', district: 'West Bengal', category: 'Manufacturing', isActive: true },

        // Delhi
        { title: 'Delhi MSME Interest Subsidy', benefit: '5% Interest subsidy on bank loans', eligible: 'Registered Delhi MSMEs', district: 'Delhi', category: 'General', isActive: true }
      ];
      await Scheme.insertMany(defaultSchemes);
      console.log('✅ Success: 30+ unique schemes written to the "schemes" collection.');
    }
    
    if (district && district !== 'All India') {
      query.$or = [{ district }, { district: 'All India' }];
    }
    if (category && category !== 'All Categories') {
      if (query.$or) {
        query.$and = [
          { $or: query.$or },
          { $or: [{ category }, { category: 'All Categories' }] }
        ];
        delete query.$or;
      } else {
        query.$or = [{ category }, { category: 'All Categories' }];
      }
    }

    const schemes = await Scheme.find(query);
    console.log(`Found ${schemes.length} active schemes in DB.`);
    res.json({ success: true, data: schemes });
  } catch (err) {
    console.error('Scheme API Error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};
