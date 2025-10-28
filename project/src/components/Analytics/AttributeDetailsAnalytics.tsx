import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Database, TrendingUp, Clock, Download, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';
import { getAttributeDetailsData, FilterOptions } from '../../services/apiService';

interface Props {
  filters?: FilterOptions;
}

const AttributeDetailsAnalytics: React.FC<Props> = ({ filters }) => {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadStatus, setLoadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [activeTab, setActiveTab] = useState<'overview'|'attribute'|'parameter'|'subCategory'|'type'>('overview');

  // Load data from database when component mounts or filters change
  useEffect(() => {
    loadDataFromDatabase();
  }, [filters]);

  const loadDataFromDatabase = async () => {
    setIsLoading(true);
    setLoadStatus('idle');
    
    try {
      const dbData = await getAttributeDetailsData(filters);
      setData(dbData);
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

  const aggregateByCategory = (catKey: string) => {
    const map = new Map<string, {
      category: string,
      totalQuantity: number,
      totalValue: number,
      avgConvFactor: number,
      avgCfStd: number,
      count: number
    }>();

    data.forEach(d => {
      const cat = d[catKey] || "Unknown";
      if(!map.has(cat)) map.set(cat, {category: cat, totalQuantity: 0, totalValue: 0, avgConvFactor: 0, avgCfStd: 0, count: 0});

      const agg = map.get(cat)!;
      agg.totalQuantity += d.quantity || 0;
      agg.totalValue += d.value || 0;
      agg.avgConvFactor += d.convFactor || 0;
      agg.avgCfStd += d.cfStd || 0;
      agg.count++;
    });

    return Array.from(map.values()).map(v => ({
      category: v.category,
      totalQuantity: v.totalQuantity,
      totalValue: v.totalValue,
      avgConvFactor: v.count ? v.avgConvFactor / v.count : 0,
      avgCfStd: v.count ? v.avgCfStd / v.count : 0
    }));
  };

  type Overview = { totalQuantity: number; totalValue: number; avgConvFactor: number; avgCfStd: number };
  type CategoryAgg = { category: string; totalQuantity: number; totalValue: number; avgConvFactor: number; avgCfStd: number };
  const analytics = useMemo((): {
    byAttribute: CategoryAgg[];
    byParameter: CategoryAgg[];
    bySubCategory: CategoryAgg[];
    byType: CategoryAgg[];
    overview: Overview;
  } => {
    if(data.length === 0) return {
      byAttribute: [], byParameter: [], bySubCategory: [], byType: [], overview: { totalQuantity: 0, totalValue: 0, avgConvFactor: 0, avgCfStd: 0 }
    };

    const overview = {
      totalQuantity: data.reduce((sum, d) => sum + (d.quantity || 0), 0),
      totalValue: data.reduce((sum, d) => sum + (d.value || 0), 0),
      avgConvFactor: data.reduce((sum, d) => sum + (d.convFactor || 0), 0) / data.length,
      avgCfStd: data.reduce((sum, d) => sum + (d.cfStd || 0), 0) / data.length
    };

    return {
      byAttribute: aggregateByCategory('attribute'),
      byParameter: aggregateByCategory('parameter'),
      bySubCategory: aggregateByCategory('subCategory'),
      byType: aggregateByCategory('type'),
      overview
    };
  }, [data]);

  const handleExport = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([analytics.overview]), "Overview");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(analytics.byAttribute), "By Attribute");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(analytics.byParameter), "By Parameter");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(analytics.bySubCategory), "By SubCategory");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(analytics.byType), "By Type");
    XLSX.writeFile(wb, "Attribute_Details_Analytics_Report.xlsx");
  };

  const colors = ['#10B981', '#3B82F6', '#EF4444', '#F59E0B'];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Attribute Details ESG Data Analytics</h1>

        <div className="bg-white rounded shadow p-6 mb-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Database className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold">Database Connection Status</h2>
            </div>
            <button
              onClick={handleRefreshData}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 rounded bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Data
            </button>
          </div>
          <div className="p-4 rounded bg-gray-50">
            {isLoading && <p className="flex items-center text-blue-600"><Clock className="w-5 h-5 animate-spin mr-2" />Loading data from database...</p>}
            {loadStatus === 'success' && <p className="text-green-600">✅ Successfully loaded {data.length} records from database</p>}
            {loadStatus === 'error' && <p className="text-red-600">❌ Error connecting to database. Please check connection settings.</p>}
            {loadStatus === 'idle' && !isLoading && <p className="text-gray-600">🔄 Ready to load data...</p>}
          </div>
        </div>

        {data.length === 0 && loadStatus === 'idle' && !isLoading && (
          <div className="text-center bg-blue-50 p-6 rounded border border-blue-200 text-blue-700">
            <TrendingUp className="mx-auto w-12 h-12 mb-4" />
            Connect to database to see analytics
          </div>
        )}

        {data.length > 0 && (
          <>
            <div className="mb-6 flex gap-4 overflow-auto">
              {['overview', 'attribute', 'parameter', 'subCategory', 'type'].map(tab => (
                <button key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`whitespace-nowrap px-4 py-2 rounded font-semibold ${activeTab === tab ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
              <button
                onClick={handleExport}
                className="ml-auto flex items-center gap-2 px-4 py-2 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700"
              >
                <Download className="w-5 h-5" />
                Export Report
              </button>
            </div>

            <div className="bg-white rounded shadow p-6 border border-gray-200 overflow-auto">
              {activeTab === 'overview' && (
                <div className="space-y-3">
                  <h3 className="text-xl font-semibold mb-4">Overview Metrics</h3>
                  <p><b>Total Quantity:</b> {analytics.overview.totalQuantity.toFixed(2)}</p>
                  <p><b>Total Value:</b> {analytics.overview.totalValue.toFixed(2)}</p>
                  <p><b>Average Conversion Factor:</b> {analytics.overview.avgConvFactor.toFixed(3)}</p>
                  <p><b>Average CF STD:</b> {analytics.overview.avgCfStd.toFixed(3)}</p>
                </div>
              )}

              {(activeTab === 'attribute' || activeTab === 'parameter' || activeTab === 'subCategory' || activeTab === 'type') && (
                <>
                  <h3 className="text-xl font-semibold mb-4">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Breakdown</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={(analytics as any)[`by${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      {/* Removed XAxis labels */}
                      <XAxis dataKey="category" tick={false} axisLine={false} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="totalQuantity" fill={colors[0]} name="Total Quantity" />
                      <Bar dataKey="totalValue" fill={colors[1]} name="Total Value" />
                      <Bar dataKey="avgConvFactor" fill={colors[2]} name="Avg Conv Factor" />
                      <Bar dataKey="avgCfStd" fill={colors[3]} name="Avg CF STD" />
                    </BarChart>
                  </ResponsiveContainer>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AttributeDetailsAnalytics;
