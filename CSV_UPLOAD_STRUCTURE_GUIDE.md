# CSV/Excel Upload Structure Guide

## Overview
Your housing management system now supports structured CSV/Excel uploads with automatic data parsing and cascading updates to all related database tables. The system maintains proper relational links between clients, properties, buildings, and management companies with foreign key constraints.

## Required CSV Column Structure

When uploading CSV or Excel files, ensure your file contains the following columns in this exact format:

### Core Required Columns

| Column Name | Description | Example | Required |
|-------------|-------------|---------|----------|
| Case Number | Unique client case identifier | HC001, SP2024-001 | No |
| Client Name | Full name (will be split into first/last) | John Smith, Maria Garcia | Yes |
| Client Number | Primary contact phone number | 555-123-4567 | No |
| Client Address | Current residential address | 123 Main St Minneapolis MN 55401 | No |
| Properties Management | Property management company name | Sunset Apartments Management, Riverside Properties LLC | Yes* |
| County | County where client is served | Hennepin County, Ramsey County | Yes |
| Cell Number | Mobile phone (alternative to Client Number) | 555-123-4567 | No |
| Email | Client email address | john.smith@email.com | No |
| Comment | Additional client notes | First time applicant, Single mother | No |
| Rental Office Address | Property management office address | 1500 Sunset Blvd Minneapolis MN 55408 | Yes* |
| Rent Amount | Monthly rent amount | 1200, $1,200.00 | No |
| County Amount | County contribution amount | 800, $800.00 | No |
| Notes | Administrative notes | Good tenant history, No pets | No |

\* Properties Management and Rental Office Address are used together to create unique building/property relationships

## Data Processing Flow

### 1. Building Creation/Lookup
- System checks if a building exists with the combination of:
  - Properties Management (as landlord name)
  - Rental Office Address (as building address)
- If not found, creates new building with:
  - Name: Properties Management value
  - Address: Rental Office Address value
  - Landlord Name: Properties Management value
  - Company ID: 1 (default)

### 2. Property Creation/Lookup
- System checks if a property exists within the building with:
  - Name: Properties Management value
  - Building ID: From step 1
- If not found, creates new property with:
  - Name: Properties Management value
  - Rent Amount: From Rent Amount column
  - Default bedrooms/bathrooms based on rent range
  - Building foreign key reference

### 3. County Normalization
- System checks if county exists in counties table
- If not found, creates new county record
- Maintains both text field (backward compatibility) and potential future foreign key

### 4. Client Creation/Update
- System checks for existing client by name and company
- Creates new client or updates existing with:
  - Proper foreign key references to property and building
  - All contact and financial information
  - Status set to 'active'

## Sample CSV Structure

```csv
Case Number,Client Name,Client Number,Client Address,Properties Management,County,Cell Number,Email,Comment,Rental Office Address,Rent Amount,County Amount,Notes
HC001,John Smith,555-123-4567,123 Main St Minneapolis MN 55401,Sunset Apartments Management,Hennepin County,555-123-4567,john.smith@email.com,First time applicant,1500 Sunset Blvd Minneapolis MN 55408,1200,800,Good tenant history
HC002,Maria Garcia,555-234-5678,456 Oak Ave Minneapolis MN 55402,Riverside Properties LLC,Hennepin County,555-234-5678,maria.garcia@email.com,Single mother with one child,2200 Riverside Dr Minneapolis MN 55454,950,650,Reliable payment history
HC003,Michael Johnson,555-345-6789,789 Pine Rd Minneapolis MN 55403,Sunset Apartments Management,Hennepin County,555-345-6789,m.johnson@email.com,Recent graduate,1500 Sunset Blvd Minneapolis MN 55408,1100,700,First apartment
```

## Data Validation Rules

### Automatic Data Handling
- **Missing Properties Management**: Row will be skipped
- **Missing Client Name**: Row will be skipped
- **Missing Email**: System generates default email format
- **Missing Phone**: System assigns default phone number
- **Missing Amounts**: Defaults to 0.00
- **Duplicate Clients**: System updates existing client data

### Data Cleaning
- Phone numbers are cleaned and formatted
- Currency amounts have symbols removed
- Names are properly capitalized
- Empty fields are handled gracefully

## Upload Results

After successful upload, you'll receive:
- **Clients Created**: Number of new client records
- **Properties Created**: Number of new property records  
- **Buildings Created**: Number of new building records

## Best Practices

1. **Use Consistent Naming**: Keep property management names consistent across rows
2. **Complete Addresses**: Provide full addresses for better building matching
3. **Verify Counties**: Use standard county names (e.g., "Hennepin County", "Ramsey County")
4. **Clean Data**: Remove extra spaces and special characters
5. **Test Small Batches**: Upload a few rows first to verify format

## Troubleshooting

### Common Issues:
- **"Property management name missing"**: Ensure Properties Management column has values
- **"Building creation failed"**: Check that Rental Office Address is provided
- **"Client creation failed"**: Verify Client Name column has first and last names

### File Format Support:
- ✅ CSV files (.csv)
- ✅ Excel files (.xlsx, .xls)
- ❌ Other formats not supported

## Database Impact

Your upload will create/update records in:
- **clients** table (with foreign key references)
- **properties** table (with normalized names)
- **buildings** table (with landlord information)
- **counties** table (reference data)

All relationships are maintained through proper foreign key constraints, ensuring data consistency and enabling powerful querying capabilities across your entire housing management system.