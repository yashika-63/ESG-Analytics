import React, { useState, useCallback, useMemo } from 'react';
import { Upload, FileSpreadsheet, TrendingUp, Clock } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line
} from 'recharts';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface FugitiveAnalyticsProps {
  filters?: any;
}

const FugitiveAnalytics: React.FC<FugitiveAnalyticsProps> = () => {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const fieldMapping: Record<string, string> = {
    "Sr.No.": "srNo",
    "Attribute Id": "attributeId",
    "Sr No": "srNoAlt",
    "Financial Year": "financialYear",
    "Month": "month",
    "Business Code": "businessCode",
    "Plant": "plant",
    "Department": "department",
    "Objective Code": "objectiveCode",
    "Attribute": "attribute",
    "Parameter": "parameter",
    "Sub Category": "subCategory",
    "Type": "type",
    "Quantity": "quantity",
    "Conv Factor": "convFactor",
    "Value": "value",
    "RIntensity": "rIntensity",
    "PPPIntensity": "pppIntensity",
    "Conv Standards": "convStandards",
    "Doc Status": "docStatus",
    "Pending With": "pendingWith",
  };

  const parseNumeric = (val: any): number => {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const cleanVal = val.replace(/[,₹$€£¥]/g, '').trim();
      const parsed = parseFloat(cleanVal);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  // File Upload
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setUploadStatus('idle');

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const fileData = e.target?.result;
        const workbook = XLSX.read(fileData, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

        if (jsonData.length < 6) throw new Error("Excel must contain header and data rows");

        const headers = jsonData[4]; // Row 5 = headers
        const dataRows = jsonData.slice(5); // From row 6 onwards

        const processedData = dataRows
          .filter(row => row && row.some(cell => cell !== null && cell !== undefined && cell !== ''))
          .map(row => {
            const mappedRow: any = {};
            headers.forEach((header: string, idx: number) => {
              if (header && fieldMapping[header]) {
                const key = fieldMapping[header];
                const val = row[idx];
                const numericFields = ["quantity", "convFactor", "value", "rIntensity", "pppIntensity"];
                mappedRow[key] = numericFields.includes(key)
                  ? parseNumeric(val)
                  : (val ? val.toString().trim() : '');
              }
            });
            return mappedRow;
          });

        if (processedData.length === 0) throw new Error("No valid data found");

        setData(processedData);
        setUploadStatus('success');
      } catch (error) {
        console.error("Excel processing error:", error);
        setUploadStatus('error');
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  }, []);

  // Analytics
  const analytics = useMemo(() => {
    if (data.length === 0)
      return {
        byType: [],
        byAttribute: [],
        byParameter: [],
        bySubCategory: [],
        monthlyTrends: []
      };

    const aggregate = (key: string) => {
      const map = new Map<string, any>();
      data.forEach(d => {
        const cat = d[key] || "Unknown";
        if (!map.has(cat)) {
          map.set(cat, {
            category: cat,
            totalQuantity: 0,
            totalValue: 0,
            convFactorSum: 0,
            rIntensitySum: 0,
            pppIntensitySum: 0,
            count: 0
          });
        }
        const agg = map.get(cat);
        agg.totalQuantity += d.quantity || 0;
        agg.totalValue += d.value || 0;
        agg.convFactorSum += d.convFactor || 0;
        agg.rIntensitySum += d.rIntensity || 0;
        agg.pppIntensitySum += d.pppIntensity || 0;
        agg.count++;
      });
      return [...map.values()].map(v => ({
        category: v.category,
        totalQuantity: v.totalQuantity,
        totalValue: v.totalValue,
        avgConvFactor: v.count ? v.convFactorSum / v.count : 0,
        avgRIntensity: v.count ? v.rIntensitySum / v.count : 0,
        avgPPPIntensity: v.count ? v.pppIntensitySum / v.count : 0,
      }));
    };

    // Monthly Trends
    const monthlyMap = new Map<string, any>();
    data.forEach(d => {
      const key = `${d.month || 'Unknown'} ${d.financialYear || 'Unknown'} ${d.type || 'Unknown'}`;
      if (!monthlyMap.has(key)) {
        monthlyMap.set(key, {
          monthYearType: key,
          month: d.month,
          year: d.financialYear,
          type: d.type,
          totalQuantity: 0,
          totalValue: 0
        });
      }
      const agg = monthlyMap.get(key);
      agg.totalQuantity += d.quantity || 0;
      agg.totalValue += d.value || 0;
    });

    return {
      byType: aggregate("type"),
      byAttribute: aggregate("attribute"),
      byParameter: aggregate("parameter"),
      bySubCategory: aggregate("subCategory"),
      monthlyTrends: [...monthlyMap.values()]
    };
  }, [data]);

  // Chart Data Accessor Helper (typed)
  const getAnalyticsData = (key: 'byType' | 'byAttribute' | 'byParameter' | 'bySubCategory' | 'monthlyTrends') =>
    analytics[key] || [];

  return (
    <div className="p-6 space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileSpreadsheet className="w-6 h-6 mr-2 text-green-600" />
            Import Fugitive Excel Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-gray-300 p-8 text-center rounded-lg">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <label
              htmlFor="fugitive-upload"
              className="cursor-pointer text-lg font-medium text-green-600 hover:text-green-500"
            >
              Choose Excel file
              <input id="fugitive-upload" type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" />
            </label>
            {isLoading && (
              <p className="mt-4 text-green-600 flex items-center justify-center">
                <Clock className="w-5 h-5 animate-spin mr-2" /> Processing...
              </p>
            )}
            {uploadStatus === "success" && (
              <p className="mt-4 text-green-600">Loaded {data.length} records successfully</p>
            )}
            {uploadStatus === "error" && <p className="mt-4 text-red-600">Error reading Excel. Check format.</p>}
          </div>
        </CardContent>
      </Card>

      {/* Analytics Section */}
      {data.length > 0 && (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="type">Type</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="attribute">Attribute</TabsTrigger>
            <TabsTrigger value="parameter">Parameter</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview">
            <Card>
              <CardHeader><CardTitle>Key Metrics Overview</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {[
                    { label: 'Total Records', value: data.length, color: 'blue' },
                    { label: 'Total Quantity', value: data.reduce((a, v) => a + (v.quantity || 0), 0).toFixed(2), color: 'green' },
                    { label: 'Total Value', value: data.reduce((a, v) => a + (v.value || 0), 0).toFixed(2), color: 'yellow' },
                    { label: 'Avg Conv Factor', value: (data.reduce((a, v) => a + (v.convFactor || 0), 0) / data.length).toFixed(3), color: 'purple' },
                    { label: 'Avg RIntensity', value: (data.reduce((a, v) => a + (v.rIntensity || 0), 0) / data.length).toFixed(3), color: 'red' },
                    { label: 'Avg PPPIntensity', value: (data.reduce((a, v) => a + (v.pppIntensity || 0), 0) / data.length).toFixed(3), color: 'indigo' },
                  ].map((m, i) => (
                    <div key={i} className={`text-center p-4 bg-${m.color}-50 rounded-lg`}>
                      <p className={`text-2xl font-bold text-${m.color}-600`}>{m.value}</p>
                      <p className="text-sm text-gray-600">{m.label}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Type Breakdown */}
          <TabsContent value="type">
            <Card>
              <CardHeader><CardTitle>Totals by Type</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={getAnalyticsData('byType')}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" tick={false} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="totalQuantity" fill="#10B981" name="Quantity" />
                    <Bar dataKey="totalValue" fill="#EF4444" name="Value" />
                    <Bar dataKey="avgConvFactor" fill="#3B82F6" name="Avg Conv Factor" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Monthly Trends */}
          <TabsContent value="monthly">
            <Card>
              <CardHeader><CardTitle>Monthly Trends</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={getAnalyticsData('monthlyTrends')}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="monthYearType" tick={false} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="totalQuantity" stroke="#10B981" name="Quantity" />
                    <Line type="monotone" dataKey="totalValue" stroke="#EF4444" name="Value" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Attribute + Parameter */}
          {["attribute", "parameter"].map(cat => (
            <TabsContent key={cat} value={cat}>
              <Card>
                <CardHeader><CardTitle>{cat.charAt(0).toUpperCase() + cat.slice(1)} Breakdown</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart
                      data={getAnalyticsData(cat === 'attribute' ? 'byAttribute' : 'byParameter')}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="totalQuantity" fill="#10B981" name="Quantity" />
                      <Bar dataKey="totalValue" fill="#EF4444" name="Value" />
                      <Bar dataKey="avgConvFactor" fill="#3B82F6" name="Avg Conv Factor" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* Empty State */}
      {data.length === 0 && uploadStatus === "idle" && (
        <Card>
          <CardContent className="p-6 text-center text-blue-700">
            <TrendingUp className="mx-auto w-12 h-12 mb-4" />
            <p>Upload Fugitive data Excel to generate analytics.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FugitiveAnalytics;
