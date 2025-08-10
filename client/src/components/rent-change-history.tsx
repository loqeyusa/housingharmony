import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { History, DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { RentChange } from "@shared/schema";

interface RentChangeHistoryProps {
  propertyId: number;
}

export function RentChangeHistory({ propertyId }: RentChangeHistoryProps) {
  const { data: rentChanges, isLoading, error } = useQuery<RentChange[]>({
    queryKey: ["/api/properties", propertyId, "rent-changes"],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Rent Change History
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Rent Change History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Failed to load rent change history</p>
        </CardContent>
      </Card>
    );
  }

  if (!rentChanges || rentChanges.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Rent Change History
          </CardTitle>
          <CardDescription>
            No rent changes recorded for this property
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(parseFloat(amount));
  };

  const getChangeIcon = (oldAmount: string, newAmount: string) => {
    const oldValue = parseFloat(oldAmount);
    const newValue = parseFloat(newAmount);
    
    if (newValue > oldValue) {
      return <TrendingUp className="h-4 w-4 text-red-600" />;
    } else if (newValue < oldValue) {
      return <TrendingDown className="h-4 w-4 text-green-600" />;
    }
    return <DollarSign className="h-4 w-4 text-gray-500" />;
  };

  const getChangeBadge = (oldAmount: string, newAmount: string) => {
    const oldValue = parseFloat(oldAmount);
    const newValue = parseFloat(newAmount);
    const difference = newValue - oldValue;
    const percentage = oldValue > 0 ? (difference / oldValue) * 100 : 0;
    
    if (difference > 0) {
      return (
        <Badge variant="destructive" className="text-xs">
          +{formatCurrency(difference.toString())} ({percentage.toFixed(1)}%)
        </Badge>
      );
    } else if (difference < 0) {
      return (
        <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          {formatCurrency(difference.toString())} ({percentage.toFixed(1)}%)
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-xs">
        No Change
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Rent Change History
        </CardTitle>
        <CardDescription>
          {rentChanges.length} rent change{rentChanges.length !== 1 ? 's' : ''} recorded
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {rentChanges.map((change, index) => (
            <div
              key={change.id}
              className="flex items-start space-x-4 p-4 border rounded-lg bg-card"
            >
              <div className="flex-shrink-0 mt-1">
                {getChangeIcon(change.oldRentAmount, change.newRentAmount)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">
                      {formatCurrency(change.oldRentAmount)} → {formatCurrency(change.newRentAmount)}
                    </span>
                    {getChangeBadge(change.oldRentAmount, change.newRentAmount)}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(change.changeDate), 'MMM dd, yyyy')}
                  </span>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    <strong>Reason:</strong> {change.changeReason}
                  </p>
                  
                  {change.notes && (
                    <p className="text-sm text-muted-foreground">
                      <strong>Notes:</strong> {change.notes}
                    </p>
                  )}
                  
                  <p className="text-xs text-muted-foreground">
                    Changed on {format(new Date(change.createdAt), 'MMM dd, yyyy \'at\' h:mm a')}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}