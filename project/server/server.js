import express from 'express';
import cors from 'cors';
import sql from 'mssql';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from parent directory
dotenv.config({ path: join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Database configuration
const dbConfig = {
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    server: process.env.DB_SERVER || '',
    database: process.env.DB_DATABASE || '',
    port: Number(process.env.DB_PORT) || 1433,
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

// Database connection pool
let pool;

async function initializeDB() {
    try {
        pool = await sql.connect(dbConfig);
        console.log('✅ Connected to SQL Server database');
    } catch (err) {
        console.error('❌ Database connection failed:', err);
        process.exit(1);
    }
}

// Helper function to build WHERE clause
function buildWhereClause(filters) {
    let whereClause = 'WHERE 1=1';
    
    if (filters) {
        if (filters.year && filters.year !== 'All') {
            whereClause += ` AND [FinancialYear] = '${filters.year}'`;
        }
        if (filters.month && filters.month !== 'All') {
            whereClause += ` AND [Month1] = '${filters.month}'`;
        }
        if (filters.businessCode && filters.businessCode !== 'All') {
            whereClause += ` AND [Dim1] = '${filters.businessCode}'`;
        }
        if (filters.plant && filters.plant !== 'All') {
            whereClause += ` AND [Dim2] = '${filters.plant}'`;
        }
        if (filters.department && filters.department !== 'All') {
            whereClause += ` AND [Dim3] = '${filters.department}'`;
        }
    }
    
    return whereClause;
}

// Helper function to parse numeric values
function parseNumeric(val) {
    if (val == null || val === '') return 0;
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
        const cleaned = val.replace(/[,₹$€£¥]/g, '').trim();
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
}

// API Routes

// AttributeDetail endpoint
app.get('/api/attribute-details', async (req, res) => {
    try {
        const filters = req.query;
        const whereClause = buildWhereClause(filters);
        
        const query = `
            SELECT 
                ROW_NUMBER() OVER (ORDER BY [AttributeId]) as srNo,
                [AttributeId] as attributeId,
                [SRNo] as srNoAlt,
                [ObjectiveCode] as objectiveCode,
                [FinancialYear] as financialYear,
                [Month1] as month,
                [Dim1] as businessCode,
                [Dim2] as plant,
                [Dim3] as department,
                [Attribute] as attribute,
                [Parameter] as parameter,
                [SubCategory] as subCategory,
                [Type] as type,
                [Quantity] as quantity,
                [ConvFactor] as convFactor,
                [Value] as value,
                [ConvStandards] as cfStd
            FROM [dbo].[AttributeDetail]
            ${whereClause}
            ORDER BY [AttributeId]
        `;
        
        const result = await pool.request().query(query);
        const processedData = result.recordset.map(row => ({
            ...row,
            quantity: parseNumeric(row.quantity),
            convFactor: parseNumeric(row.convFactor),
            value: parseNumeric(row.value),
            cfStd: parseNumeric(row.cfStd)
        }));
        
        res.json(processedData);
    } catch (error) {
        console.error('AttributeDetail API error:', error);
        res.status(500).json({ error: 'Failed to fetch attribute details data' });
    }
});

// ESG data modules mapping to AttributeDetail table with specific attribute filters
const ESG_MODULES = {
    'water': {
        attributeFilter: "2.Water(KL)",
        query: `
            SELECT 
                ROW_NUMBER() OVER (ORDER BY [AttributeId]) as srNo,
                [AttributeId] as attributeId,
                [FinancialYear] as financialYear,
                [Month1] as month,
                [Dim1] as businessCode,
                [Dim2] as plant,
                [Dim3] as department,
                [Attribute] as attribute,
                [Parameter] as parameter,
                [SubCategory] as subCategory,
                [Type] as type,
                [Quantity] as quantity,
                [ConvFactor] as convFactor,
                [Value] as value,
                [ConvStandards] as cfStd
            FROM [dbo].[AttributeDetail]
            WHERE [Attribute] = '2.Water(KL)'
        `
    },
    'waste': {
        attributeFilter: "4.Waste(MT)",
        query: `
            SELECT 
                ROW_NUMBER() OVER (ORDER BY [AttributeId]) as srNo,
                [AttributeId] as attributeId,
                [FinancialYear] as financialYear,
                [Month1] as month,
                [Dim1] as businessCode,
                [Dim2] as plant,
                [Dim3] as department,
                [Attribute] as attribute,
                [Parameter] as parameter,
                [SubCategory] as subCategory,
                [Type] as type,
                [Quantity] as quantity,
                [ConvFactor] as convFactor,
                [Value] as value,
                [ConvStandards] as cfStd
            FROM [dbo].[AttributeDetail]
            WHERE [Attribute] = '4.Waste(MT)'
        `
    },
    'energy': {
        attributeFilter: "3.Energy(GJ)",
        query: `
            SELECT 
                ROW_NUMBER() OVER (ORDER BY [AttributeId]) as srNo,
                [AttributeId] as attributeId,
                [FinancialYear] as financialYear,
                [Month1] as month,
                [Dim1] as businessCode,
                [Dim2] as plant,
                [Dim3] as department,
                [Attribute] as attribute,
                [Parameter] as parameter,
                [SubCategory] as subCategory,
                [Type] as type,
                [Quantity] as quantity,
                [ConvFactor] as convFactor,
                [Value] as value,
                [ConvStandards] as cfStd
            FROM [dbo].[AttributeDetail]
            WHERE [Attribute] = '3.Energy(GJ)'
        `
    },
    'ghg': {
        attributeFilter: "1.GHG(tCO2e)",
        query: `
            SELECT 
                ROW_NUMBER() OVER (ORDER BY [AttributeId]) as srNo,
                [AttributeId] as attributeId,
                [FinancialYear] as financialYear,
                [Month1] as month,
                [Dim1] as businessCode,
                [Dim2] as plant,
                [Dim3] as department,
                [Attribute] as attribute,
                [Parameter] as parameter,
                [SubCategory] as subCategory,
                [Type] as type,
                [Quantity] as quantity,
                [ConvFactor] as convFactor,
                [Value] as value,
                [ConvStandards] as cfStd
            FROM [dbo].[AttributeDetail]
            WHERE [Attribute] = '1.GHG(tCO2e)'
        `
    },
    'non-ghg': {
        attributeFilter: "1.Non GHG",
        query: `
            SELECT 
                ROW_NUMBER() OVER (ORDER BY [AttributeId]) as srNo,
                [AttributeId] as attributeId,
                [FinancialYear] as financialYear,
                [Month1] as month,
                [Dim1] as businessCode,
                [Dim2] as plant,
                [Dim3] as department,
                [Attribute] as attribute,
                [Parameter] as parameter,
                [SubCategory] as subCategory,
                [Type] as type,
                [Quantity] as quantity,
                [ConvFactor] as convFactor,
                [Value] as value,
                [ConvStandards] as cfStd
            FROM [dbo].[AttributeDetail]
            WHERE [Attribute] = '1.Non GHG'
        `
    },
    'openness': {
        attributeFilter: "7.Openness(%)",
        query: `
            SELECT 
                ROW_NUMBER() OVER (ORDER BY [AttributeId]) as srNo,
                [AttributeId] as attributeId,
                [FinancialYear] as financialYear,
                [Month1] as month,
                [Dim1] as businessCode,
                [Dim2] as plant,
                [Dim3] as department,
                [Attribute] as attribute,
                [Parameter] as parameter,
                [SubCategory] as subCategory,
                [Type] as type,
                [Quantity] as quantity,
                [ConvFactor] as convFactor,
                [Value] as value,
                [ConvStandards] as cfStd
            FROM [dbo].[AttributeDetail]
            WHERE [Attribute] = '7.Openness(%)'
        `
    },
    'fossil-fuel': {
        subCategoryFilter: "Fossil Fuel",
        query: `
            SELECT 
                ROW_NUMBER() OVER (ORDER BY [AttributeId]) as srNo,
                [AttributeId] as attributeId,
                [FinancialYear] as financialYear,
                [Month1] as month,
                [Dim1] as businessCode,
                [Dim2] as plant,
                [Dim3] as department,
                [Attribute] as attribute,
                [Parameter] as parameter,
                [SubCategory] as subCategory,
                [Type] as type,
                [Quantity] as quantity,
                [ConvFactor] as convFactor,
                [Value] as value,
                [ConvStandards] as cfStd
            FROM [dbo].[AttributeDetail]
            WHERE [SubCategory] LIKE '%Fossil Fuel%'
        `
    },
    'fugitive': {
        subCategoryFilter: "Fugitive leakage",
        query: `
            SELECT 
                ROW_NUMBER() OVER (ORDER BY [AttributeId]) as srNo,
                [AttributeId] as attributeId,
                [FinancialYear] as financialYear,
                [Month1] as month,
                [Dim1] as businessCode,
                [Dim2] as plant,
                [Dim3] as department,
                [Attribute] as attribute,
                [Parameter] as parameter,
                [SubCategory] as subCategory,
                [Type] as type,
                [Quantity] as quantity,
                [ConvFactor] as convFactor,
                [Value] as value,
                [ConvStandards] as cfStd
            FROM [dbo].[AttributeDetail]
            WHERE [SubCategory] LIKE '%Fugitive leakage%'
        `
    },
    'electricity': {
        subCategoryFilter: "Electricity",
        query: `
            SELECT 
                ROW_NUMBER() OVER (ORDER BY [AttributeId]) as srNo,
                [AttributeId] as attributeId,
                [FinancialYear] as financialYear,
                [Month1] as month,
                [Dim1] as businessCode,
                [Dim2] as plant,
                [Dim3] as department,
                [Attribute] as attribute,
                [Parameter] as parameter,
                [SubCategory] as subCategory,
                [Type] as type,
                [Quantity] as quantity,
                [ConvFactor] as convFactor,
                [Value] as value,
                [ConvStandards] as cfStd
            FROM [dbo].[AttributeDetail]
            WHERE [SubCategory] LIKE '%Electricity%'
        `
    }
};

// Create endpoints for each ESG module
Object.keys(ESG_MODULES).forEach(module => {
    app.get(`/api/${module}`, async (req, res) => {
        try {
            const filters = req.query;
            const whereClause = buildWhereClause(filters);
            const moduleConfig = ESG_MODULES[module];
            
            // Add additional WHERE clause from the module config  
            const additionalWhere = whereClause === 'WHERE 1=1' ? 
                whereClause.replace('WHERE 1=1', 'WHERE 1=1') :
                whereClause;
            
            const query = moduleConfig.query + ` AND 1=1 ${additionalWhere.replace('WHERE 1=1', '')} ORDER BY [AttributeId]`;
            
            const result = await pool.request().query(query);
            
            // Process numeric fields
            const processedData = result.recordset.map(row => ({
                ...row,
                quantity: parseNumeric(row.quantity),
                convFactor: parseNumeric(row.convFactor),
                value: parseNumeric(row.value),
                cfStd: parseNumeric(row.cfStd)
            }));
            
            res.json(processedData);
        } catch (error) {
            console.error(`${module} API error:`, error);
            // Return empty array if query fails
            res.json([]);
        }
    });
});

// Generic endpoint for any ESG data type (fallback)
app.get('/api/esg-data/:dataType', async (req, res) => {
    try {
        const { dataType } = req.params;
        const filters = req.query;
        const whereClause = buildWhereClause(filters);
        
        // Try to find data in AttributeDetail table filtered by attribute type
        const query = `
            SELECT 
                ROW_NUMBER() OVER (ORDER BY [AttributeId]) as srNo,
                [AttributeId] as attributeId,
                [FinancialYear] as financialYear,
                [Month1] as month,
                [Dim1] as businessCode,
                [Dim2] as plant,
                [Dim3] as department,
                [Attribute] as attribute,
                [Parameter] as parameter,
                [SubCategory] as subCategory,
                [Type] as type,
                [Quantity] as quantity,
                [ConvFactor] as convFactor,
                [Value] as value,
                [ConvStandards] as cfStd
            FROM [dbo].[AttributeDetail]
            ${whereClause}
            AND ([Attribute] LIKE '%${dataType}%' OR [Parameter] LIKE '%${dataType}%' OR [SubCategory] LIKE '%${dataType}%')
            ORDER BY [AttributeId]
        `;
        
        const result = await pool.request().query(query);
        res.json(result.recordset);
    } catch (error) {
        console.error(`ESG data API error for ${req.params.dataType}:`, error);
        res.json([]);
    }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        await pool.request().query('SELECT 1 as status');
        res.json({ status: 'healthy', database: 'connected' });
    } catch (error) {
        res.status(500).json({ status: 'unhealthy', database: 'disconnected', error: error.message });
    }
});

// Start server
async function startServer() {
    await initializeDB();
    app.listen(PORT, () => {
        console.log(`🚀 ESG Analytics API Server running on http://localhost:${PORT}`);
        console.log(`📊 Available endpoints:`);
        console.log(`   GET /api/health - Health check`);
        console.log(`   GET /api/attribute-details - Attribute details data`);
        Object.keys(ESG_MODULES).forEach(module => {
            console.log(`   GET /api/${module} - ${module} data`);
        });
        console.log(`   GET /api/esg-data/:dataType - Generic ESG data`);
    });
}

startServer().catch(console.error);