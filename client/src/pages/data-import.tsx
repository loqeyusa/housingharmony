import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Upload, Download, FileText, Database, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface TableOption {
  key: string;
  label: string;
  description: string;
}

interface TableSchema {
  required: string[];
  optional: string[];
}

interface CsvPreview {
  headers: string[];
  rows: any[];
  totalRows: number;
  filePath: string;
}

interface ImportResult {
  success: boolean;
  summary: {
    successful: number;
    failed: number;
    totalRows: number;
    errors: Array<{
      row: number;
      error: string;
      data: any;
    }>;
  };
}

export default function DataImport() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [csvPreview, setCsvPreview] = useState<CsvPreview | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [step, setStep] = useState<'upload' | 'mapping' | 'import' | 'result'>('upload');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch available tables
  const { data: tables = [], isLoading: tablesLoading } = useQuery<TableOption[]>({
    queryKey: ['/api/import/tables'],
    enabled: step === 'upload'
  });

  // Fetch table schema when table is selected
  const { data: tableSchema, isLoading: schemaLoading } = useQuery<TableSchema>({
    queryKey: ['/api/import/schema', selectedTable],
    enabled: !!selectedTable && step === 'mapping'
  });

  // Upload file mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('csvFile', file);
      
      const response = await fetch('/api/import/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }
      
      return response.json();
    },
    onSuccess: (preview: CsvPreview) => {
      setCsvPreview(preview);
      setStep('mapping');
      toast({
        title: "File uploaded successfully",
        description: `Preview loaded with ${preview.totalRows} rows`
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Process import mutation
  const processMutation = useMutation({
    mutationFn: async (data: { filePath: string; tableName: string; columnMapping: Record<string, string> }) => {
      return apiRequest('/api/import/process', {
        method: 'POST',
        body: data
      });
    },
    onSuccess: (result: ImportResult) => {
      setImportResult(result);
      setStep('result');
      
      // Invalidate relevant caches
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
      queryClient.invalidateQueries({ queryKey: ['/api/buildings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/pool-fund'] });
      
      toast({
        title: "Import completed",
        description: `Successfully imported ${result.summary.successful} of ${result.summary.totalRows} rows`
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (!selectedFile || !selectedTable) {
      toast({
        title: "Missing information",
        description: "Please select both a file and a table",
        variant: "destructive"
      });
      return;
    }
    
    uploadMutation.mutate(selectedFile);
  };

  const handleColumnMappingChange = (dbColumn: string, csvColumn: string) => {
    setColumnMapping(prev => ({
      ...prev,
      [dbColumn]: csvColumn
    }));
  };

  const handleImport = () => {
    if (!csvPreview) return;
    
    processMutation.mutate({
      filePath: csvPreview.filePath,
      tableName: selectedTable,
      columnMapping
    });
    setStep('import');
  };

  const resetImport = () => {
    setSelectedFile(null);
    setSelectedTable("");
    setCsvPreview(null);
    setColumnMapping({});
    setImportResult(null);
    setStep('upload');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="title-data-import">Data Import</h1>
          <p className="text-muted-foreground" data-testid="text-description">
            Import data from CSV files into your database tables
          </p>
        </div>
        {step !== 'upload' && (
          <Button variant="outline" onClick={resetImport} data-testid="button-reset">
            Start Over
          </Button>
        )}
      </div>

      {/* Step Indicator */}
      <div className="flex items-center space-x-4 mb-8">
        <div className={`flex items-center space-x-2 ${step === 'upload' ? 'text-primary' : step === 'mapping' || step === 'import' || step === 'result' ? 'text-green-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'upload' ? 'bg-primary text-white' : step === 'mapping' || step === 'import' || step === 'result' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>
            1
          </div>
          <span>Upload File</span>
        </div>
        <Separator orientation="horizontal" className="w-12" />
        <div className={`flex items-center space-x-2 ${step === 'mapping' ? 'text-primary' : step === 'import' || step === 'result' ? 'text-green-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'mapping' ? 'bg-primary text-white' : step === 'import' || step === 'result' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>
            2
          </div>
          <span>Map Columns</span>
        </div>
        <Separator orientation="horizontal" className="w-12" />
        <div className={`flex items-center space-x-2 ${step === 'import' ? 'text-primary' : step === 'result' ? 'text-green-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'import' ? 'bg-primary text-white' : step === 'result' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>
            3
          </div>
          <span>Import Data</span>
        </div>
      </div>

      {/* Step 1: File Upload */}
      {step === 'upload' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Select CSV File
              </CardTitle>
              <CardDescription>
                Choose a CSV file to import into your database
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="csv-file">CSV File</Label>
                <Input
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  data-testid="input-csv-file"
                />
              </div>
              {selectedFile && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium" data-testid="text-selected-file">
                      {selectedFile.name}
                    </span>
                    <Badge variant="secondary" data-testid="badge-file-size">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Select Target Table
              </CardTitle>
              <CardDescription>
                Choose which database table to import the data into
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="table-select">Database Table</Label>
                <Select value={selectedTable} onValueChange={setSelectedTable}>
                  <SelectTrigger data-testid="select-table">
                    <SelectValue placeholder="Choose a table..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tablesLoading ? (
                      <SelectItem value="loading">Loading tables...</SelectItem>
                    ) : (
                      tables.map((table) => (
                        <SelectItem key={table.key} value={table.key}>
                          {table.label}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              {selectedTable && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-sm font-medium" data-testid="text-selected-table">
                    {tables.find(t => t.key === selectedTable)?.label}
                  </div>
                  <div className="text-xs text-gray-600 mt-1" data-testid="text-table-description">
                    {tables.find(t => t.key === selectedTable)?.description}
                  </div>
                </div>
              )}
              
              <Button 
                onClick={handleUpload}
                disabled={!selectedFile || !selectedTable || uploadMutation.isPending}
                className="w-full"
                data-testid="button-upload"
              >
                {uploadMutation.isPending ? "Uploading..." : "Upload & Preview"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 2: Column Mapping */}
      {step === 'mapping' && csvPreview && tableSchema && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Map CSV Columns to Database Fields</CardTitle>
              <CardDescription>
                Match your CSV column headers to the appropriate database fields. Required fields must be mapped.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Required Fields */}
                <div>
                  <h3 className="font-semibold text-red-600 mb-3">Required Fields</h3>
                  <div className="space-y-3">
                    {tableSchema.required.map((field) => (
                      <div key={field} className="flex items-center gap-3">
                        <Label className="w-1/3 text-sm font-medium">{field}</Label>
                        <Select 
                          value={columnMapping[field] || ""} 
                          onValueChange={(value) => handleColumnMappingChange(field, value)}
                        >
                          <SelectTrigger className="flex-1" data-testid={`select-mapping-${field}`}>
                            <SelectValue placeholder="Select CSV column..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">-- Not mapped --</SelectItem>
                            {csvPreview.headers.map((header) => (
                              <SelectItem key={header} value={header}>
                                {header}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Optional Fields */}
                <div>
                  <h3 className="font-semibold text-blue-600 mb-3">Optional Fields</h3>
                  <div className="space-y-3">
                    {tableSchema.optional.map((field) => (
                      <div key={field} className="flex items-center gap-3">
                        <Label className="w-1/3 text-sm font-medium">{field}</Label>
                        <Select 
                          value={columnMapping[field] || ""} 
                          onValueChange={(value) => handleColumnMappingChange(field, value)}
                        >
                          <SelectTrigger className="flex-1" data-testid={`select-mapping-${field}`}>
                            <SelectValue placeholder="Select CSV column..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">-- Not mapped --</SelectItem>
                            {csvPreview.headers.map((header) => (
                              <SelectItem key={header} value={header}>
                                {header}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <Separator className="my-6" />

              {/* CSV Preview */}
              <div>
                <h3 className="font-semibold mb-3">Data Preview ({csvPreview.totalRows} total rows)</h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {csvPreview.headers.map((header) => (
                          <TableHead key={header} className="text-xs">
                            {header}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {csvPreview.rows.map((row, index) => (
                        <TableRow key={index}>
                          {csvPreview.headers.map((header) => (
                            <TableCell key={header} className="text-xs">
                              {row[header]?.toString().slice(0, 50) || ''}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button variant="outline" onClick={() => setStep('upload')} data-testid="button-back">
                  Back
                </Button>
                <Button 
                  onClick={handleImport}
                  disabled={tableSchema?.required.some(field => !columnMapping[field])}
                  data-testid="button-import"
                >
                  Import Data
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 3: Import Progress */}
      {step === 'import' && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <h3 className="text-lg font-semibold">Importing Data...</h3>
              <p className="text-muted-foreground">
                Processing {csvPreview?.totalRows} rows into {tables.find(t => t.key === selectedTable)?.label} table
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Import Results */}
      {step === 'result' && importResult && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {importResult.summary.failed === 0 ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                )}
                Import Complete
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600" data-testid="text-successful-count">
                    {importResult.summary.successful}
                  </div>
                  <div className="text-sm text-green-700">Successful</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600" data-testid="text-failed-count">
                    {importResult.summary.failed}
                  </div>
                  <div className="text-sm text-red-700">Failed</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600" data-testid="text-total-count">
                    {importResult.summary.totalRows}
                  </div>
                  <div className="text-sm text-blue-700">Total Rows</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Success Rate</span>
                  <span data-testid="text-success-rate">
                    {((importResult.summary.successful / importResult.summary.totalRows) * 100).toFixed(1)}%
                  </span>
                </div>
                <Progress 
                  value={(importResult.summary.successful / importResult.summary.totalRows) * 100}
                  className="h-2"
                />
              </div>

              {/* Error Details */}
              {importResult.summary.errors.length > 0 && (
                <div>
                  <h4 className="font-semibold text-red-600 mb-3">Import Errors</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {importResult.summary.errors.map((error, index) => (
                      <Alert key={index} variant="destructive">
                        <XCircle className="h-4 w-4" />
                        <AlertDescription data-testid={`text-error-${index}`}>
                          <strong>Row {error.row}:</strong> {error.error}
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </div>
              )}

              <Button onClick={resetImport} className="w-full" data-testid="button-import-more">
                Import More Data
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}