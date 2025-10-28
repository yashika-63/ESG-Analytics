export interface FilterOptions {
    year?: string;
    month?: string;
    businessCode?: string;
    plant?: string;
    department?: string;
}

// Base API URL - adjust if backend is on different port
const API_BASE_URL = 'http://localhost:3001/api';

// Generic API call function
async function apiCall<T>(endpoint: string, filters?: FilterOptions): Promise<T[]> {
    try {
        const url = new URL(`${API_BASE_URL}${endpoint}`);
        
        // Add filters as query parameters
        if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
                if (value && value !== 'All') {
                    url.searchParams.append(key, value);
                }
            });
        }
        
        const response = await fetch(url.toString());
        if (!response.ok) {
            throw new Error(`API call failed: ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error(`API call error for ${endpoint}:`, error);
        throw error;
    }
}

// Attribute Details Data Service
export const getAttributeDetailsData = async (filters?: FilterOptions): Promise<any[]> => {
    return apiCall('/attribute-details', filters);
};

// Electricity Data Service
export const getElectricityData = async (filters?: FilterOptions): Promise<any[]> => {
    return apiCall('/electricity', filters);
};

// Water Data Service
export const getWaterData = async (filters?: FilterOptions): Promise<any[]> => {
    return apiCall('/water', filters);
};

// Waste Data Service
export const getWasteData = async (filters?: FilterOptions): Promise<any[]> => {
    return apiCall('/waste', filters);
};

// Energy Data Service
export const getEnergyData = async (filters?: FilterOptions): Promise<any[]> => {
    return apiCall('/energy', filters);
};

// Fossil Fuel Data Service
export const getFossilFuelData = async (filters?: FilterOptions): Promise<any[]> => {
    return apiCall('/fossil-fuel', filters);
};

// Fugitive Data Service
export const getFugitiveData = async (filters?: FilterOptions): Promise<any[]> => {
    return apiCall('/fugitive', filters);
};

// Scope3 Data Service
export const getScope3Data = async (filters?: FilterOptions): Promise<any[]> => {
    return apiCall('/scope3', filters);
};

// Diversity Data Service
export const getDiversityData = async (filters?: FilterOptions): Promise<any[]> => {
    return apiCall('/diversity', filters);
};

// Inclusion Data Service
export const getInclusionData = async (filters?: FilterOptions): Promise<any[]> => {
    return apiCall('/inclusion', filters);
};

// Fairness Data Service
export const getFairnessData = async (filters?: FilterOptions): Promise<any[]> => {
    return apiCall('/fairness', filters);
};

// Openness Data Service
export const getOpennessData = async (filters?: FilterOptions): Promise<any[]> => {
    return apiCall('/openness', filters);
};

// GHG Data Service  
export const getGHGData = async (filters?: FilterOptions): Promise<any[]> => {
    return apiCall('/ghg', filters);
};

// Non-GHG Data Service
export const getNonGHGData = async (filters?: FilterOptions): Promise<any[]> => {
    return apiCall('/non-ghg', filters);
};

// Generic ESG Data Service (for any data type)
export const getGenericESGData = async (dataType: string, filters?: FilterOptions): Promise<any[]> => {
    return apiCall(`/esg-data/${dataType}`, filters);
};

// Health check
export const checkAPIHealth = async (): Promise<{ status: string; database: string }> => {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        return await response.json();
    } catch (error) {
        throw new Error('API server is not running');
    }
};
