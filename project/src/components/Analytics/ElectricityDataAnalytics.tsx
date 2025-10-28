import { useState, useCallback, useMemo, useEffect } from 'react';
import { 
  Database, TrendingUp, Clock, RefreshCw 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getElectricityData, FilterOptions } from '../../services/apiService';

/**
 * ElectricityDataAnalytics
 * - Fetches Scope 2 electricity data (from your ESG DB)
 * - Computes total consumption, emissions, and averages
 * - Shows dynamic charts for plants, departments, and time trends
 */

const ElectricityDataAnalytics = ({ filters }: { filters: FilterOptions }) => {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadStatus, setLoadStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Fetch data when component mounts or filters change
  useEffect(() => {
    loadDataFromDatabase();
  }, [filters]);

  const loadDataFromDatabase = async () => {
    setIsLoading(true);
    setLoadStatus('idle');
    try {
      const dbData = await getElectricityData(filters);
      setData(dbData || []);
      setLoadStatus('success');
    } catch (error) {
      console.error('Database loading error:', error);
      setLoadStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshData = useCallback(() => {
    loadDataFromDatabase();
  }, [filters]);

  /**
   * 🔍 Compute analytics from the API data
   */
  const analytics = useMemo(() => {
    if (data.length === 0)
      return {
        totals: {
          totalQuantity: 0,
          totalCO2: 0,
          avgQuantity: 0,
          avgCO2: 0
        },
        byCategory: {
          plant: [],
          department: [],
          subCategory: [],
          type: []
        },
        byMonth: []
      };

    // Compute derived values (CO2 = quantity * convFactor)
    const enrichedData = data.map((d) => ({
      ...d,
      co2Emissions: (d.quantity || 0) * (d.convFactor || 0),
    }));

    // Totals
    const totals = {
      totalQuantity: enrichedData.reduce((a, v) => a + (v.quantity || 0), 0),
      totalCO2: enrichedData.reduce((a, v) => a + (v.co2Emissions || 0), 0),
      avgQuantity: enrichedData.reduce((a, v) => a + (v.quantity || 0), 0) / enrichedData.length,
      avgCO2: enrichedData.reduce((a, v) => a + (v.co2Emissions || 0), 0) / enrichedData.length,
    };

    // Helper to group data
    const aggregateBy = (key: string) => {
      const map = new Map();
      enrichedData.forEach((d) => {
        const k = d[key] || 'Unknown';
        if (!map.has(k)) {
          map.set(k, { category: k, totalQuantity: 0, totalCO2: 0, count: 0 });
        }
        const agg = map.get(k);
        agg.totalQuantity += d.quantity || 0;
        agg.totalCO2 += d.co2Emissions || 0;
        agg.count++;
      });
      return Array.from(map.values());
    };

    // Monthly trend (if month data exists)
    const byMonth = (() => {
      const map = new Map();
      enrichedData.forEach((d) => {
        const m = d.month || 'N/A';
        if (!map.has(m)) {
          map.set(m, { month: m, totalQuantity: 0, totalCO2: 0 });
        }
        const agg = map.get(m);
        agg.totalQuantity += d.quantity || 0;
        agg.totalCO2 += d.co2Emissions || 0;
      });
      return Array.from(map.values());
    })();

    return {
      totals,
      byCategory: {
        plant: aggregateBy('plant'),
        department: aggregateBy('department'),
        subCategory: aggregateBy('subCategory'),
        type: aggregateBy('type'),
      },
      byMonth,
    };
  }, [data]);

  return (
    <div className="p-6 space-y-6">
      {/* Database Connection Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Database className="w-6 h-6 mr-2 text-blue-600" />
              Scope 2 Electricity Data (Database)
            </div>
            <button
              onClick={handleRefreshData}
              disabled={isLoading}
              className="flex items-center gap-2 px-3 py-2 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 rounded bg-gray-50">
            {isLoading && (
              <p className="flex items-center text-blue-600">
                <Clock className="w-5 h-5 animate-spin mr-2" />
                Loading electricity data from database...
              </p>
            )}
            {loadStatus === 'success' && (
              <p className="text-green-600">✅ Loaded {data.length} records successfully.</p>
            )}
            {loadStatus === 'error' && (
              <p className="text-red-600">❌ Error fetching data. Check backend API.</p>
            )}
            {loadStatus === 'idle' && !isLoading && (
              <p className="text-gray-600">🔄 Ready to load data...</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Analytics Section */}
      {data.length > 0 && (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="plant">Plant</TabsTrigger>
            <TabsTrigger value="department">Department</TabsTrigger>
            <TabsTrigger value="subCategory">SubCategory</TabsTrigger>
            <TabsTrigger value="monthly">Monthly Trend</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle>Key Electricity Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">
                      {analytics.totals.totalQuantity.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-600">Total Quantity (kWh)</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">
                      {analytics.totals.totalCO2.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-600">Total CO₂ Emissions (tCO₂e)</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <p className="text-2xl font-bold text-purple-600">
                      {analytics.totals.avgQuantity.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-600">Average Quantity (kWh)</p>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <p className="text-2xl font-bold text-yellow-600">
                      {analytics.totals.avgCO2.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-600">Average CO₂ (tCO₂e)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Category Breakdowns */}
          {(['plant', 'department', 'subCategory'] as const).map((cat) => (
            <TabsContent key={cat} value={cat}>
              <Card>
                <CardHeader>
                  <CardTitle>{cat.charAt(0).toUpperCase() + cat.slice(1)} Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={analytics.byCategory[cat]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="totalQuantity" fill="#3B82F6" name="Quantity (kWh)" />
                      <Bar dataKey="totalCO2" fill="#10B981" name="CO₂ (tCO₂e)" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>
          ))}

          {/* Monthly Trend */}
          <TabsContent value="monthly">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Electricity & CO₂ Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={analytics.byMonth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="totalQuantity" stroke="#3B82F6" name="Quantity (kWh)" />
                    <Line type="monotone" dataKey="totalCO2" stroke="#10B981" name="CO₂ (tCO₂e)" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {data.length === 0 && loadStatus === 'idle' && !isLoading && (
        <Card>
          <CardContent className="p-6 text-center text-blue-700">
            <TrendingUp className="mx-auto w-12 h-12 mb-4" />
            <p>Connect to database to view electricity analytics.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ElectricityDataAnalytics;
