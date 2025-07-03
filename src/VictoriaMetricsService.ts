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
