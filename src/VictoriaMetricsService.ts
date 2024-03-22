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
