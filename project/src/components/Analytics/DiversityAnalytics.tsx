import { useState, useCallback, useMemo } from 'react';
import {
  Upload,
  FileSpreadsheet,
  TrendingUp,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  Flag,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import * as XLSX from 'xlsx';

const fieldMapping = {
  'Sr.No.': 'srNo',
  'Sr No': 'srNoAlt',
  'Objective Code': 'objectiveCode',
  'Financial Year': 'financialYear',
  'Month': 'month',
  'Attribute': 'attribute',
  'Dim1': 'dim1',
  'Dim2': 'dim2',
  'Emission Source': 'emissionSource',
  'Start Date': 'startDate',
  'End Date': 'endDate',
  'Wages Paid To Females': 'wagesFemales',
  'Wages Paid To Male': 'wagesMales',
  'Total Complaints': 'totalComplaints',
  'Complaints By Female Employee': 'complaintsByFemale',
  'Complaints on POSH upheld': 'poshUpheld',
  'Actual Compliance Ind': 'complianceInd',
};

const numericFields = [
  'wagesFemales',
  'wagesMales',
  'totalComplaints',
  'complaintsByFemale',
  'poshUpheld',
];

const parseNumeric = (val: any) => {
  if (val == null || val === '') return 0;
  if (typeof val === 'number') return val;
  const cleaned = val.toString().replace(/[,₹$€£¥]/g, '').trim();
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

const colors = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];

const DiversityDataAnalytics = () => {
  const [data, setData] = useState<Record<string, any>[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target?.files?.[0];
    if (!file) return;
    setIsLoading(true);
    setUploadStatus('idle');
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const result = e.target?.result;
        if (!result) throw new Error('Empty file content');
        const workbook = XLSX.read(result as any, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[];
        if (rows.length < 2) throw new Error('Excel must contain headers and rows');

        // Detect header row dynamically
        let headerRowIndex = -1;
        let headers: string[] = [];
        for (let i = 0; i < Math.min(10, rows.length); i++) {
          const row = rows[i] as any[];
          if (Array.isArray(row)) {
            if (Object.keys(fieldMapping).every(h => row.includes(h as any))) {
              headerRowIndex = i;
              headers = row as string[];
              break;
            }
          }
        }
        if (headerRowIndex === -1) throw new Error('Header row not found with required fields');

        const dataRows = rows.slice(headerRowIndex + 1) as any[];

        const processed = dataRows
          .filter(
            (row: any) =>
              Array.isArray(row) && row.some((cell: any) => cell !== null && cell !== undefined && cell !== '')
          )
          .map((row: any[]) => {
            let mapped: Record<string, any> = {};
            headers.forEach((header: string, idx: number) => {
              const key = (fieldMapping as any)[header];
              if (!key) return;
              const value = row[idx];
              if (numericFields.includes(key)) {
                mapped[key] = parseNumeric(value);
              } else {
                mapped[key] = value ? value.toString().trim() : '';
              }
            });
            return mapped;
          });

        if (!processed.length) throw new Error('No valid data found');

        setData(processed);
        setUploadStatus('success');
        setIsLoading(false);
      } catch (error) {
        setUploadStatus('error');
        setIsLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  }, []);

  const analytics = useMemo(() => {
    if (data.length === 0)
      return {
        overviewMetrics: null,
        wagesTrends: [],
        complaintsBreakdown: [],
        poshTrend: [],
        complianceSummary: 0,
      };

    const overviewMetrics = {
      totalWagesFemales: 0,
      totalWagesMales: 0,
      totalComplaints: 0,
      totalComplaintsByFemales: 0,
      totalPOSHUpheld: 0,
      complianceCount: 0,
      complianceTotal: 0,
    };

    const monthYearMap = new Map();
    const complaintsByDim1 = new Map();
    const complaintsByDim2 = new Map();

    data.forEach(d => {
      overviewMetrics.totalWagesFemales += d.wagesFemales;
      overviewMetrics.totalWagesMales += d.wagesMales;
      overviewMetrics.totalComplaints += d.totalComplaints;
      overviewMetrics.totalComplaintsByFemales += d.complaintsByFemale;
      overviewMetrics.totalPOSHUpheld += d.poshUpheld;
      if (d.complianceInd?.toLowerCase() === 'y') overviewMetrics.complianceCount++;
      overviewMetrics.complianceTotal++;

      const key = `${d.month || 'Unknown'} ${d.financialYear || 'Unknown'}`;
      if (!monthYearMap.has(key)) {
        monthYearMap.set(key, {
          monthYear: key,
          wagesFemales: 0,
          wagesMales: 0,
          complaints: 0,
          complaintsByFemales: 0,
          poshUpheld: 0,
          recordCount: 0,
        });
      }

      const monthData = monthYearMap.get(key);
      monthData.wagesFemales += d.wagesFemales;
      monthData.wagesMales += d.wagesMales;
      monthData.complaints += d.totalComplaints;
      monthData.complaintsByFemales += d.complaintsByFemale;
      monthData.poshUpheld += d.poshUpheld;
      monthData.recordCount++;

      if (d.dim1) {
        complaintsByDim1.set(d.dim1, (complaintsByDim1.get(d.dim1) || 0) + d.totalComplaints);
      }
      if (d.dim2) {
        complaintsByDim2.set(d.dim2, (complaintsByDim2.get(d.dim2) || 0) + d.totalComplaints);
      }
    });

    const wagesTrends = Array.from(monthYearMap.values()).map((m: any) => ({
      monthYear: m.monthYear,
      wagesFemales: m.wagesFemales,
      wagesMales: m.wagesMales,
    }));

    const complaintsBreakdown = Array.from(complaintsByDim1.entries()).map(([dim1, count]) => ({
      category: dim1,
      totalComplaints: count,
    }));

    const poshTrend = Array.from(monthYearMap.values()).map((m: any) => ({
      monthYear: m.monthYear,
      poshUpheld: m.poshUpheld,
    }));

    const complianceSummary =
      overviewMetrics.complianceTotal > 0
        ? (overviewMetrics.complianceCount / overviewMetrics.complianceTotal) * 100
        : 0;

    return {
      overviewMetrics,
      wagesTrends,
      complaintsBreakdown,
      poshTrend,
      complianceSummary,
    };
  }, [data]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">ESG Diversity Data Analytics</h1>
          <p className="text-gray-600">Import, analyze, and visualize diversity, wages, and compliance data</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <FileSpreadsheet className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-semibold text-gray-900">Import Excel Diversity Data</h2>
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <label htmlFor="file-upload" className="cursor-pointer">
              <span className="text-lg font-medium text-indigo-600 hover:text-indigo-500">Choose Excel file</span>
              <input id="file-upload" type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          {isLoading && (
            <div className="mt-4 flex items-center gap-2 text-indigo-600">
              <Clock className="w-5 h-5 animate-spin" />
              <span>Processing Excel file...</span>
            </div>
          )}

          {uploadStatus === 'success' && (
            <div className="mt-4 flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span>Successfully loaded {data.length} diversity records</span>
            </div>
          )}

          {uploadStatus === 'error' && (
            <div className="mt-4 flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              <span>Error importing file. Please check the format and try again.</span>
            </div>
          )}
        </div>

        {data.length > 0 && (
          <>
            {/* Overview Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
              <div className="bg-white p-6 rounded-lg shadow border border-gray-200 flex items-center">
                <Users className="w-8 h-8 text-indigo-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">Total Wages Paid To Females</p>
                  <p className="text-2xl font-semibold">
                    {(analytics.overviewMetrics?.totalWagesFemales ?? 0).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow border border-gray-200 flex items-center">
                <Users className="w-8 h-8 text-blue-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">Total Wages Paid To Males</p>
                  <p className="text-2xl font-semibold">
                    {(analytics.overviewMetrics?.totalWagesMales ?? 0).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow border border-gray-200 flex items-center">
                <TrendingUp className="w-8 h-8 text-yellow-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">Total Complaints</p>
                  <p className="text-2xl font-semibold">{analytics.overviewMetrics?.totalComplaints ?? 0}</p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow border border-gray-200 flex items-center">
                <Users className="w-8 h-8 text-red-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">Complaints By Female Employees</p>
                  <p className="text-2xl font-semibold">{analytics.overviewMetrics?.totalComplaintsByFemales ?? 0}</p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow border border-gray-200 flex items-center">
                <Flag className="w-8 h-8 text-green-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">Compliance Rate (%)</p>
                  <p className="text-2xl font-semibold">{analytics.complianceSummary.toFixed(1)}%</p>
                </div>
              </div>
            </div>

            {/* Wage Trends */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Monthly Wage Trends</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.wagesTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="monthYear" tick={false} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="wagesFemales" stroke={colors[0]} name="Wages to Females" />
                  <Line type="monotone" dataKey="wagesMales" stroke={colors[1]} name="Wages to Males" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Complaints Breakdown */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Complaints Breakdown by Dimension 1</h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={analytics.complaintsBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" tick={false} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="totalComplaints" fill={colors[2]} name="Total Complaints" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* POSH Upheld Trend */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-4">POSH Complaints Upheld Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.poshTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="monthYear" tick={false} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="poshUpheld" stroke={colors[3]} name="POSH Upheld" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DiversityDataAnalytics;
