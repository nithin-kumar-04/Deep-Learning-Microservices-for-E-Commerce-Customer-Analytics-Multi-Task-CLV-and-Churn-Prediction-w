import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface CLVPrediction {
  churn_probability: number;
  predicted_clv_90d: number;
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

export const predictCLV = async (recency: number, frequency: number, monetary: number): Promise<CLVPrediction> => {
  const response = await apiClient.post('/predict/clv', {
    recency,
    frequency,
    monetary,
  });
  return response.data;
};

export const getRecommendations = async (customerId: number): Promise<RecommendationResponse> => {
  const response = await apiClient.get(`/recommend/${customerId}`);
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
