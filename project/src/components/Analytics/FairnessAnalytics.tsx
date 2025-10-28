import React, { useState, useCallback, useMemo } from 'react';
import { Upload, FileSpreadsheet, CreditCard, Shield, CheckCircle, AlertTriangle, Clock, Flag } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import * as XLSX from 'xlsx';

const fieldMapping = {
  'Sr.No.': 'srNo',
  'Sr No': 'srNoAlt',
  'Objective Code': 'objectiveCode',
  'Financial Year': 'financialYear',
  'Month': 'month',
  'Dim1': 'dim1',
  'Dim2': 'dim2',
  'Attribute': 'attribute',
  'Start Date': 'startDate',
  'End Date': 'endDate',
  'Accounts Payable': 'accountsPayable',
  'Customer Data Breach%': 'customerDataBreachPct',
  'Actual Compliance Ind': 'complianceInd'
};

const numericFields = ['accountsPayable', 'customerDataBreachPct'];

const parseNumeric = (val:any) => {
  if (val == null || val === '') return 0;
  if (typeof val === 'number') return val;
  const cleaned = val.toString().replace(/[,₹$%]/g, '').trim();
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

const colors = ['#3B82F6', '#EF4444', '#34D399', '#F59E0B'];

const FairnessDataAnalytics = () => {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle'|'success'|'error'>('idle');

  const handleFileUpload = useCallback((e:React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setUploadStatus('idle');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const result = event.target?.result;
        if (!result) throw new Error('Empty file content');
        const workbook = XLSX.read(result, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown as any[];

        if (rows.length < 6) throw new Error('File does not contain expected header and data rows');

        const headerRow = rows[4] as unknown as any[];
        const dataRows = rows.slice(5);

        const colIndexMap: Record<string, number> = {};
        headerRow.forEach((header: any, idx: number) => {
          if (typeof header === 'string' && (fieldMapping as any)[header]) colIndexMap[(fieldMapping as any)[header]] = idx;
        });

        const processed = dataRows
          .filter((row: any) => Array.isArray(row) && row.length > 0 && row.some((cell: any) => cell !== null && cell !== undefined && cell !== ''))
          .map((row: any[]) => {
            const mapped: Record<string, any> = {};
            for (const [field, idx] of Object.entries(colIndexMap)) {
              const val = row[idx];
              mapped[field] = numericFields.includes(field) ? parseNumeric(val) : val != null ? val.toString().trim() : '';
            }
            return mapped;
          });

        if (processed.length === 0) throw new Error('No valid data rows found');

        setData(processed);
        setUploadStatus('success');
        setIsLoading(false);
      } catch (error) {
        console.error(error);
        setUploadStatus('error');
        setIsLoading(false);
      }
    };

    reader.readAsBinaryString(file);
  }, []);

  const analytics = useMemo(() => {
    if (!data.length) return { overview: null, monthlyTrends: [], dimension1: [], dimension2: [], complianceRate: 0 };

    const overview = {
      totalAccountsPayable: 0,
      totalDataBreachPct: 0,
      complianceCount: 0,
      totalRecords: data.length
    };

    const monthMap = new Map<string, any>();
    const dim1Map = new Map<string, number>();
    const dim2Map = new Map<string, number>();

    data.forEach(d => {
      overview.totalAccountsPayable += d.accountsPayable;
      overview.totalDataBreachPct += d.customerDataBreachPct;
      if (d.complianceInd.toUpperCase() === 'Y') overview.complianceCount++;

      const monthKey = `${d.month || 'Unknown'} ${d.financialYear || 'Unknown'}`;
      if (!monthMap.has(monthKey)) monthMap.set(monthKey, { month: monthKey, accountsPayable: 0, totalDataBreachPct: 0, count: 0 });
      const monthObj = monthMap.get(monthKey);
      monthObj.accountsPayable += d.accountsPayable;
      monthObj.totalDataBreachPct += d.customerDataBreachPct;
      monthObj.count++;

      if (d.dim1) dim1Map.set(d.dim1, (dim1Map.get(d.dim1) || 0) + d.accountsPayable);
      if (d.dim2) dim2Map.set(d.dim2, (dim2Map.get(d.dim2) || 0) + d.accountsPayable);
    });

    const monthlyTrends = Array.from(monthMap.values()).map(item => ({
      month: item.month,
      accountsPayable: item.accountsPayable,
      avgDataBreachPct: item.count ? item.totalDataBreachPct / item.count : 0
    }));

    const dimension1 = Array.from(dim1Map.entries()).map(([category, value]) => ({ category, value }));
    const dimension2 = Array.from(dim2Map.entries()).map(([category, value]) => ({ category, value }));

    const complianceRate = overview.totalRecords ? (overview.complianceCount / overview.totalRecords) * 100 : 0;

    return { overview, monthlyTrends, dimension1, dimension2, complianceRate };
  }, [data]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">ESG Fairness Data Analytics</h1>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <FileSpreadsheet className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-semibold">Import Fairness Excel File</h2>
          </div>
          <div className="border-2 border-dashed border-gray-300 rounded p-8 text-center">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <label htmlFor="file-upload" className="cursor-pointer text-indigo-600 font-medium hover:text-indigo-500">
              Choose Excel File
              <input id="file-upload" type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
          {isLoading && <div className="mt-4 flex items-center text-indigo-600 gap-2"><Clock className="w-5 h-5 animate-spin" />Processing file...</div>}
          {uploadStatus === 'success' && <div className="mt-4 flex items-center text-green-600 gap-2"><CheckCircle className="w-5 h-5" />Loaded {data.length} records.</div>}
          {uploadStatus === 'error' && <div className="mt-4 flex items-center text-red-600 gap-2"><AlertTriangle className="w-5 h-5" />Failed to load file.</div>}
        </div>

        {data.length > 0 && analytics.overview && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded p-5 flex items-center gap-3 border border-gray-200">
                <CreditCard className="w-8 h-8 text-indigo-600" />
                <div>
                  <div className="text-sm text-gray-500">Total Accounts Payable</div>
                  <div className="text-2xl font-bold">{analytics.overview.totalAccountsPayable.toLocaleString()}</div>
                </div>
              </div>
              <div className="bg-white rounded p-5 flex items-center gap-3 border border-gray-200">
                <Shield className="w-8 h-8 text-red-500" />
                <div>
                  <div className="text-sm text-gray-500">Average Customer Data Breach %</div>
                  <div className="text-2xl font-bold">{analytics.overview.totalRecords > 0 ? (analytics.overview.totalDataBreachPct / analytics.overview.totalRecords).toFixed(2) : '0.00'}%</div>
                </div>
              </div>
              <div className="bg-white rounded p-5 flex items-center gap-3 border border-gray-200">
                <Flag className="w-8 h-8 text-green-600" />
                <div>
                  <div className="text-sm text-gray-500">Compliance Rate</div>
                  <div className="text-2xl font-bold">{analytics.complianceRate.toFixed(1)}%</div>
                </div>
              </div>
            </div>

            {/* Monthly trends */}
            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-4">Monthly Trends</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={false} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="accountsPayable" stroke={colors[0]} name="Accounts Payable" />
                  <Line type="monotone" dataKey="avgDataBreachPct" stroke={colors[1]} name="Avg Data Breach %" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Dimension 1 Breakdown */}
            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-4">Dimension 1 Breakdown</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.dimension1}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" tick={false} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" fill={colors[2]} name="Accounts Payable" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Dimension 2 Breakdown */}
            <div>
              <h3 className="text-xl font-semibold mb-4">Dimension 2 Breakdown</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.dimension2}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" tick={false} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" fill={colors[3]} name="Accounts Payable" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FairnessDataAnalytics;
