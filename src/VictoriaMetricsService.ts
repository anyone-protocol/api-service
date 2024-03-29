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
        }).then();
        return response.data;
    }

    async query_range(query: string, start: string, end: string, step: string): Promise<any> {
        const response = await axios.get(`${this.baseUrl}/api/v1/query_range`, {
            params: {
                query: query,
                start: start,
                end: end,
                step: step
            }
        }).then();
        return response.data;
    }
}

// curl 'http://localhost:8428/prometheus/api/v1/query_range?query=total_relays{cluster="local", env="main", instance="10.1.244.1:9190", job="consulagentonionoo"}&start=-3d&step=5m'

// Request interceptor
axios.interceptors.request.use(request => {
    console.log('Starting Request', JSON.stringify(request, null, 2));
    return request;
});

// Response interceptor
axios.interceptors.response.use(response => {
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return response;
});

// total_relays{cluster="local", env="main", instance="10.1.244.1:9190", job="consulagentonionoo"}
// [1h]