import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Database, TrendingUp, Droplets, RefreshCw, Clock } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';
import * as XLSX from 'xlsx';
import { getWaterData, FilterOptions } from '../../services/apiService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const WaterAnalytics = ({ filters }: { filters?: FilterOptions }) => {
  const [waterData, setWaterData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadStatus, setLoadStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Load data from API when component mounts or filters change
  useEffect(() => {
    loadDataFromAPI();
  }, [filters]);

  const loadDataFromAPI = async () => {
    setIsLoading(true);
    setLoadStatus('idle');
    
    try {
      const apiData = await getWaterData(filters);
      setWaterData(apiData);
      setLoadStatus('success');
    } catch (error) {
      console.error('Water data API error:', error);
      setLoadStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshData = useCallback(() => {
    loadDataFromAPI();
  }, [filters]);

  const analytics = useMemo(() => {
    if (waterData.length === 0) {
      return {
        totalQuantity: 0,
        totalValue: 0,
        byParameter: [],
        bySubCategory: [],
        byPlant: [],
        monthlyTrend: [],
        overview: { totalQuantity: 0, totalValue: 0, avgQuantity: 0, avgValue: 0 }
      };
    }

    const totalQuantity = waterData.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const totalValue = waterData.reduce((sum, item) => sum + (item.value || 0), 0);
    
    // Group by Parameter
    const parameterMap = new Map();
    waterData.forEach(item => {
      const param = item.parameter || 'Unknown';
      if (!parameterMap.has(param)) {
        parameterMap.set(param, { parameter: param, totalQuantity: 0, totalValue: 0, count: 0 });
      }
      const group = parameterMap.get(param);
      group.totalQuantity += item.quantity || 0;
      group.totalValue += item.value || 0;
      group.count += 1;
    });

    // Group by SubCategory
    const subCategoryMap = new Map();
    waterData.forEach(item => {
      const subCat = item.subCategory || 'Unknown';
      if (!subCategoryMap.has(subCat)) {
        subCategoryMap.set(subCat, { subCategory: subCat, totalQuantity: 0, totalValue: 0, count: 0 });
      }
      const group = subCategoryMap.get(subCat);
      group.totalQuantity += item.quantity || 0;
      group.totalValue += item.value || 0;
      group.count += 1;
    });

    // Group by Plant
    const plantMap = new Map();
    waterData.forEach(item => {
      const plant = item.plant || 'Unknown';
      if (!plantMap.has(plant)) {
        plantMap.set(plant, { plant: plant, totalQuantity: 0, totalValue: 0, count: 0 });
      }
      const group = plantMap.get(plant);
      group.totalQuantity += item.quantity || 0;
      group.totalValue += item.value || 0;
      group.count += 1;
    });

    // Monthly trend
    const monthlyMap = new Map();
    waterData.forEach(item => {
      const month = item.month || 'Unknown';
      if (!monthlyMap.has(month)) {
        monthlyMap.set(month, { month: month, totalQuantity: 0, totalValue: 0 });
      }
      const group = monthlyMap.get(month);
      group.totalQuantity += item.quantity || 0;
      group.totalValue += item.value || 0;
    });

    return {
      totalQuantity,
      totalValue,
      byParameter: Array.from(parameterMap.values()),
      bySubCategory: Array.from(subCategoryMap.values()),
      byPlant: Array.from(plantMap.values()),
      monthlyTrend: Array.from(monthlyMap.values()),
      overview: {
        totalQuantity,
        totalValue,
        avgQuantity: waterData.length > 0 ? totalQuantity / waterData.length : 0,
        avgValue: waterData.length > 0 ? totalValue / waterData.length : 0
      }
    };
  }, [waterData]);

  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  const handleExport = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([analytics.overview]), "Overview");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(analytics.byParameter), "By Parameter");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(analytics.bySubCategory), "By SubCategory");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(analytics.byPlant), "By Plant");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(analytics.monthlyTrend), "Monthly Trend");
    XLSX.writeFile(wb, "Water_Analytics_Report.xlsx");
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center">
          <Droplets className="w-8 h-8 mr-3 text-blue-600" />
          Water Analytics
        </h1>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 rounded bg-blue-600 text-white font-medium hover:bg-blue-700"
        >
          Export Report
        </button>
      </div>

      {/* Database Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Database className="w-6 h-6 mr-2 text-blue-600" />
              Water Data from Database
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
            {isLoading && <p className="flex items-center text-blue-600"><Clock className="w-5 h-5 animate-spin mr-2" />Loading water data from database...</p>}
            {loadStatus === 'success' && <p className="text-green-600">✅ Successfully loaded {waterData.length} water records</p>}
            {loadStatus === 'error' && <p className="text-red-600">❌ Error connecting to database. Please check connection settings.</p>}
            {loadStatus === 'idle' && !isLoading && <p className="text-gray-600">🔄 Ready to load data...</p>}
          </div>
        </CardContent>
      </Card>

      {waterData.length === 0 && loadStatus === 'idle' && !isLoading && (
        <Card>
          <CardContent className="p-6 text-center text-blue-700">
            <TrendingUp className="mx-auto w-12 h-12 mb-4" />
            <p>Connect to database to see water analytics.</p>
          </CardContent>
        </Card>
      )}

      {waterData.length > 0 && (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="parameter">Parameter</TabsTrigger>
            <TabsTrigger value="subcategory">SubCategory</TabsTrigger>
            <TabsTrigger value="plant">Plant</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle>Water Usage Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{analytics.overview.totalQuantity.toFixed(2)}</p>
                    <p className="text-sm text-gray-600">Total Quantity (KL)</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{analytics.overview.totalValue.toFixed(2)}</p>
                    <p className="text-sm text-gray-600">Total Value</p>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <p className="text-2xl font-bold text-yellow-600">{analytics.overview.avgQuantity.toFixed(2)}</p>
                    <p className="text-sm text-gray-600">Avg Quantity</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <p className="text-2xl font-bold text-purple-600">{analytics.overview.avgValue.toFixed(2)}</p>
                    <p className="text-sm text-gray-600">Avg Value</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Parameter Analysis */}
          <TabsContent value="parameter">
            <Card>
              <CardHeader>
                <CardTitle>Water Usage by Parameter</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={analytics.byParameter}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="parameter" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="totalQuantity" fill={colors[0]} name="Total Quantity (KL)" />
                    <Bar dataKey="totalValue" fill={colors[1]} name="Total Value" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SubCategory Analysis */}
          <TabsContent value="subcategory">
            <Card>
              <CardHeader>
                <CardTitle>Water Usage by SubCategory</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={analytics.bySubCategory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="subCategory" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="totalQuantity" fill={colors[2]} name="Total Quantity (KL)" />
                    <Bar dataKey="totalValue" fill={colors[3]} name="Total Value" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Plant Analysis */}
          <TabsContent value="plant">
            <Card>
              <CardHeader>
                <CardTitle>Water Usage by Plant</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <RechartsPieChart>
                    <Pie
                      data={analytics.byPlant}
                      dataKey="totalQuantity"
                      nameKey="plant"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                    >
                      {analytics.byPlant.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Monthly Trend */}
          <TabsContent value="monthly">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Water Usage Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={analytics.monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="totalQuantity" stroke={colors[0]} name="Quantity (KL)" />
                    <Line type="monotone" dataKey="totalValue" stroke={colors[1]} name="Value" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default WaterAnalytics;