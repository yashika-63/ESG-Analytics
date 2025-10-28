import React, { useState, useCallback, useMemo } from 'react';
import { Upload, FileSpreadsheet, Home, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';

const fieldMapping: Record<string,string> = {
  'Sr.No.': 'srNo',
  'Asset Compliance Id': 'assetComplianceId',
  'Remark Serial No': 'remarkSerialNo',
  'Attribute': 'attribute',
  'Objective Code': 'objectiveCode',
  'Financial Year': 'financialYear',
  'Month': 'month',
  'Dim1': 'dim1',
  'Dim2': 'dim2',
  'Dim3': 'dim3',
  'Actual Date': 'actualDate',
  'Due Date': 'dueDate',
  'Rural': 'rural',
  'Semi Urban': 'semiUrban',
  'Urban': 'urban',
  'Metropolitan': 'metropolitan',
  'MSMEPurchase': 'msmePurchase',
  'Directlyfrom India': 'directlyFromIndia',
  'Doc Status': 'docStatus',
  'Pending With': 'pendingWith'
};

const numericFields = ['rural','semiUrban','urban','metropolitan','msmePurchase','directlyFromIndia'];
const colors = ['#10B981','#3B82F6','#F59E0B','#EF4444','#8B5F6','#06B4D6'];

const parseNumeric = (val:any) => {
  if(val==null||val==='') return 0;
  if(typeof val==='number') return val;
  const parsed = parseFloat(String(val).replace(/[,₹$€£]/g,'').trim());
  return isNaN(parsed)?0:parsed;
};

const InclusionAnalytics:React.FC = () => {
  const [data,setData] = useState<any[]>([]);
  const [uploadStatus,setUploadStatus] = useState<'idle'|'success'|'error'>('idle');
  const [isLoading,setIsLoading] = useState(false);

  const handleUpload = useCallback((event:React.ChangeEvent<HTMLInputElement>)=>{
    const file = event.target.files?.[0];
    if(!file) return;

    setIsLoading(true);
    setUploadStatus('idle');

    const reader = new FileReader();
    reader.onload = (e)=>{
      try{
        const dataRaw = e.target?.result;
        if(!dataRaw) throw new Error('Empty file content');

        const workbook = XLSX.read(dataRaw,{type:'binary'});
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet,{header:1});

        const headerRow = rawRows[4];
        const dataRows = rawRows.slice(5);

        const colIndexMap: Record<string,number> = {};
        headerRow.forEach((h:string,idx:number)=>{
          if(fieldMapping[h]) colIndexMap[fieldMapping[h]]=idx;
        });

        const parsed = dataRows
          .filter(r=>Array.isArray(r)&&r.some(c=>c!=null&&c!==''))
          .map(row=>{
            const obj: Record<string,any> = {};
            for(const [key,idx] of Object.entries(colIndexMap)){
              obj[key] = numericFields.includes(key)? parseNumeric(row[idx]) : row[idx]!=null?String(row[idx]).trim():'';
            }
            obj.monthYear = obj.month + ' ' + obj.financialYear;
            return obj;
          });

        if(!parsed.length) throw new Error('No data found');
        setData(parsed);
        setUploadStatus('success');
      }catch(err){
        console.error(err);
        setUploadStatus('error');
      }finally{
        setIsLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  },[]);

  const analytics = useMemo(()=>{
    if(!data.length) return { overviewTotals:null, monthlyTrends:[], dimensionBreakdown:[] };

    const overviewTotals = numericFields.reduce((acc,f)=>{
      acc[f] = data.reduce((sum,d)=>sum+(d[f]||0),0);
      return acc;
    }, {} as Record<string,number>);

    const monthlyMap = new Map<string,any>();
    data.forEach(d=>{
      if(!monthlyMap.has(d.monthYear)) monthlyMap.set(d.monthYear,{monthYear:d.monthYear, ...numericFields.reduce((a,f)=>({...a,[f]:0}),{})});
      const m = monthlyMap.get(d.monthYear);
      numericFields.forEach(f=>m[f]+=d[f]||0);
    });
    const monthlyTrends = Array.from(monthlyMap.values());

    const dimensionBreakdown = ['dim1','dim2','dim3'].map(dim=>{
      const map = new Map<string,number>();
      data.forEach(d=>{
        const key = d[dim]||'Unknown';
        const val = numericFields.reduce((acc,f)=>acc+(d[f]||0),0);
        map.set(key,(map.get(key)||0)+val);
      });
      return { dimension: dim, data: Array.from(map.entries()).map(([category,value])=>({category,value})) };
    });

    return { overviewTotals, monthlyTrends, dimensionBreakdown };
  },[data]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">ESG Inclusion Analytics</h1>

        <div className="bg-white p-6 rounded shadow mb-6">
          <div className="flex items-center gap-2 mb-4">
            <FileSpreadsheet className="w-6 h-6 text-indigo-600"/>
            <h2 className="text-xl font-semibold">Import Excel</h2>
          </div>
          <div className="border-2 border-dashed border-gray-300 p-8 text-center rounded-lg">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4"/>
            <label className="cursor-pointer text-indigo-600 font-medium">
              Choose File
              <input type="file" accept=".xlsx,.xls" onChange={handleUpload} className="hidden"/>
            </label>
          </div>
          {isLoading && <div className="mt-4 flex items-center gap-2 text-indigo-600"><Clock className="w-5 h-5 animate-spin"/> Processing...</div>}
          {uploadStatus==='success' && <div className="mt-4 flex items-center gap-2 text-green-600"><CheckCircle className="w-5 h-5"/> Loaded {data.length} records</div>}
          {uploadStatus==='error' && <div className="mt-4 flex items-center gap-2 text-red-600"><AlertTriangle className="w-5 h-5"/> Failed to load file</div>}
        </div>

        {data.length>0 && analytics.overviewTotals && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
              {numericFields.map((f,i)=>(
                <div key={f} className="bg-white p-5 rounded border shadow flex gap-3 items-center">
                  <Home className="w-8 h-8 text-indigo-600"/>
                  <div>
                    <div className="text-sm">{f.replace(/([A-Z])/g,' $1').trim()}</div>
                    <div className="text-2xl font-bold">{analytics.overviewTotals[f].toLocaleString(undefined,{maximumFractionDigits:2})}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Monthly Participation Trends</h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={analytics.monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3"/>
                  <XAxis dataKey="monthYear" tick={false}/>
                  <YAxis/>
                  <Tooltip/>
                  <Legend/>
                  {numericFields.map((f,i)=><Bar key={f} dataKey={f} fill={colors[i%colors.length]} name={f.replace(/([A-Z])/g,' $1').trim()}/>)}
                </BarChart>
              </ResponsiveContainer>
            </div>

            {analytics.dimensionBreakdown.map(({dimension,data},i)=>(
              <div key={dimension} className="mb-8">
                <h3 className="text-xl font-semibold mb-4">Participation by {dimension.toUpperCase()}</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3"/>
                    <XAxis dataKey="category" tick={false}/>
                    <YAxis/>
                    <Tooltip/>
                    <Legend/>
                    <Bar dataKey="value" fill={colors[i%colors.length]} name="Participation"/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default InclusionAnalytics;
