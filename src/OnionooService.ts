import axios from 'axios';

export class OnionooService {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    async details(): Promise<any> {
        const response = await axios.get(`${this.baseUrl}/details`).then();
        return response.data;
    }

    async updateHardwareInfo(hardwareInfo: HardwareInfo): Promise<any> {
        const finferprint = hardwareInfo.fingerprint;
        const response = await axios.put(`${this.baseUrl}/hardware/${finferprint}`, hardwareInfo).then();
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
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return response;
});

interface SerNum {
    type: string;
    number: string;
}
    
interface PubKey {
    type: string;
    number: string;
}
    
interface Cert {
    type: string;
    signature: string;
}
    
export interface HardwareInfo {
    id: string;
    company: string;
    format: string;
    wallet: string;
    nftid: string;
    build: string;
    flags: string;
    fingerprint: string;
    serNums: SerNum[];
    pubKeys: PubKey[];
    certs: Cert[];
}
