import axios from 'axios';
import { OnionooService } from '../src/OnionooService';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('OnionooService details', () => {
    const details = { relays: [{ fingerprint: 'A'.repeat(40) }] };

    beforeEach(() => {
        jest.useFakeTimers();
        mockedAxios.get.mockReset();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('requests only the fields the service reads', async () => {
        mockedAxios.get.mockResolvedValue({ data: details });
        const service = new OnionooService('http://onionoo');

        await service.details();

        expect(mockedAxios.get).toHaveBeenCalledWith(
            'http://onionoo/details',
            expect.objectContaining({
                params: {
                    fields: 'fingerprint,nickname,running,consensus_weight,' +
                        'observed_bandwidth,measured,or_addresses'
                },
                signal: expect.any(AbortSignal)
            })
        );
    });

    it('shares one request between concurrent callers', async () => {
        mockedAxios.get.mockResolvedValue({ data: details });
        const service = new OnionooService('http://onionoo');

        const results = await Promise.all([
            service.details(),
            service.details(),
            service.details()
        ]);

        expect(mockedAxios.get).toHaveBeenCalledTimes(1);
        expect(results).toEqual([details, details, details]);
    });

    it('serves from cache until the ttl expires', async () => {
        mockedAxios.get.mockResolvedValue({ data: details });
        const service = new OnionooService('http://onionoo');

        await service.details();
        jest.advanceTimersByTime(59_000);
        await service.details();
        expect(mockedAxios.get).toHaveBeenCalledTimes(1);

        jest.advanceTimersByTime(2_000);
        await service.details();
        expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });

    it('does not cache a failed request', async () => {
        mockedAxios.get.mockRejectedValueOnce(new Error('timeout'));
        mockedAxios.get.mockResolvedValueOnce({ data: details });
        const service = new OnionooService('http://onionoo');

        await expect(service.details()).rejects.toThrow('timeout');
        await expect(service.details()).resolves.toEqual(details);
        expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });
});
