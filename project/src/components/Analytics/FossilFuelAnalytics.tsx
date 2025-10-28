import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Database,
  RefreshCw,
  TrendingUp,
  Clock,
  AlertTriangle,
  BarChart3,
  PieChart as PieChartIcon,
} from "lucide-react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getFossilFuelData } from "../../services/apiService"; // ✅ API call method

// ---------------- CONFIG ---------------- //
const COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#14B8A6"];

interface FossilFuelRecord {
  srNo: string;
  attributeId: number;
  financialYear: string;
  month: string;
  businessCode: string;
  plant: string;
  department: string;
  attribute: string;
  parameter: string;
  subCategory: string;
  type: string;
  quantity: number;
  convFactor: number;
  value: number;
  cfStd: number;
}

const FossilFuelAnalytics: React.FC = () => {
  const [data, setData] = useState<FossilFuelRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // ---------------- FETCH REAL-TIME DATA ---------------- //
  const fetchFossilFuelData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await getFossilFuelData(); // fetch from API
      if (!response || response.length === 0) throw new Error("No data found from API.");

      setData(response);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error("API Fetch Error:", err);
      setError("Failed to fetch Fossil Fuel data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFossilFuelData();
  }, [fetchFossilFuelData]);

  // ---------------- ANALYTICS COMPUTATION ---------------- //
  const analytics = useMemo(() => {
    if (data.length === 0)
      return { byType: [], byDepartment: [], byPlant: [], totals: { totalQty: 0, totalValue: 0, avgConv: 0 } };

    const typeMap = new Map<string, any>();
    const deptMap = new Map<string, any>();
    const plantMap = new Map<string, any>();

    let totalQty = 0;
    let totalValue = 0;
    let convSum = 0;

    data.forEach((item) => {
      const qty = item.quantity || 0;
      const val = item.value || 0;
      const conv = item.convFactor || 0;

      totalQty += qty;
      totalValue += val;
      convSum += conv;

      // --- Type Aggregation ---
      const t = item.type || "Unknown";
      if (!typeMap.has(t)) typeMap.set(t, { type: t, totalQty: 0, totalValue: 0, avgConv: 0 });
      const typeEntry = typeMap.get(t);
      typeEntry.totalQty += qty;
      typeEntry.totalValue += val;
      typeEntry.avgConv += conv;

      // --- Department Aggregation ---
      const dept = item.department || "Unknown";
      if (!deptMap.has(dept)) deptMap.set(dept, { department: dept, totalValue: 0 });
      deptMap.get(dept).totalValue += val;

      // --- Plant Aggregation ---
      const plant = item.plant || "Unknown";
      if (!plantMap.has(plant)) plantMap.set(plant, { plant: plant, totalQty: 0 });
      plantMap.get(plant).totalQty += qty;
    });

    const byType = Array.from(typeMap.values()).map((t) => ({
      type: t.type,
      totalQty: t.totalQty,
      totalValue: t.totalValue,
      avgConvFactor: t.totalQty > 0 ? t.avgConv / data.length : 0,
    }));

    const byDepartment = Array.from(deptMap.values());
    const byPlant = Array.from(plantMap.values());

    return {
      byType,
      byDepartment,
      byPlant,
      totals: {
        totalQty,
        totalValue,
        avgConv: data.length > 0 ? convSum / data.length : 0,
      },
    };
  }, [data]);

  // ---------------- UI ---------------- //
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Database className="w-6 h-6 mr-2 text-green-600" />
              Fossil Fuel Analytics
            </div>
            <button
              onClick={fetchFossilFuelData}
              className="flex items-center bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm"
            >
              <RefreshCw className="w-4 h-4 mr-1 animate-spin-slow" /> Refresh
            </button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="flex items-center text-green-600">
              <Clock className="w-5 h-5 animate-spin mr-2" /> Fetching live data...
            </p>
          ) : error ? (
            <p className="flex items-center text-red-600">
              <AlertTriangle className="w-5 h-5 mr-2" /> {error}
            </p>
          ) : (
            <>
              <p className="text-sm text-gray-500">Last updated: {lastUpdated ? lastUpdated.toLocaleString() : "—"}</p>
              <p className="text-gray-700 mt-2">Live fossil fuel consumption analytics for Scope 1 GHG emissions.</p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Overview */}
      {data.length > 0 && (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="type">By Type</TabsTrigger>
            <TabsTrigger value="department">By Department</TabsTrigger>
            <TabsTrigger value="plant">By Plant</TabsTrigger>
          </TabsList>

          {/* ---- OVERVIEW ---- */}
          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle>Overall Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{data.length}</p>
                    <p className="text-sm text-gray-600">Records</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{analytics.totals.totalQty.toFixed(2)}</p>
                    <p className="text-sm text-gray-600">Total Quantity</p>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <p className="text-2xl font-bold text-yellow-600">{analytics.totals.totalValue.toFixed(2)}</p>
                    <p className="text-sm text-gray-600">Total Value</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <p className="text-2xl font-bold text-purple-600">{analytics.totals.avgConv.toFixed(2)}</p>
                    <p className="text-sm text-gray-600">Avg Conversion Factor</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---- BY TYPE ---- */}
          <TabsContent value="type">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
                  Analytics by Fuel Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={analytics.byType}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="type" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="totalQty" fill="#10B981" name="Total Quantity" />
                    <Bar dataKey="totalValue" fill="#F59E0B" name="Total Value" />
                    <Bar dataKey="avgConvFactor" fill="#3B82F6" name="Avg Conv Factor" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---- BY DEPARTMENT ---- */}
          <TabsContent value="department">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2 text-green-600" />
                  Department-Wise Value
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={analytics.byDepartment}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="department" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="totalValue" fill="#14B8A6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---- BY PLANT ---- */}
          <TabsContent value="plant">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChartIcon className="w-5 h-5 mr-2 text-purple-600" />
                  Plant-Wise Quantity Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <RechartsPieChart>
                    <Pie
                      data={analytics.byPlant}
                      dataKey="totalQty"
                      nameKey="plant"
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                    >
                      {analytics.byPlant.map((_, idx) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Empty state */}
      {!isLoading && data.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center text-blue-700">
            <TrendingUp className="mx-auto w-12 h-12 mb-4" />
            <p>No Fossil Fuel data available. Try refreshing.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FossilFuelAnalytics;
