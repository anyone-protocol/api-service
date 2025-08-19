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
        const fingerprint = hardwareInfo.fingerprint;
        if (fingerprint.length !== 40) { throw new Error('Fingerprint must be 40 char hex string') }
        const response = await axios.put(`${this.baseUrl}/hardware/${encodeURIComponent(fingerprint)}`, hardwareInfo).then();
        return response.data;
    }
}

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
