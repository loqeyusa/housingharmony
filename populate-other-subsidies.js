import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from "ws";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const sampleOtherSubsidies = [
  {
    clientName: "Lonelle Johnson",
    serviceStatus: "active",
    vendorNumber: "262668",
    vendorName: "14th Avenue South (11 Unit)",
    rentLateFee: null,
    site: "Cluster 2 - 14th Ave",
    cluster: "Cluster 2",
    subsidyStatus: "Receiving subsidy",
    grhStatusDate: null,
    subsidyProgram: "MHR",
    baseRent: "700.00",
    rentWePaid: "441.00",
    rentPaidMonthly: "441.00",
    subsidyReceived: "259.00",
    clientObligation: "700.00",
    lastLease: null,
    status: "active",
    notes: "Approved MHR subsidy"
  },
  {
    clientName: "Pamela Wright",
    serviceStatus: "active",
    vendorNumber: null,
    vendorName: "Logan (Apt 11,13)",
    rentLateFee: "104.00",
    site: "By-Receiving subsidy",
    cluster: "Cluster 4",
    subsidyStatus: "Receiving subsidy",
    grhStatusDate: null,
    subsidyProgram: "Other",
    baseRent: "1300.00",
    rentWePaid: "1073.00",
    rentPaidMonthly: "1073.00",
    subsidyReceived: "227.00",
    clientObligation: "1300.00",
    lastLease: null,
    status: "active",
    notes: "Other subsidy program"
  },
  {
    clientName: "Ricky Boyle",
    serviceStatus: "active",
    vendorNumber: null,
    vendorName: "Logan (Apt 11,13)",
    rentLateFee: "75.00",
    site: "Cluster 4 - Bio",
    cluster: "Cluster 4",
    subsidyStatus: "Discharged - N",
    grhStatusDate: null,
    subsidyProgram: "Other",
    baseRent: "1060.00",
    rentWePaid: "500.00",
    rentPaidMonthly: "500.00",
    subsidyReceived: "454.00",
    clientObligation: "1060.00",
    lastLease: null,
    status: "active",
    notes: "Discharged status"
  },
  {
    clientName: "Christina Johnson",
    serviceStatus: "active",
    vendorNumber: null,
    vendorName: "Newport Commons",
    rentLateFee: null,
    site: "Cluster 5 - Ne",
    cluster: "Cluster 5",
    subsidyStatus: "Receiving subsidy",
    grhStatusDate: null,
    subsidyProgram: "Other",
    baseRent: "750.00",
    rentWePaid: "488.00",
    rentPaidMonthly: "488.00",
    subsidyReceived: "232.00",
    clientObligation: "750.00",
    lastLease: null,
    status: "active",
    notes: "Newport Commons location"
  },
  {
    clientName: "Molly Sveum",
    serviceStatus: "active",
    vendorNumber: null,
    vendorName: "Newport Commons",
    rentLateFee: null,
    site: "Cluster 5 - Ne",
    cluster: "Cluster 5",
    subsidyStatus: "Receiving subsidy",
    grhStatusDate: null,
    subsidyProgram: "MSA",
    baseRent: "600.00",
    rentWePaid: "538.00",
    rentPaidMonthly: "538.00",
    subsidyReceived: "0.00",
    clientObligation: "600.00",
    lastLease: null,
    status: "active",
    notes: "MSA program participant"
  },
  {
    clientName: "Andrew Johnson",
    serviceStatus: "active",
    vendorNumber: null,
    vendorName: "Newport Commons",
    rentLateFee: null,
    site: "Cluster 5 - Ne",
    cluster: "Cluster 5",
    subsidyStatus: "Receiving subsidy",
    grhStatusDate: null,
    subsidyProgram: "MSA",
    baseRent: "1000.00",
    rentWePaid: "552.50",
    rentPaidMonthly: "552.50",
    subsidyReceived: "447.50",
    clientObligation: "1000.00",
    lastLease: null,
    status: "active",
    notes: "MSA program with subsidy"
  },
  {
    clientName: "Marvin Ames",
    serviceStatus: "active",
    vendorNumber: null,
    vendorName: "Market: 22nd Ave",
    rentLateFee: null,
    site: "Scattered / 22",
    cluster: "Scattered",
    subsidyStatus: "Receiving subsidy",
    grhStatusDate: null,
    subsidyProgram: "Other",
    baseRent: "970.00",
    rentWePaid: "970.00",
    rentPaidMonthly: "970.00",
    subsidyReceived: "230.00",
    clientObligation: null,
    lastLease: null,
    status: "active",
    notes: "Scattered site housing"
  },
  // Discharged clients
  {
    clientName: "Terra Jameson",
    serviceStatus: "discharged",
    vendorNumber: null,
    vendorName: "11th Ave (Triplex)",
    rentLateFee: null,
    site: "Cluster 3 - 26t",
    cluster: "Cluster 3",
    subsidyStatus: "Stopped subsidy",
    grhStatusDate: null,
    subsidyProgram: "MSA",
    baseRent: null,
    rentWePaid: null,
    rentPaidMonthly: null,
    subsidyReceived: null,
    clientObligation: null,
    lastLease: null,
    status: "discharged",
    notes: "Client discharged, subsidy stopped"
  },
  {
    clientName: "Andre Clark",
    serviceStatus: "discharged",
    vendorNumber: null,
    vendorName: "26th Street (8 Unit)",
    rentLateFee: null,
    site: "Cluster 3 - 26t",
    cluster: "Cluster 3",
    subsidyStatus: "Stopped subsidy",
    grhStatusDate: null,
    subsidyProgram: "MSA",
    baseRent: null,
    rentWePaid: null,
    rentPaidMonthly: null,
    subsidyReceived: null,
    clientObligation: null,
    lastLease: null,
    status: "discharged",
    notes: "Client discharged"
  },
  {
    clientName: "Lisa Larson",
    serviceStatus: "active",
    vendorNumber: null,
    vendorName: "Newport Commons",
    rentLateFee: null,
    site: "Cluster 5 - Ne",
    cluster: "Cluster 5",
    subsidyStatus: "Stopped subsidy",
    grhStatusDate: null,
    subsidyProgram: "MSA",
    baseRent: "600.00",
    rentWePaid: null,
    rentPaidMonthly: null,
    subsidyReceived: null,
    clientObligation: null,
    lastLease: null,
    status: "active",
    notes: "Subsidy stopped but still active"
  }
];

async function populateOtherSubsidies() {
  try {
    console.log('Starting to populate other subsidies data...');
    
    for (const subsidy of sampleOtherSubsidies) {
      const query = `
        INSERT INTO other_subsidies (
          client_name, service_status, vendor_number, vendor_name, rent_late_fee,
          site, cluster, subsidy_status, grh_status_date, subsidy_program,
          base_rent, rent_we_paid, rent_paid_monthly, subsidy_received,
          client_obligation, last_lease, status, notes, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), NOW())
      `;

      const values = [
        subsidy.clientName,
        subsidy.serviceStatus,
        subsidy.vendorNumber,
        subsidy.vendorName,
        subsidy.rentLateFee,
        subsidy.site,
        subsidy.cluster,
        subsidy.subsidyStatus,
        subsidy.grhStatusDate,
        subsidy.subsidyProgram,
        subsidy.baseRent,
        subsidy.rentWePaid,
        subsidy.rentPaidMonthly,
        subsidy.subsidyReceived,
        subsidy.clientObligation,
        subsidy.lastLease,
        subsidy.status,
        subsidy.notes
      ];

      await pool.query(query, values);
      console.log(`✓ Added other subsidy for: ${subsidy.clientName} - ${subsidy.vendorName}`);
    }

    console.log(`\n✅ Successfully populated ${sampleOtherSubsidies.length} other subsidies records!`);
    
    // Display summary
    const countQuery = 'SELECT COUNT(*) as total FROM other_subsidies';
    const result = await pool.query(countQuery);
    console.log(`📊 Total other subsidies in database: ${result.rows[0].total}`);
    
  } catch (error) {
    console.error('❌ Error populating other subsidies:', error);
  } finally {
    await pool.end();
  }
}

populateOtherSubsidies();