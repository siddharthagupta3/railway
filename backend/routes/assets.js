const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');

/* ─── Railway Assets Dummy Data ──────────────────────────────── */
const RAILWAY_ASSETS = [
  {
    id: 'RC-2024-001',
    name: 'Rail Clip',
    type: 'Rail Clip',
    mfgDate: '2022-03-15',
    installDate: '2022-06-10',
    status: 'Active',
    zone: 'Zone A',
    trackSection: 'Track 14B – Mumbai-Pune Corridor',
    coordinates: { lat: 18.9388, lng: 72.8354 },
    qrCode: 'QR-RC-2024-001-MUMBAI',
    inspections: [
      { note: 'Routine check – no issues found', date: '2024-11-20', inspector: 'Rajan Mehta' },
      { note: 'Torque verified, aligned correctly', date: '2024-08-05', inspector: 'Sunil Patil' },
      { note: 'Initial installation inspection passed', date: '2022-06-10', inspector: 'Arjun Sharma' },
    ],
  },
  {
    id: 'RL-2023-047',
    name: 'Rubber Liner',
    type: 'Liner',
    mfgDate: '2021-07-22',
    installDate: '2021-09-14',
    status: 'Damaged',
    zone: 'Zone C',
    trackSection: 'Track 07 – Delhi-Agra Express',
    coordinates: { lat: 28.6139, lng: 77.2090 },
    qrCode: 'QR-RL-2023-047-DELHI',
    inspections: [
      { note: 'Surface crack detected – flagged for replacement', date: '2024-12-01', inspector: 'Vikram Singh' },
      { note: 'Minor wear observed', date: '2024-06-18', inspector: 'Priya Nair' },
      { note: 'Passed initial quality check', date: '2021-09-14', inspector: 'Deepak Rao' },
    ],
  },
  {
    id: 'EP-2024-112',
    name: 'Elastic Pad',
    type: 'Pad',
    mfgDate: '2023-01-08',
    installDate: '2023-04-22',
    status: 'Active',
    zone: 'Zone B',
    trackSection: 'Track 22A – Chennai Metro Line 1',
    coordinates: { lat: 13.0827, lng: 80.2707 },
    qrCode: 'QR-EP-2024-112-CHENNAI',
    inspections: [
      { note: 'Elasticity within acceptable range', date: '2025-01-10', inspector: 'Karthik Iyer' },
      { note: 'Compression test passed', date: '2024-07-30', inspector: 'Anita Raj' },
      { note: 'Installed and baseline recorded', date: '2023-04-22', inspector: 'Mohan Das' },
    ],
  },
  {
    id: 'RC-2021-085',
    name: 'Rail Clip (Heavy Duty)',
    type: 'Rail Clip',
    mfgDate: '2020-11-03',
    installDate: '2021-02-17',
    status: 'Replaced',
    zone: 'Zone D',
    trackSection: 'Track 03 – Kolkata Suburban South',
    coordinates: { lat: 22.5726, lng: 88.3639 },
    qrCode: 'QR-RC-2021-085-KOLKATA',
    inspections: [
      { note: 'Replaced due to fatigue fracture', date: '2024-10-30', inspector: 'Bimal Ghosh' },
      { note: 'Stress fracture first detected', date: '2024-08-22', inspector: 'Sujoy Dey' },
      { note: 'Maintenance check – all clear', date: '2023-03-11', inspector: 'Ritu Banerjee' },
    ],
  },
  {
    id: 'RL-2023-200',
    name: 'HDPE Liner',
    type: 'Liner',
    mfgDate: '2022-08-30',
    installDate: '2022-12-01',
    status: 'Active',
    zone: 'Zone A',
    trackSection: 'Track 09 – Bangalore-Mysore High Speed',
    coordinates: { lat: 12.9716, lng: 77.5946 },
    qrCode: 'QR-RL-2023-200-BANGALORE',
    inspections: [
      { note: 'Thickness measurement within spec', date: '2025-01-05', inspector: 'Harish Kumar' },
      { note: 'No deformation under load test', date: '2024-05-14', inspector: 'Nisha Shetty' },
      { note: 'Post-install check passed', date: '2022-12-01', inspector: 'Ganesh Nair' },
    ],
  },
  {
    id: 'EP-2022-056',
    name: 'EVA Foam Pad',
    type: 'Pad',
    mfgDate: '2021-04-19',
    installDate: '2021-07-30',
    status: 'Damaged',
    zone: 'Zone F',
    trackSection: 'Track 31B – Hyderabad MMTS',
    coordinates: { lat: 17.3850, lng: 78.4867 },
    qrCode: 'QR-EP-2022-056-HYD',
    inspections: [
      { note: 'Delamination observed – scheduled for replacement', date: '2024-11-15', inspector: 'Ramesh Reddy' },
      { note: 'Slight moisture ingress detected', date: '2024-02-09', inspector: 'Swathi Rao' },
      { note: 'Installed and quality checked', date: '2021-07-30', inspector: 'Naresh Kumar' },
    ],
  },
];

/* ─── GET /api/assets ────────────────────────────────────────── */
router.get('/', protect, (req, res) => {
  const { status, zone, type, search } = req.query;

  let results = [...RAILWAY_ASSETS];

  if (status && status !== 'all') {
    results = results.filter((a) => a.status.toLowerCase() === status.toLowerCase());
  }
  if (zone && zone !== 'all') {
    results = results.filter((a) => a.zone.toLowerCase() === zone.toLowerCase());
  }
  if (type && type !== 'all') {
    results = results.filter((a) => a.type.toLowerCase() === type.toLowerCase());
  }
  if (search) {
    const q = search.toLowerCase();
    results = results.filter(
      (a) =>
        a.id.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.zone.toLowerCase().includes(q) ||
        a.trackSection.toLowerCase().includes(q)
    );
  }

  res.status(200).json({
    success: true,
    count: results.length,
    total: RAILWAY_ASSETS.length,
    data: results,
  });
});

/* ─── GET /api/assets/:id ────────────────────────────────────── */
router.get('/:id', protect, (req, res) => {
  const asset = RAILWAY_ASSETS.find(
    (a) => a.id.toLowerCase() === req.params.id.toLowerCase()
  );
  if (!asset) {
    return res.status(404).json({ success: false, message: 'Asset not found.' });
  }
  res.status(200).json({ success: true, data: asset });
});

/* ─── GET /api/assets/scan/:qrCode ──────────────────────────── */
router.get('/scan/:qrCode', protect, (req, res) => {
  const asset = RAILWAY_ASSETS.find(
    (a) => a.qrCode.toLowerCase() === req.params.qrCode.toLowerCase()
  );
  if (!asset) {
    return res.status(404).json({ success: false, message: 'No asset found for this QR code.' });
  }
  res.status(200).json({ success: true, message: 'Asset identified successfully.', data: asset });
});

/* ─── GET /api/assets/stats/summary ─────────────────────────── */
router.get('/stats/summary', protect, (req, res) => {
  const summary = {
    total: RAILWAY_ASSETS.length,
    active: RAILWAY_ASSETS.filter((a) => a.status === 'Active').length,
    damaged: RAILWAY_ASSETS.filter((a) => a.status === 'Damaged').length,
    replaced: RAILWAY_ASSETS.filter((a) => a.status === 'Replaced').length,
    byType: {
      railClip: RAILWAY_ASSETS.filter((a) => a.type === 'Rail Clip').length,
      liner: RAILWAY_ASSETS.filter((a) => a.type === 'Liner').length,
      pad: RAILWAY_ASSETS.filter((a) => a.type === 'Pad').length,
    },
    zones: [...new Set(RAILWAY_ASSETS.map((a) => a.zone))],
  };
  res.status(200).json({ success: true, data: summary });
});

module.exports = router;
