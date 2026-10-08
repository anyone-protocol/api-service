import axios from 'axios';

const DETAILS_FIELDS = [
    'fingerprint',
    'nickname',
    'running',
    'consensus_weight',
    'observed_bandwidth',
    'measured',
    'or_addresses'
].join(',');
const DETAILS_CACHE_TTL_MS = 60_000;
const DETAILS_TIMEOUT_MS = 30_000;

export class OnionooService {
    private baseUrl: string;
    private cachedDetails: any = null;
    private cachedDetailsAt: number = 0;
    private pendingDetails: Promise<any> | null = null;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    async details(): Promise<any> {
        const cacheAge = Date.now() - this.cachedDetailsAt;
        if (this.cachedDetails && cacheAge < DETAILS_CACHE_TTL_MS) {
            return this.cachedDetails;
        }

        if (!this.pendingDetails) {
            this.pendingDetails = axios
                .get(`${this.baseUrl}/details`, {
                    params: { fields: DETAILS_FIELDS },
                    signal: AbortSignal.timeout(DETAILS_TIMEOUT_MS)
                })
                .then(response => {
                    this.cachedDetails = response.data;
                    this.cachedDetailsAt = Date.now();
                    return response.data;
                })
                .finally(() => {
                    this.pendingDetails = null;
                });
        }

        return this.pendingDetails;
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
