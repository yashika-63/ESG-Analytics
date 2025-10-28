import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  Droplets, 
  Trash2, 
  Zap, 
  Fuel, 
  Battery, 
  Users, 
  Heart, 
  Scale, 
  Eye, 
  Wind,
  Building2,
  Download,
  Menu,
  X
} from 'lucide-react';

// Import all analytics modules
import AttributeDetailsAnalytics from '../Analytics/AttributeDetailsAnalytics';
import ElectricityDataAnalytics from '../Analytics/ElectricityDataAnalytics';
import WaterAnalytics from '../Analytics/WaterAnalytics';
import WasteAnalytics from '../Analytics/WasteAnalytics';
import EnergyAnalytics from '../Analytics/EnergyAnalytics';
import FossilFuelAnalytics from '../Analytics/FossilFuelAnalytics';
import FugitiveAnalytics from '../Analytics/FugitiveAnalytics';
import Scope3Analytics from '../Analytics/Scope3Analytics';
import DiversityAnalytics from '../Analytics/DiversityAnalytics';
import InclusionAnalytics from '../Analytics/InclusionAnalytics';
import FairnessAnalytics from '../Analytics/FairnessAnalytics';
import OpennessAnalytics from '../Analytics/OpennessAnalytics';
import PristineLogo from '../../../images/pristine-small-logo.png';

const ESGDashboard = () => {
  const [activeModule, setActiveModule] = useState('attribute');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [filters, setFilters] = useState({
    year: 'All',
    month: 'All',
    businessCode: 'All',
    plant: 'All',
    department: 'All'
  });

  const modules = [
    { id: 'attribute', name: 'Attribute Details', icon: Building2, component: AttributeDetailsAnalytics },
    { id: 'electricity', name: 'Electricity Data', icon: Zap, component: ElectricityDataAnalytics },
    { id: 'water', name: 'Water', icon: Droplets, component: WaterAnalytics },
    { id: 'waste', name: 'Waste', icon: Trash2, component: WasteAnalytics },
    { id: 'energy', name: 'Energy', icon: Battery, component: EnergyAnalytics },
    { id: 'fossilfuel', name: 'Fossil Fuel', icon: Fuel, component: FossilFuelAnalytics },
    { id: 'fugitive', name: 'Fugitive', icon: Wind, component: FugitiveAnalytics },
    { id: 'scope3', name: 'Scope 3', icon: Building2, component: Scope3Analytics },
    { id: 'diversity', name: 'Diversity', icon: Users, component: DiversityAnalytics },
    { id: 'inclusion', name: 'Inclusion', icon: Heart, component: InclusionAnalytics },
    { id: 'fairness', name: 'Fairness', icon: Scale, component: FairnessAnalytics },
    { id: 'openness', name: 'Openness', icon: Eye, component: OpennessAnalytics },
  ];

  const currentModule = useMemo(() => modules.find(m => m.id === activeModule), [activeModule]);

  const handleExport = () => {
    // Export functionality would be implemented based on the active module
    console.log(`Exporting ${currentModule?.name} data`);
  };

  const updateFilter = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={cn(
        "bg-white border-r border-gray-200 flex flex-col transition-all duration-300",
        sidebarOpen ? "w-64" : "w-16"
      )}>
        {/* Logo & Company */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <img src={PristineLogo} alt="Pristine IT Code logo" className="w-8 h-8 rounded-lg object-contain" />
            {sidebarOpen && (
              <div>
                <h1 className="font-bold text-lg text-gray-900">Pristine IT Code</h1>
                <p className="text-xs text-gray-500">ESG Analytics Platform</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {modules.map((module) => {
            const IconComponent = module.icon;
            const isActive = activeModule === module.id;
            
            return (
              <button
                key={module.id}
                onClick={() => setActiveModule(module.id)}
                className={"group relative w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all bg-green-100 text-green-700 border border-green-200"}
              >
                <span
                  className={cn(
                    "absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r",
                    isActive ? "bg-green-600" : "bg-transparent group-hover:bg-green-300"
                  )}
                />
                <IconComponent className={cn("w-5 h-5 mr-3 flex-shrink-0 transition-colors",
                  isActive ? "text-green-700" : "text-gray-500 group-hover:text-green-600"
                )} />
                {sidebarOpen && <span className="truncate">{module.name}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-3 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden"
              >
                {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </Button>
              <h1 className="text-2xl font-bold text-gray-900">ESG Analytics Dashboard</h1>
              <Separator orientation="vertical" className="h-6" />
              <span className="text-sm text-gray-500">{currentModule?.name}</span>
            </div>
            
            <div className="flex items-center space-x-3">
              <Select value={filters.year} onValueChange={(value) => updateFilter('year', value)}>
                <SelectTrigger className="w-24">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All</SelectItem>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2023">2023</SelectItem>
                  <SelectItem value="2022">2022</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.month} onValueChange={(value) => updateFilter('month', value)}>
                <SelectTrigger className="w-28">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All</SelectItem>
                  <SelectItem value="January">January</SelectItem>
                  <SelectItem value="February">February</SelectItem>
                  <SelectItem value="March">March</SelectItem>
                  <SelectItem value="April">April</SelectItem>
                  <SelectItem value="May">May</SelectItem>
                  <SelectItem value="June">June</SelectItem>
                  <SelectItem value="July">July</SelectItem>
                  <SelectItem value="August">August</SelectItem>
                  <SelectItem value="September">September</SelectItem>
                  <SelectItem value="October">October</SelectItem>
                  <SelectItem value="November">November</SelectItem>
                  <SelectItem value="December">December</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.businessCode} onValueChange={(value) => updateFilter('businessCode', value)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Business" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Codes</SelectItem>
                  <SelectItem value="BC001">BC001</SelectItem>
                  <SelectItem value="BC002">BC002</SelectItem>
                  <SelectItem value="BC003">BC003</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.plant} onValueChange={(value) => updateFilter('plant', value)}>
                <SelectTrigger className="w-24">
                  <SelectValue placeholder="Plant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All</SelectItem>
                  <SelectItem value="Plant A">Plant A</SelectItem>
                  <SelectItem value="Plant B">Plant B</SelectItem>
                  <SelectItem value="Plant C">Plant C</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.department} onValueChange={(value) => updateFilter('department', value)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Depts</SelectItem>
                  <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                  <SelectItem value="Operations">Operations</SelectItem>
                  <SelectItem value="Quality">Quality</SelectItem>
                </SelectContent>
              </Select>

              <Button onClick={handleExport} className="bg-green-600 hover:bg-green-700 transition-colors">
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto">
          {currentModule && <currentModule.component filters={filters} />}
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 px-4 lg:px-6 py-3">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <p>© Pristine IT Code — ESG Analytics Platform</p>
            <p>Last updated: {new Date().toLocaleString()}</p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default ESGDashboard;