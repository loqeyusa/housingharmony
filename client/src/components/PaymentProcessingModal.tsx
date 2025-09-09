import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertCircle, CheckCircle2, DollarSign, User, Calendar, FileText, X } from "lucide-react";

interface PaymentProcessingModalProps {
  analysisResult: any;
  onClose: () => void;
  onProcessPayments: (selectedClients: any[]) => void;
}

export function PaymentProcessingModal({ analysisResult, onClose, onProcessPayments }: PaymentProcessingModalProps) {
  const [selectedClients, setSelectedClients] = useState<Set<number>>(new Set());
  const [paymentData, setPaymentData] = useState<Record<number, any>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  const handleClientToggle = (clientIndex: number, checked: boolean) => {
    const newSelected = new Set(selectedClients);
    if (checked) {
      newSelected.add(clientIndex);
    } else {
      newSelected.delete(clientIndex);
    }
    setSelectedClients(newSelected);
  };

  const handlePaymentDataChange = (clientIndex: number, field: string, value: string) => {
    setPaymentData(prev => ({
      ...prev,
      [clientIndex]: {
        ...prev[clientIndex],
        [field]: value
      }
    }));
  };

  const handleProcessPayments = async () => {
    setIsProcessing(true);
    
    const clientsToProcess = Array.from(selectedClients).map(index => {
      const matchResult = analysisResult.matchResults[index];
      const extractedData = matchResult.extractedData;
      const customData = paymentData[index] || {};
      
      return {
        client: matchResult.matchedClient,
        paymentAmount: customData.paymentAmount || extractedData.paymentAmount || 0,
        paymentDate: customData.paymentDate || extractedData.paymentDate || new Date().toISOString().split('T')[0],
        paymentMethod: customData.paymentMethod || extractedData.paymentMethod || 'check',
        checkNumber: customData.checkNumber || extractedData.checkNumber || '',
        notes: customData.notes || `County payment - Case ${extractedData.caseNumber || 'Unknown'}`
      };
    });

    try {
      await onProcessPayments(clientsToProcess);
    } finally {
      setIsProcessing(false);
    }
  };

  const { matchResults = [], analysis = {} } = analysisResult;
  
  console.log('PaymentProcessingModal - analysisResult:', JSON.stringify(analysisResult, null, 2));
  console.log('PaymentProcessingModal - matchResults:', matchResults);
  console.log('PaymentProcessingModal - analysis:', analysis);
  console.log('PaymentProcessingModal - analysis.extractedData:', analysis.extractedData);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" data-testid="payment-processing-modal">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <span>Process Payment Document</span>
            </DialogTitle>
            <Badge variant="secondary">
              {analysis.documentType || 'Payment Document'}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Document Analysis Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Analysis Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Confidence:</span>
                  <span className="ml-2 font-medium">{Math.round((analysis.analysisConfidence || 0) * 100)}%</span>
                </div>
                <div>
                  <span className="text-gray-600">Clients Found:</span>
                  <span className="ml-2 font-medium">{matchResults.length}</span>
                </div>
              </div>
              {analysis.rawAnalysis && (
                <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                  {analysis.rawAnalysis}
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Extracted Data */}
          {analysis.extractedData && analysis.extractedData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>AI Extracted Payment Data</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analysis.extractedData.map((extracted, index) => (
                    <div key={index} className="border rounded-lg p-4 bg-blue-50">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">Client Name:</span>
                          <div className="text-lg font-semibold text-blue-900">{extracted.clientName}</div>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Payment Amount:</span>
                          <div className="text-lg font-semibold text-green-600">
                            ${extracted.paymentAmount?.toLocaleString() || 'N/A'}
                          </div>
                        </div>
                        {extracted.caseNumber && (
                          <div>
                            <span className="font-medium text-gray-700">Case Number:</span>
                            <div className="font-mono">{extracted.caseNumber}</div>
                          </div>
                        )}
                        {extracted.county && (
                          <div>
                            <span className="font-medium text-gray-700">County:</span>
                            <div>{extracted.county}</div>
                          </div>
                        )}
                        {extracted.paymentDate && (
                          <div>
                            <span className="font-medium text-gray-700">Payment Date:</span>
                            <div>{extracted.paymentDate}</div>
                          </div>
                        )}
                        {extracted.checkNumber && (
                          <div>
                            <span className="font-medium text-gray-700">Check Number:</span>
                            <div className="font-mono">{extracted.checkNumber}</div>
                          </div>
                        )}
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <Badge variant="secondary" className="text-xs">
                          {extracted.documentType} • {extracted.paymentMethod}
                        </Badge>
                        <Badge variant={extracted.confidence > 0.8 ? 'default' : 'secondary'} className="text-xs">
                          {Math.round((extracted.confidence || 0) * 100)}% Confidence
                        </Badge>
                      </div>
                      {extracted.address && (
                        <div className="mt-2 text-xs text-gray-600">
                          <span className="font-medium">Address: </span>{extracted.address}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Matched Clients in System */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center space-x-2">
              <User className="w-5 h-5 text-green-600" />
              <span>Matched Clients in System</span>
              {matchResults.length > 0 && (
                <Badge variant="default">{matchResults.length} Found</Badge>
              )}
            </h3>
            
            {matchResults.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Client Matches Found</h3>
                  <p className="text-gray-600">
                    The system couldn't match any clients from the payment document. 
                    You may need to process these payments manually or check client names.
                  </p>
                </CardContent>
              </Card>
            ) : (
              matchResults.map((matchResult: any, index: number) => {
                const { extractedData, matchedClient, matchType, confidence } = matchResult;
                const isSelected = selectedClients.has(index);
                const currentPaymentData = paymentData[index] || {};

                return (
                  <Card 
                    key={index} 
                    className={`${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
                    data-testid={`client-match-${index}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-4">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleClientToggle(index, checked as boolean)}
                          data-testid={`checkbox-client-${index}`}
                        />
                        
                        <div className="flex-1 space-y-4">
                          {/* Client Match Info */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="flex items-center space-x-2">
                                {matchedClient ? (
                                  <>
                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                    <span className="font-medium">
                                      {matchedClient.firstName} {matchedClient.lastName}
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <AlertCircle className="w-5 h-5 text-amber-500" />
                                    <span className="font-medium text-amber-700">
                                      {extractedData.clientName} (No Match)
                                    </span>
                                  </>
                                )}
                              </div>
                              {matchedClient && (
                                <Badge variant={confidence > 0.8 ? 'default' : 'secondary'}>
                                  {Math.round(confidence * 100)}% Match
                                </Badge>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-green-600">
                                ${extractedData.paymentAmount?.toFixed(2) || '0.00'}
                              </div>
                              <div className="text-sm text-gray-600">
                                Case: {extractedData.caseNumber || 'N/A'}
                              </div>
                            </div>
                          </div>

                          {/* Extracted Data */}
                          <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-3 rounded">
                            <div>
                              <span className="text-gray-600">County:</span>
                              <span className="ml-2">{extractedData.county || 'Unknown'}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Payment Method:</span>
                              <span className="ml-2">{extractedData.paymentMethod || 'check'}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Date:</span>
                              <span className="ml-2">{extractedData.paymentDate || 'Today'}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Check #:</span>
                              <span className="ml-2">{extractedData.checkNumber || 'N/A'}</span>
                            </div>
                            {extractedData.address && (
                              <div className="col-span-2">
                                <span className="text-gray-600">Address:</span>
                                <span className="ml-2">{extractedData.address}</span>
                              </div>
                            )}\n                          </div>

                          {/* Payment Customization (only show if client is selected and matched) */}
                          {isSelected && matchedClient && (
                            <div className="border-t pt-4">
                              <h4 className="font-medium mb-3">Customize Payment Details</h4>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor={`amount-${index}`}>Payment Amount</Label>
                                  <Input
                                    id={`amount-${index}`}
                                    type="number"
                                    step="0.01"
                                    placeholder={extractedData.paymentAmount?.toString() || '0.00'}
                                    value={currentPaymentData.paymentAmount || ''}
                                    onChange={(e) => handlePaymentDataChange(index, 'paymentAmount', e.target.value)}
                                    data-testid={`input-amount-${index}`}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor={`date-${index}`}>Payment Date</Label>
                                  <Input
                                    id={`date-${index}`}
                                    type="date"
                                    value={currentPaymentData.paymentDate || extractedData.paymentDate || ''}
                                    onChange={(e) => handlePaymentDataChange(index, 'paymentDate', e.target.value)}
                                    data-testid={`input-date-${index}`}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor={`method-${index}`}>Payment Method</Label>
                                  <select
                                    id={`method-${index}`}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                                    value={currentPaymentData.paymentMethod || extractedData.paymentMethod || 'check'}
                                    onChange={(e) => handlePaymentDataChange(index, 'paymentMethod', e.target.value)}
                                    data-testid={`select-method-${index}`}
                                  >
                                    <option value="check">Check</option>
                                    <option value="ach">ACH</option>
                                    <option value="wire_transfer">Wire Transfer</option>
                                    <option value="electronic">Electronic</option>
                                    <option value="other">Other</option>
                                  </select>
                                </div>
                                <div>
                                  <Label htmlFor={`check-${index}`}>Check Number</Label>
                                  <Input
                                    id={`check-${index}`}
                                    placeholder={extractedData.checkNumber || 'Optional'}
                                    value={currentPaymentData.checkNumber || ''}
                                    onChange={(e) => handlePaymentDataChange(index, 'checkNumber', e.target.value)}
                                    data-testid={`input-check-${index}`}
                                  />
                                </div>
                                <div className="col-span-2">
                                  <Label htmlFor={`notes-${index}`}>Notes</Label>
                                  <Textarea
                                    id={`notes-${index}`}
                                    placeholder="Additional notes for this payment..."
                                    value={currentPaymentData.notes || ''}
                                    onChange={(e) => handlePaymentDataChange(index, 'notes', e.target.value)}
                                    data-testid={`textarea-notes-${index}`}
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-gray-600">
              {selectedClients.size} of {matchResults.length} clients selected for processing
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleProcessPayments}
                disabled={selectedClients.size === 0 || isProcessing}
                data-testid="button-process-payments"
              >
                {isProcessing ? "Processing..." : `Process ${selectedClients.size} Payment${selectedClients.size !== 1 ? 's' : ''}`}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}