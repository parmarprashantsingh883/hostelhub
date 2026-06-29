import Settings from '../models/Settings.js';

/**
 * Fetch the singleton settings doc, creating it (seeded from env defaults) on
 * first access so the app always has config to read. Other modules import this.
 */
export async function getSettings() {
  let s = await Settings.findOne({ key: 'app' });
  if (!s) {
    s = await Settings.create({
      key: 'app',
      business: {
        name: process.env.BUSINESS_NAME || 'Quarters',
        address: process.env.BUSINESS_ADDRESS || '',
        gstin: process.env.BUSINESS_GSTIN || '',
      },
      payments: {
        upiVpa: process.env.UPI_VPA || '',
        upiPayeeName: process.env.UPI_PAYEE_NAME || '',
      },
    });
  }
  return s;
}
