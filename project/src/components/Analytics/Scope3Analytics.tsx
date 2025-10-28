import React, { useState, useCallback, useMemo } from 'react';
import { Upload, FileSpreadsheet, BarChart3, PieChart, TrendingUp, Zap, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart as RechartsPieChart, Pie, Cell 
} from 'recharts';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4", "#84CC16"];

const Scope3Analytics = ({ filters }: { filters: any }) => {
  const [data, setData] = useState<Record<string, any>[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('idle');

  // Field mapping from Excel columns
  const fieldMapping = {
    "Sr.No.": "srNo",
    "BRSR ID": "brsrId",
    "Financial Year": "financialYear",
    "Business Code": "businessCode",
    "Plant": "plant",
    "Department": "department",
    "Attribute": "attribute",
    "Parameter": "parameter",
    "Sub Category": "subCategory",
    "Total Quantity": "totalQuantity",
    "Total EFFuel": "totalEFFuel",
    "Total Value": "totalValue",
    "Doc Status": "docStatus",
    "Pending With": "pendingWith"
  };

  const numericFields = ["totalQuantity", "totalEFFuel", "totalValue"];

  // Numeric parse helper
  const parseNumeric = (val: any) => {
    if(val == null || val === '') return 0;
    if(typeof val === 'number') return val;
    if(typeof val === 'string'){
      const cleaned = val.replace(/[,₹$€£¥]/g, '').trim();
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  // Excel file upload and parse
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target?.files?.[0];
    if(!file) return;

    setIsLoading(true);
    setUploadStatus('idle');

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) throw new Error('Empty file content');
        const workbook = XLSX.read(data as any, {type: 'binary'});
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, {header: 1}) as any[];

        if(rows.length < 2) throw new Error('Excel must contain header and data rows');

        // Find header row
        let headerIndex = -1;
        let headers: string[] = [];
        for(let i=0; i < Math.min(10, rows.length); i++){
          const row = rows[i] as any[];
          if(row && Array.isArray(row)){
            const hasAllCols = Object.keys(fieldMapping).every(col => row.includes(col as any));
            if(hasAllCols){
              headerIndex = i;
              headers = row as string[];
              break;
            }
          }
        }
        if(headerIndex === -1) throw new Error('Header row not found with expected columns');

        const dataRows = rows.slice(headerIndex + 1) as any[];

        const processedData = dataRows
          .filter((r: any) => r && Array.isArray(r) && r.some((cell: any) => cell !== null && cell !== undefined && cell !== ''))
          .map((row: any[]) => {
            const mapped: Record<string, any> = {};
            headers.forEach((h, idx) => {
              if(h && typeof h === 'string' && (fieldMapping as any)[h]){
                const key = (fieldMapping as any)[h];
                const val = row[idx];
                if(numericFields.includes(key)){
                  mapped[key] = parseNumeric(val);
                } else {
                  mapped[key] = val ? val.toString().trim() : '';
                }
              }
            });
            return mapped;
          });

        if(processedData.length === 0) throw new Error('No valid data found');

        setData(processedData);
        setUploadStatus('success');
        setIsLoading(false);
      } catch(error) {
        console.error('Excel parse error:', error);
        setUploadStatus('error');
        setIsLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  }, []);

  // Advanced analytics
  const analytics = useMemo(() => {
    if(data.length === 0) return { bySubCategory: [], totals: { totalQuantity: 0, totalEFFuel: 0, totalValue: 0 }, byYear: [], byDept: [], efficiency: [], topContributors: [] };

    const mapSub = new Map();
    const mapYear = new Map();
    const mapDept = new Map();
    const totals = { totalQuantity: 0, totalEFFuel: 0, totalValue: 0 };

    data.forEach(d => {
      const cat = d.subCategory || 'Unknown';
      const year = d.financialYear || 'NA';
      const dept = d.department || 'NA';

      // SubCategory Aggregation
      if(!mapSub.has(cat)){
        mapSub.set(cat, { subCategory: cat, totalQuantity: 0, totalEFFuel: 0, totalValue: 0 });
      }
      const aggSub = mapSub.get(cat);
      aggSub.totalQuantity += d.totalQuantity || 0;
      aggSub.totalEFFuel += d.totalEFFuel || 0;
      aggSub.totalValue += d.totalValue || 0;

      // Yearly Aggregation
      if(!mapYear.has(year)){
        mapYear.set(year, { financialYear: year, totalQuantity: 0, totalEFFuel: 0, totalValue: 0 });
      }
      const aggYear = mapYear.get(year);
      aggYear.totalQuantity += d.totalQuantity || 0;
      aggYear.totalEFFuel += d.totalEFFuel || 0;
      aggYear.totalValue += d.totalValue || 0;

      // Department Aggregation
      if(!mapDept.has(dept)){
        mapDept.set(dept, { department: dept, totalQuantity: 0, totalEFFuel: 0, totalValue: 0 });
      }
      const aggDept = mapDept.get(dept);
      aggDept.totalQuantity += d.totalQuantity || 0;
      aggDept.totalEFFuel += d.totalEFFuel || 0;
      aggDept.totalValue += d.totalValue || 0;

      // Totals
      totals.totalQuantity += d.totalQuantity || 0;
      totals.totalEFFuel += d.totalEFFuel || 0;
      totals.totalValue += d.totalValue || 0;
    });

    // Efficiency Ratios
    const efficiency = Array.from(mapSub.values()).map(s => ({
      subCategory: s.subCategory,
      valuePerEFFuel: s.totalEFFuel > 0 ? s.totalValue / s.totalEFFuel : 0,
      effuelPerQuantity: s.totalQuantity > 0 ? s.totalEFFuel / s.totalQuantity : 0,
    }));

    // Top Contributors
    const topContributors = Array.from(mapSub.values())
      .sort((a,b) => b.totalValue - a.totalValue)
      .slice(0, 5);

    return { 
      bySubCategory: Array.from(mapSub.values()), 
      byYear: Array.from(mapYear.values()), 
      byDept: Array.from(mapDept.values()), 
      totals, 
      efficiency,
      topContributors
    };
  }, [data]);

  return (
    <div className="p-6 space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileSpreadsheet className="w-6 h-6 mr-2 text-green-600" />
            Upload Scope 3 Data Excel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-gray-300 p-8 text-center rounded-lg">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <label htmlFor="scope3-upload" className="cursor-pointer font-medium text-green-600 hover:text-green-500">
              Choose Excel file
              <input id="scope3-upload" type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" />
            </label>

            {isLoading && <p className="mt-4 flex items-center justify-center text-green-600"><Clock className="w-5 h-5 animate-spin mr-2" />Processing...</p>}
            {uploadStatus === 'success' && <p className="mt-4 text-green-600">Successfully loaded {data.length} records</p>}
            {uploadStatus === 'error' && <p className="mt-4 text-red-600">Error loading file. Check format & try again.</p>}
          </div>
        </CardContent>
      </Card>

      {/* Analytics */}
      {data.length > 0 && (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="subcategory">Sub Category</TabsTrigger>
            <TabsTrigger value="yearly">Yearly Trends</TabsTrigger>
            <TabsTrigger value="department">Department</TabsTrigger>
            <TabsTrigger value="efficiency">Efficiency</TabsTrigger>
            <TabsTrigger value="top">Top Contributors</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle>Total Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{analytics.totals.totalQuantity.toFixed(2)}</p>
                    <p className="text-sm text-gray-600">Total Quantity</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{analytics.totals.totalEFFuel.toFixed(2)}</p>
                    <p className="text-sm text-gray-600">Total EFFuel</p>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <p className="text-2xl font-bold text-yellow-600">{analytics.totals.totalValue.toFixed(2)}</p>
                    <p className="text-sm text-gray-600">Total Value</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SubCategory Breakdown */}
          <TabsContent value="subcategory">
            <Card>
              <CardHeader>
                <CardTitle>By Sub Category</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={analytics.bySubCategory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="subCategory" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="totalQuantity" fill="#10B981" />
                    <Bar dataKey="totalEFFuel" fill="#3B82F6" />
                    <Bar dataKey="totalValue" fill="#EF4444" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Yearly Trends */}
          <TabsContent value="yearly">
            <Card>
              <CardHeader>
                <CardTitle>Yearly Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={analytics.byYear}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="financialYear" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="totalQuantity" stroke="#10B981" />
                    <Line type="monotone" dataKey="totalEFFuel" stroke="#3B82F6" />
                    <Line type="monotone" dataKey="totalValue" stroke="#EF4444" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Department Analytics */}
          <TabsContent value="department">
            <Card>
              <CardHeader>
                <CardTitle>By Department</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={analytics.byDept}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="department" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="totalQuantity" fill="#10B981" />
                    <Bar dataKey="totalEFFuel" fill="#3B82F6" />
                    <Bar dataKey="totalValue" fill="#EF4444" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Efficiency Ratios */}
          <TabsContent value="efficiency">
            <Card>
              <CardHeader>
                <CardTitle>Efficiency Ratios</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={analytics.efficiency}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="subCategory" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="valuePerEFFuel" stroke="#F59E0B" fill="#FDE68A" name="Value per EFFuel" />
                    <Area type="monotone" dataKey="effuelPerQuantity" stroke="#06B6D4" fill="#CFFAFE" name="EFFuel per Quantity" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

        {/* Top Contributors */}
<TabsContent value="top">
  <Card>
    <CardHeader>
      <CardTitle>Top 5 Contributors (By Value)</CardTitle>
    </CardHeader>
    <CardContent>
      {/* Pie Chart */}
      <ResponsiveContainer width="100%" height={300}>
        <RechartsPieChart>
          <Pie 
            data={analytics.topContributors} 
            dataKey="totalValue" 
            nameKey="subCategory" 
            cx="50%" cy="50%" 
            outerRadius={120} 
            fill="#8884d8" 
          >
            {analytics.topContributors.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </RechartsPieChart>
      </ResponsiveContainer>

      {/* Table below the pie chart */}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full border border-gray-200 text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border border-gray-200 text-left">Sub Category</th>
              <th className="p-2 border border-gray-200 text-right">Total Value</th>
            </tr>
          </thead>
          <tbody>
            {analytics.topContributors.map((item, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="p-2 border border-gray-200">{item.subCategory}</td>
                <td className="p-2 border border-gray-200 text-right">
                  {item.totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CardContent>
  </Card>
</TabsContent>

        </Tabs>
      )}

      {/* Empty State */}
      {data.length === 0 && uploadStatus === 'idle' && (
        <Card>
          <CardContent className="p-6 text-center text-blue-700">
            <TrendingUp className="mx-auto w-12 h-12 mb-4" />
            <p>Upload an Excel file with Scope 3 data to get started.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Scope3Analytics;