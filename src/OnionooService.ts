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
const DEFAULT_DETAILS_CACHE_TTL_SECONDS = 60;
const DEFAULT_DETAILS_TIMEOUT_SECONDS = 30;

function secondsFromEnv(name: string, fallback: number, allowZero: boolean): number {
    const raw = process.env[name];
    if (raw === undefined || raw === '') {
        return fallback;
    }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0 || (parsed === 0 && !allowZero)) {
        console.warn(`Invalid ${name} [${raw}]. Using default value of ${fallback}.`);
        return fallback;
    }
    return parsed;
}

export class OnionooService {
    private baseUrl: string;
    private detailsCacheTtlMs: number;
    private detailsTimeoutMs: number;
    private cachedDetails: any = null;
    private cachedDetailsAt: number = 0;
    private pendingDetails: Promise<any> | null = null;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
        this.detailsCacheTtlMs = 1000 * secondsFromEnv(
            'ONIONOO_DETAILS_CACHE_TTL_SECONDS',
            DEFAULT_DETAILS_CACHE_TTL_SECONDS,
            true
        );
        this.detailsTimeoutMs = 1000 * secondsFromEnv(
            'ONIONOO_DETAILS_TIMEOUT_SECONDS',
            DEFAULT_DETAILS_TIMEOUT_SECONDS,
            false
        );
    }

    async details(): Promise<any> {
        const cacheAge = Date.now() - this.cachedDetailsAt;
        if (this.cachedDetails && cacheAge < this.detailsCacheTtlMs) {
            return this.cachedDetails;
        }

        if (!this.pendingDetails) {
            this.pendingDetails = axios
                .get(`${this.baseUrl}/details`, {
                    params: { fields: DETAILS_FIELDS },
                    signal: AbortSignal.timeout(this.detailsTimeoutMs)
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
