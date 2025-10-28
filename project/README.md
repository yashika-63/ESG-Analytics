# ESG Analytics Platform

A comprehensive ESG (Environmental, Social, Governance) analytics platform with real-time database connectivity and interactive dashboards.

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- Access to MS SQL Server database

### Installation & Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Configuration**
   The `.env` file is already configured with your database credentials:
   ```
   DB_USER=quickbpm
   DB_PASSWORD=Seil@123
   DB_SERVER=WIN-CSHQSGVNLP9\MSSQLSERVER05
   DB_DATABASE=ESG_EHS_PPFL_Live
   DB_PORT=1433
   ```

3. **Start the System**
   
   **Option 1: Start Both Frontend and Backend (Recommended)**
   ```bash
   npm run dev:full
   ```
   This starts both the backend API server (port 3001) and frontend (port 5173).

   **Option 2: Start Individually**
   ```bash
   # Terminal 1: Start Backend API Server
   npm run server
   
   # Terminal 2: Start Frontend Development Server
   npm run dev
   ```

4. **Access the Application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001

## 🏗️ System Architecture

### Backend API Server (`server/server.js`)
- **Express.js** server handling database connections
- **MS SQL Server** connectivity via `mssql` package
- RESTful API endpoints for all ESG data modules
- Automatic data filtering and processing

### Frontend React Application
- **React + TypeScript** with Vite
- **Recharts** for data visualizations
- **Tailwind CSS** + Radix UI components
- Real-time data fetching from backend API

## 📊 Available ESG Modules

The platform includes comprehensive analytics for:

### Environmental Modules
- **Attribute Details** - Core ESG attribute analysis
- **Electricity Data** - Power consumption and emissions
- **Water Analytics** - Water usage and conservation
- **Waste Management** - Waste generation and disposal
- **Energy Analytics** - Energy consumption and efficiency
- **Fossil Fuel** - Fuel usage and carbon footprint
- **Fugitive Emissions** - Unintended emissions tracking
- **Scope 3 Emissions** - Indirect emissions analysis

### Social & Governance Modules
- **Diversity** - Workforce diversity metrics
- **Inclusion** - Inclusion and accessibility measures
- **Fairness** - Fair practices and equity
- **Openness** - Transparency and open practices

## 🔧 API Endpoints

### Core Endpoints
- `GET /api/health` - Health check and database status
- `GET /api/attribute-details` - Main attribute data
- `GET /api/{module-name}` - Specific module data (e.g., `/api/water`, `/api/waste`)
- `GET /api/esg-data/{dataType}` - Generic ESG data by type

### Query Parameters (Filters)
All endpoints support filtering:
- `year` - Filter by financial year
- `month` - Filter by month
- `businessCode` - Filter by business code
- `plant` - Filter by plant location
- `department` - Filter by department

Example: `/api/attribute-details?year=2024&plant=PPH`

## 💾 Database Schema

The system connects to your `ESG_EHS_PPFL_Live` database and primarily uses the `AttributeDetail` table:

### Main Table: `AttributeDetail`
- **AttributeId** - Primary identifier
- **FinancialYear** - Financial year
- **Month1** - Month
- **Dim1** - Business Code
- **Dim2** - Plant
- **Dim3** - Department
- **Attribute** - ESG attribute type
- **Parameter** - Specific parameter
- **SubCategory** - Sub-categorization
- **Type** - Data type
- **Quantity** - Numeric quantity
- **ConvFactor** - Conversion factor
- **Value** - Calculated value

## 🎨 Features

### Real-time Data
- Automatic data loading from database
- Filter-based data updates
- Refresh functionality for live data

### Interactive Analytics
- Multiple chart types (Bar, Line, Pie, Area)
- Tabbed interface for different views
- Drill-down capabilities
- Export functionality

### Filter System
- Dynamic filtering across all modules
- Year, month, location, and department filters
- Real-time filter application

### Responsive Design
- Mobile-friendly interface
- Collapsible sidebar navigation
- Optimized for different screen sizes

## 🔍 Troubleshooting

### Backend Issues
1. **Database Connection Failed**
   - Verify database server is running
   - Check network connectivity
   - Confirm credentials in `.env` file

2. **Port 3001 Already in Use**
   ```bash
   # Change PORT in server/server.js or kill existing process
   netstat -ano | findstr :3001
   taskkill /PID <process_id> /F
   ```

### Frontend Issues
1. **API Connection Errors**
   - Ensure backend server is running on port 3001
   - Check browser console for CORS errors

2. **Build Errors**
   ```bash
   # Clear cache and reinstall
   rm -rf node_modules package-lock.json
   npm install
   ```

## 🚦 Development

### Project Structure
```
├── server/
│   └── server.js          # Express API server
├── src/
│   ├── components/
│   │   ├── Analytics/     # All ESG analytics components
│   │   ├── Dashboard/     # Main dashboard
│   │   └── ui/           # Reusable UI components
│   └── services/
│       └── apiService.ts  # Frontend API communication
├── .env                   # Database configuration
└── package.json          # Dependencies and scripts
```

### Adding New Modules
1. Add endpoint in `server/server.js`
2. Create service function in `src/services/apiService.ts`
3. Create analytics component in `src/components/Analytics/`
4. Add to dashboard navigation

## 📈 Data Flow

1. **User Interaction** - User applies filters or navigates
2. **API Request** - Frontend calls backend API with parameters
3. **Database Query** - Backend queries MS SQL Server
4. **Data Processing** - Backend processes and formats data
5. **Response** - Formatted data returned to frontend
6. **Visualization** - Charts and tables update with new data

## 🎯 Key Improvements Over Previous Version

1. **Browser Compatibility** - Removed client-side database connections
2. **Performance** - Dedicated backend API server
3. **Scalability** - Separation of concerns
4. **Security** - Database credentials secured on server
5. **Real-time Updates** - Live data fetching
6. **Comprehensive Modules** - All ESG categories covered

## 📞 Support

For issues or questions:
1. Check the browser console for errors
2. Verify backend server logs
3. Ensure database connectivity
4. Review API endpoint responses

---

**ESG Analytics Platform** - Powered by React, Express, and MS SQL Server