import axios from 'axios';

export class VictoriaMetricsService {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    async query(query: string): Promise<any> {
        const response = await axios.get(`${this.baseUrl}/api/v1/query`, {
            params: {
                query: query
            }
        });
        return response.data;
    }
}

// Request interceptor
axios.interceptors.request.use(request => {
    console.log('Starting Request', JSON.stringify(request, null, 2));
    return request;
});

// Response interceptor
axios.interceptors.response.use(response => {
    console.log('Response:', JSON.stringify(response, null, 2));
    return response;
});