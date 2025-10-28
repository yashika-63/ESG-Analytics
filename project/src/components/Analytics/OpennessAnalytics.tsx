import React, { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Upload } from 'lucide-react';

// Field mapping
const fieldMapping: Record<string, string> = {
  "Sr.No.": "srNo",
  "Sr No": "srNoAlt",
  "Objective Code": "objectiveCode",
  "Financial Year": "financialYear",
  "Month": "month",
  "Dim1": "dim1",
  "Dim2": "dim2",
  "Attribute": "attribute",
  "Emission Source": "emissionSource",
  "Start Date": "startDate",
  "End Date": "endDate",
  "No of Trading Houses": "noTradingHouses",
  "% of Total Purchases": "percentTotalPurchases",
  "Top 10 % to TH": "top10PercentTH",
  "No of Dealers": "noDealers",
  "% of Total Salers": "percentTotalSalers",
  "Top 10 % to TH Sales": "top10PercentTHSales",
  "RPT Purchases": "rptPurchases",
  "RPT Sales": "rptSales",
  "RPT L & A": "rptLA",
  "RPT Investments": "rptInvestments",
  "Actual Compliance Ind": "actualCompliance"
};

const numericFields = [
  "noTradingHouses", "percentTotalPurchases", "top10PercentTH", "noDealers",
  "percentTotalSalers", "top10PercentTHSales", "rptPurchases", "rptSales",
  "rptLA", "rptInvestments"
];

const parseNumeric = (val: any) => {
  if (val == null || val === '') return 0;
  if (typeof val === 'number') return val;
  const parsed = parseFloat(String(val).replace(/[,₹$%]/g, '').trim());
  return isNaN(parsed) ? 0 : parsed;
};

const OpennessAnalytics: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [uploadStatus, setUploadStatus] = useState<'idle'|'success'|'error'>('idle');
  const [isLoading, setIsLoading] = useState(false);

  const handleUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    setUploadStatus('idle');

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const dataRaw = e.target?.result;
        if (!dataRaw) throw new Error('Empty file content');

        const workbook = XLSX.read(dataRaw, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Header row at index 4
        const headerRow = rawRows[4];
        const dataRows = rawRows.slice(5);

        // Map columns
        const colIndexMap: Record<string, number> = {};
        headerRow.forEach((h: string, idx: number) => {
          if (fieldMapping[h]) colIndexMap[fieldMapping[h]] = idx;
        });

        const parsed = dataRows
          .filter(r => Array.isArray(r) && r.some(c => c != null && c !== ''))
          .map(row => {
            const rowObj: Record<string, any> = {};
            for (const [key, idx] of Object.entries(colIndexMap)) {
              rowObj[key] = numericFields.includes(key) ? parseNumeric(row[idx]) : row[idx] != null ? String(row[idx]).trim() : '';
            }
            rowObj.monthYear = rowObj.month + ' ' + rowObj.financialYear;
            return rowObj;
          });

        if (!parsed.length) throw new Error('No data found');
        setData(parsed);
        setUploadStatus('success');
      } catch (err) {
        console.error(err);
        setUploadStatus('error');
      } finally {
        setIsLoading(false);
      }
    };

    reader.readAsBinaryString(file);
  }, []);

  // KPI Aggregates
  const totalPurchases = data.reduce((acc, d) => acc + d.rptPurchases, 0);
  const totalSales = data.reduce((acc, d) => acc + d.rptSales, 0);
  const totalLA = data.reduce((acc, d) => acc + d.rptLA, 0);
  const totalInvestments = data.reduce((acc, d) => acc + d.rptInvestments, 0);
  const complianceRate = data.length ? (data.filter(d => d.actualCompliance === 'Y').length / data.length) * 100 : 0;

  // Monthly trends
  const monthlyMap = new Map<string, any>();
  data.forEach(d => {
    if (!monthlyMap.has(d.monthYear)) {
      monthlyMap.set(d.monthYear, { monthYear: d.monthYear, rptPurchases: 0, rptSales: 0 });
    }
    const m = monthlyMap.get(d.monthYear);
    m.rptPurchases += d.rptPurchases;
    m.rptSales += d.rptSales;
  });
  const monthlyTrends = Array.from(monthlyMap.values());

  // Add MoM Growth %
  monthlyTrends.forEach((d, i) => {
    if (i === 0) {
      d.momPurchases = 0;
      d.momSales = 0;
    } else {
      const prev = monthlyTrends[i - 1];
      d.momPurchases = prev.rptPurchases ? ((d.rptPurchases - prev.rptPurchases) / prev.rptPurchases) * 100 : 0;
      d.momSales = prev.rptSales ? ((d.rptSales - prev.rptSales) / prev.rptSales) * 100 : 0;
    }
  });

  // Dim1 Breakdown
  const dim1Map = new Map<string, number>();
  data.forEach(d => {
    const val = parseNumeric(d.rptPurchases);
    if (!dim1Map.has(d.dim1)) dim1Map.set(d.dim1, 0);
    dim1Map.set(d.dim1, dim1Map.get(d.dim1)! + val);
  });
  const dim1Breakdown = Array.from(dim1Map.entries())
    .map(([category, value]) => ({ category, value }))
    .sort((a,b)=>b.value-a.value)
    .slice(0,20);

  // Dim2 Breakdown
  const dim2Map = new Map<string, number>();
  data.forEach(d => {
    const val = parseNumeric(d.rptSales);
    if (!dim2Map.has(d.dim2)) dim2Map.set(d.dim2, 0);
    dim2Map.set(d.dim2, dim2Map.get(d.dim2)! + val);
  });
  const dim2Breakdown = Array.from(dim2Map.entries())
    .map(([category, value]) => ({ category, value }))
    .sort((a,b)=>b.value-a.value)
    .slice(0,20);

  return (
    <div className="p-4 space-y-8">
      {/* Upload Component */}
      <div className="flex items-center gap-4 border-dashed border-2 border-gray-300 p-4 rounded cursor-pointer hover:bg-gray-50">
        <Upload className="text-gray-500" />
        <label className="cursor-pointer">
          <span className="text-gray-700">Click or drag file to upload</span>
          <input type="file" accept=".xlsx,.xls" onChange={handleUpload} className="hidden" />
        </label>
        {isLoading && <span>Uploading...</span>}
        {uploadStatus === 'success' && <span className="text-green-600">Upload successful!</span>}
        {uploadStatus === 'error' && <span className="text-red-600">Upload failed.</span>}
      </div>

      {data.length > 0 && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="p-4 shadow rounded bg-white">Total Purchases: {totalPurchases}</div>
            <div className="p-4 shadow rounded bg-white">Total Sales: {totalSales}</div>
            <div className="p-4 shadow rounded bg-white">Total LA: {totalLA}</div>
            <div className="p-4 shadow rounded bg-white">Total Investments: {totalInvestments}</div>
            <div className="p-4 shadow rounded bg-white">Compliance Rate: {complianceRate.toFixed(2)}%</div>
          </div>

          {/* Monthly Growth % Table */}
          <div className="mt-6 overflow-x-auto">
            <table className="w-full border border-gray-300 text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border p-2">Month</th>
                  <th className="border p-2">Purchases</th>
                  <th className="border p-2">Sales</th>
                  <th className="border p-2">MoM Purchases %</th>
                  <th className="border p-2">MoM Sales %</th>
                </tr>
              </thead>
              <tbody>
                {monthlyTrends.map((row, i) => (
                  <tr key={i} className="odd:bg-gray-50">
                    <td className="border p-2">{row.monthYear}</td>
                    <td className="border p-2">{row.rptPurchases}</td>
                    <td className="border p-2">{row.rptSales}</td>
                    <td className="border p-2">{row.momPurchases.toFixed(1)}%</td>
                    <td className="border p-2">{row.momSales.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Monthly Trends Chart */}
          <div className="h-72 mt-8">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="monthYear" tick={false} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="rptPurchases" stroke="#8884d8" />
                <Line type="monotone" dataKey="rptSales" stroke="#82ca9d" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Dim1 Breakdown */}
          <div className="h-72 mt-8">
            <h3 className="font-semibold mb-2">Top Dim1 (Purchases)</h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dim1Breakdown}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" tick={false} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Dim2 Breakdown */}
          <div className="h-72 mt-8">
            <h3 className="font-semibold mb-2">Top Dim2 (Sales)</h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dim2Breakdown}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" tick={false} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
};

export default OpennessAnalytics;
