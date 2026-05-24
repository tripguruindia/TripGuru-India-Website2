// dbSync.js - Google Sheets Synchronization Helpers for Nepal Portal

const SHEET_URL = import.meta.env.VITE_NEPAL_SHEET_URL || 'YOUR_GOOGLE_SHEET_WEB_APP_URL_HERE';

export async function fetchSheetDB() {
  if (!SHEET_URL || SHEET_URL === 'YOUR_GOOGLE_SHEET_WEB_APP_URL_HERE') {
    return null;
  }
  try {
    const response = await fetch(SHEET_URL);
    if (!response.ok) throw new Error("HTTP error " + response.status);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching Google Sheet Database:", error);
    return null;
  }
}

export async function syncUserToSheet(user) {
  if (!SHEET_URL || SHEET_URL === 'YOUR_GOOGLE_SHEET_WEB_APP_URL_HERE') {
    return;
  }
  try {
    const response = await fetch(SHEET_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'syncUser',
        data: {
          id: user.id,
          email: user.email,
          role: user.role,
          fullName: user.fullName || '',
          phone: user.phone || '',
          createdAt: user.created_at || new Date().toISOString(),
          details: {
            agencyName: user.agencyName || '',
            agencyAddress: user.agencyAddress || '',
            agencyPhone: user.agencyPhone || '',
            agencyEmail: user.agencyEmail || '',
            agencyWebsite: user.agencyWebsite || '',
            walletBalance: user.walletBalance || 0,
            address: user.address || ''
          }
        }
      })
    });
    return await response.json();
  } catch (error) {
    console.error("Error syncing User to Google Sheet:", error);
  }
}

export async function syncLeadToSheet(lead) {
  if (!SHEET_URL || SHEET_URL === 'YOUR_GOOGLE_SHEET_WEB_APP_URL_HERE') {
    return;
  }
  try {
    const response = await fetch(SHEET_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'syncLead',
        data: {
          id: lead.id,
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          createdAt: lead.created_at || new Date().toISOString(),
          source: lead.source || 'Nepal B2C Lead Capture Form'
        }
      })
    });
    return await response.json();
  } catch (error) {
    console.error("Error syncing Lead to Google Sheet:", error);
  }
}

export async function syncBookingToSheet(booking) {
  if (!SHEET_URL || SHEET_URL === 'YOUR_GOOGLE_SHEET_WEB_APP_URL_HERE') {
    return;
  }
  try {
    const response = await fetch(SHEET_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'syncBooking',
        data: {
          id: booking.id,
          clientName: booking.client_name,
          email: booking.email,
          phone: booking.phone,
          travelDate: booking.travel_date,
          itinerarySummary: booking.itinerary_summary,
          totalPrice: booking.total_price,
          status: booking.status || 'Confirmed',
          createdAt: booking.created_at || new Date().toISOString()
        }
      })
    });
    return await response.json();
  } catch (error) {
    console.error("Error syncing Booking to Google Sheet:", error);
  }
}
