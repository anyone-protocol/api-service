import axios from 'axios';

export class OnionooService {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    async details(): Promise<any> {
        return  await axios.get(`${this.baseUrl}/details`).then();
    }
    
}

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
