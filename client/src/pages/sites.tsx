import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, MapPin, Building, Users, Settings, CheckCircle2, Circle } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import type { Site } from "@shared/schema";
import { PageLoadingSpinner } from "@/components/loading-spinner";
import { useAuth } from "@/contexts/auth-context";
import SiteForm from "@/components/site-form";

export default function Sites() {
  const [showSiteForm, setShowSiteForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const { data: sites = [], isLoading } = useQuery<Site[]>({
    queryKey: ["/api/sites"],
    enabled: !!user,
    refetchInterval: 15000,
  });

  const filteredSites = sites.filter(site =>
    site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    site.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    site.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return <PageLoadingSpinner message="Loading sites..." />;
  }

  const getCategoryBadge = (category: string) => {
    const categoryColors: Record<string, string> = {
      'HSWI': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'LTH': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'Group_Housing': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'Other': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    };

    return (
      <Badge className={categoryColors[category] || categoryColors['Other']}>
        {category.replace('_', ' ')}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sites Management</h1>
          <p className="text-gray-600 dark:text-gray-300">Manage housing sites and campus locations</p>
        </div>
        <Button onClick={() => setShowSiteForm(true)} className="bg-primary text-white hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          Add Site
        </Button>
      </div>

      {/* Search */}
      <div className="flex-1 max-w-sm">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search sites..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Sites Display */}
      {filteredSites.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-slate-400 text-lg mb-2">No sites found</div>
            <p className="text-slate-600 mb-4">
              {searchTerm ? "Try adjusting your search terms" : "Get started by adding your first housing site"}
            </p>
            {!searchTerm && (
              <Button onClick={() => setShowSiteForm(true)} className="bg-primary text-white hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Add First Site
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSites.map((site) => (
            <Card 
              key={site.id} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setLocation(`/sites/${site.id}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <Building className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{site.name}</CardTitle>
                      <p className="text-sm text-gray-500">{site.address}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    {getCategoryBadge(site.category)}
                    <div className="flex items-center space-x-1">
                      {site.status === 'active' ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <Circle className="w-4 h-4 text-gray-400" />
                      )}
                      <Badge variant={site.status === 'active' ? 'default' : 'secondary'}>
                        {site.status === 'active' ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {site.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                      {site.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-1 text-gray-500">
                      <MapPin className="w-4 h-4" />
                      <span>Location</span>
                    </div>
                    <div className="flex items-center space-x-1 text-gray-500">
                      <Users className="w-4 h-4" />
                      <span>Units: TBD</span>
                    </div>
                  </div>

                  {site.poolFundSeparate && (
                    <div className="pt-2 border-t">
                      <Badge variant="outline" className="text-xs">
                        Separate Pool Fund
                      </Badge>
                    </div>
                  )}

                  <div className="pt-2">
                    <p className="text-xs text-slate-400">
                      Created {new Date(site.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Site Form Modal */}
      {showSiteForm && (
        <SiteForm onClose={() => setShowSiteForm(false)} />
      )}
    </div>
  );
}