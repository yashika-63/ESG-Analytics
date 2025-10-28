import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Database, RefreshCw, Clock, TrendingUp 
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart as RechartsPieChart, Pie, Cell
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { getEnergyData, FilterOptions } from '../../services/apiService';

const EnergyDataAnalytics = ({ filters }: { filters: FilterOptions }) => {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadStatus, setLoadStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    loadDataFromDatabase();
  }, [filters]);

  const loadDataFromDatabase = async () => {
    setIsLoading(true);
    setLoadStatus('idle');
    try {
      const dbData = await getEnergyData(filters);

      // Normalize data for analytics
      const formatted = dbData.map((item: any) => ({
        plant: item.plant || 'Unknown',
        department: item.department || 'Unknown',
        businessCode: item.businessCode || '',
        attribute: item.attribute || '',
        parameter: item.parameter || '',
        type: item.type || 'Unknown',
        month: item.month || 'Unknown',
        quantity: item.quantity || 0,
        convFactor: item.convFactor || 0,
        value: item.value || item.quantity * item.convFactor || 0,
      }));

      setData(formatted);
      setLoadStatus('success');
    } catch (err) {
      console.error('Error loading energy data:', err);
      setLoadStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = useCallback(() => {
    loadDataFromDatabase();
  }, [filters]);

  // Compute analytics
  const analytics = useMemo(() => {
    if (data.length === 0)
      return {
        totals: {
          totalEnergy: 0,
          avgEnergy: 0,
          plantCount: 0,
          deptCount: 0,
          typeCount: 0,
        },
        byPlant: [],
        byDepartment: [],
        byType: [],
        byMonth: [],
        byParameter: [],
      };

    const totalEnergy = data.reduce((a, v) => a + (v.value || 0), 0);

    const aggregate = (key: string) => {
      const map = new Map();
      data.forEach(d => {
        const k = d[key] || 'Unknown';
        if (!map.has(k))
          map.set(k, { category: k, total: 0 });
        map.get(k).total += d.value || 0;
      });
      return Array.from(map.values());
    };

    const byPlant = aggregate('plant');
    const byDepartment = aggregate('department');
    const byType = aggregate('type');
    const byParameter = aggregate('parameter');

    const byMonth = (() => {
      const map = new Map();
      data.forEach(d => {
        const m = d.month || 'Unknown';
        if (!map.has(m))
          map.set(m, { month: m, total: 0 });
        map.get(m).total += d.value || 0;
      });
      return Array.from(map.values());
    })();

    return {
      totals: {
        totalEnergy,
        avgEnergy: totalEnergy / data.length,
        plantCount: new Set(data.map(d => d.plant)).size,
        deptCount: new Set(data.map(d => d.department)).size,
        typeCount: new Set(data.map(d => d.type)).size,
      },
      byPlant,
      byDepartment,
      byType,
      byMonth,
      byParameter,
    };
  }, [data]);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#14B8A6'];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <Database className="w-6 h-6 mr-2 text-blue-600" />
              Energy (GJ) Data from Database
            </span>
            <button
              onClick={handleRefresh}
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
                <Clock className="w-5 h-5 animate-spin mr-2" /> Loading energy data...
              </p>
            )}
            {loadStatus === 'success' && (
              <p className="text-green-600">✅ Loaded {data.length} records successfully.</p>
            )}
            {loadStatus === 'error' && (
              <p className="text-red-600">❌ Failed to fetch data. Check API connection.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {data.length > 0 && (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="plant">Plant</TabsTrigger>
            <TabsTrigger value="department">Department</TabsTrigger>
            <TabsTrigger value="type">Type</TabsTrigger>
            <TabsTrigger value="parameter">Parameter</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview">
            <Card>
              <CardHeader><CardTitle>Key Energy Metrics</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{analytics.totals.totalEnergy.toFixed(2)}</p>
                    <p className="text-sm text-gray-600">Total Energy (GJ)</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{analytics.totals.avgEnergy.toFixed(2)}</p>
                    <p className="text-sm text-gray-600">Average per Record</p>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <p className="text-2xl font-bold text-yellow-600">{analytics.totals.plantCount}</p>
                    <p className="text-sm text-gray-600">Plants</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <p className="text-2xl font-bold text-purple-600">{analytics.totals.deptCount}</p>
                    <p className="text-sm text-gray-600">Departments</p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <p className="text-2xl font-bold text-red-600">{analytics.totals.typeCount}</p>
                    <p className="text-sm text-gray-600">Energy Types</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Charts by Category */}
          {['plant', 'department', 'parameter'].map(cat => (
            <TabsContent key={cat} value={cat}>
              <Card>
                <CardHeader><CardTitle>{cat.charAt(0).toUpperCase() + cat.slice(1)} Breakdown</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={analytics[`by${cat.charAt(0).toUpperCase() + cat.slice(1)}`]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="total" fill="#3B82F6" name="Energy (GJ)" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>
          ))}

          {/* Type Distribution */}
          <TabsContent value="type">
            <Card>
              <CardHeader><CardTitle>Energy Source Distribution</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <RechartsPieChart>
                    <Pie
                      data={analytics.byType}
                      dataKey="total"
                      nameKey="category"
                      outerRadius={120}
                      label
                    >
                      {analytics.byType.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Monthly Trend */}
          <TabsContent value="monthly">
            <Card>
              <CardHeader><CardTitle>Monthly Energy Trend</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={analytics.byMonth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="total" stroke="#3B82F6" name="Energy (GJ)" />
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
            <p>Connect to database to see energy analytics.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EnergyDataAnalytics;
