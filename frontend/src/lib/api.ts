import axios from 'axios';

// NEXT_PUBLIC_* values are inlined into the client bundle at build time.
// Use a non-sensitive key here; for production, proxy API calls through a
// backend-for-frontend instead of shipping a privileged key to the browser.
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || 'default-secret-key';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
  },
});

export interface CLVPrediction {
  churn_probability: number;
  predicted_clv_90d: number;
}

export interface CLVExplanation {
  base_value: number;
  prediction: number;
  contributions: {
    Recency: number;
    Frequency: number;
    Monetary: number;
  };
}

export interface Recommendation {
  rank: number;
  stock_code: string;
  description: string;
  affinity_score: number;
}

export interface RecommendationResponse {
  customer_id: number;
  recommendations: Recommendation[];
}

export interface AtRiskCustomer {
  id: string;
  churnRisk: number;
  clv: number;
  recency: number;
  freq: number;
  status: string;
}

export interface CustomerRFM {
  recency: number;
  frequency: number;
  monetary: number;
}

export interface SegmentSummary {
  Segment: string;
  count: number;
  avg_clv: number;
  avg_churn: number;
  avg_recency: number;
  avg_frequency: number;
  avg_monetary: number;
}

export interface SegmentPoint {
  id: string;
  recency: number;
  monetary: number;
  frequency: number;
  clv: number;
  segment: string;
}

export interface SegmentsResponse {
  summary: SegmentSummary[];
  scatter: SegmentPoint[];
}

export interface MonthlyRevenue {
  date: string;
  revenue: number;
}

export interface BusinessOverview {
  historical_monthly: MonthlyRevenue[];
  forecast_90d: number;
  total_historical: number;
}

export interface ProductMetric {
  stock_code: string;
  description: string;
  revenue: number;
  quantity: number;
  buyers: number;
}

export interface ProductAnalytics {
  top_products: ProductMetric[];
}

export interface HealthStatus {
  status: string;
  service?: string;
  version?: string;
  models_loaded?: boolean;
  uptime_seconds?: number;
}

export const predictCLV = async (recency: number, frequency: number, monetary: number): Promise<CLVPrediction> => {
  const response = await apiClient.post('/predict/clv', {
    recency,
    frequency,
    monetary,
  });
  return response.data;
};

export const explainCLV = async (recency: number, frequency: number, monetary: number): Promise<CLVExplanation> => {
  const response = await apiClient.post('/explain', {
    recency,
    frequency,
    monetary,
  });
  return response.data;
};

export const getAtRiskCustomers = async (): Promise<AtRiskCustomer[]> => {
  const response = await apiClient.get('/at_risk_customers');
  return response.data;
};

export const getRecommendations = async (customerId: number): Promise<RecommendationResponse> => {
  const response = await apiClient.get(`/recommend/${customerId}`);
  return response.data;
};

export const getCustomerRFM = async (customerId: string): Promise<CustomerRFM> => {
  const response = await apiClient.get(`/customer/${customerId}/rfm`);
  return response.data;
};

export const getHealth = async (): Promise<HealthStatus> => {
  const response = await apiClient.get('/health');
  return response.data;
};

export const getSegments = async (): Promise<SegmentsResponse> => {
  const response = await apiClient.get('/segments');
  return response.data;
};

export const getBusinessOverview = async (): Promise<BusinessOverview> => {
  const response = await apiClient.get('/business_overview');
  return response.data;
};

export const getProductAnalytics = async (): Promise<ProductAnalytics> => {
  const response = await apiClient.get('/product_analytics');
  return response.data;
};

export const generateEmail = async (customerId: string): Promise<{ email_template: string }> => {
  const response = await apiClient.post(`/generate_email/${customerId}`);
  return response.data;
};

export const batchPredict = async (file: File): Promise<Blob> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post('/batch_predict', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    responseType: 'blob', // Important for handling CSV file download
  });
  return response.data;
};
