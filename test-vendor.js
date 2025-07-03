// Test single vendor creation
const testVendor = {
  name: "Abbott Northwestern Hospital",
  type: "healthcare",
  registrationNumber: "1234567890",
  grhType: "Hospital",
  contactPerson: "John Smith",
  keyPerson: "Dr. Sarah Johnson",
  phone: "(612) 863-4000",
  email: "info@abbottnorthwestern.com",
  address: "800 E 28th St, Minneapolis, MN 55407",
  website: "https://www.abbottnorthwestern.com",
  services: ["Emergency Care", "Cardiology", "Neurology", "Orthopedics"],
  serviceArea: "Minneapolis Metro",
  capacity: 631,
  dailyRate: "450.00",
  contractStartDate: "2024-01-01",
  contractEndDate: "2024-12-31",
  licenseStatus: "active",
  licenseExpirationDate: "2025-12-31",
  status: "active",
  notes: "Major teaching hospital with comprehensive services"
};

async function testVendorCreation() {
  try {
    const response = await fetch('http://localhost:5000/api/vendors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testVendor)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✓ Success:', result);
    } else {
      const error = await response.json();
      console.log('✗ Error:', error);
    }
  } catch (error) {
    console.log('✗ Exception:', error.message);
  }
}

testVendorCreation();