import { importCSVFile } from './server/csvImporter.js';

try {
  console.log('Starting CSV import...');
  const result = await importCSVFile('attached_assets/Pasted-Case-Number-Client-Name-Client-Number-Client-Address-Properties-Management-County-Cell-Number-Ema-1757188201646_1757188201648.txt', 1);
  console.log('Import result:', result);
} catch (error) {
  console.error('Import error:', error.message);
}