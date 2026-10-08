import axios from 'axios';
import { OnionooService } from '../src/OnionooService';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('OnionooService details', () => {
    const details = { relays: [{ fingerprint: 'A'.repeat(40) }] };

    beforeEach(() => {
        jest.useFakeTimers();
        mockedAxios.get.mockReset();
        delete process.env.ONIONOO_DETAILS_CACHE_TTL_SECONDS;
        delete process.env.ONIONOO_DETAILS_TIMEOUT_SECONDS;
    });

    afterEach(() => {
        jest.useRealTimers();
        delete process.env.ONIONOO_DETAILS_CACHE_TTL_SECONDS;
        delete process.env.ONIONOO_DETAILS_TIMEOUT_SECONDS;
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

    it('reads the cache ttl from the environment', async () => {
        process.env.ONIONOO_DETAILS_CACHE_TTL_SECONDS = '5';
        mockedAxios.get.mockResolvedValue({ data: details });
        const service = new OnionooService('http://onionoo');

        await service.details();
        jest.advanceTimersByTime(4_000);
        await service.details();
        expect(mockedAxios.get).toHaveBeenCalledTimes(1);

        jest.advanceTimersByTime(2_000);
        await service.details();
        expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });

    it('disables caching when the ttl is zero', async () => {
        process.env.ONIONOO_DETAILS_CACHE_TTL_SECONDS = '0';
        mockedAxios.get.mockResolvedValue({ data: details });
        const service = new OnionooService('http://onionoo');

        await service.details();
        await service.details();

        expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });

    it('reads the timeout from the environment', async () => {
        process.env.ONIONOO_DETAILS_TIMEOUT_SECONDS = '7';
        const timeout = jest.spyOn(AbortSignal, 'timeout');
        mockedAxios.get.mockResolvedValue({ data: details });

        await new OnionooService('http://onionoo').details();

        expect(timeout).toHaveBeenCalledWith(7_000);
        timeout.mockRestore();
    });

    it('falls back to defaults on invalid values', async () => {
        process.env.ONIONOO_DETAILS_CACHE_TTL_SECONDS = 'abc';
        process.env.ONIONOO_DETAILS_TIMEOUT_SECONDS = '0';
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
        const timeout = jest.spyOn(AbortSignal, 'timeout');
        mockedAxios.get.mockResolvedValue({ data: details });
        const service = new OnionooService('http://onionoo');

        await service.details();
        jest.advanceTimersByTime(59_000);
        await service.details();

        expect(mockedAxios.get).toHaveBeenCalledTimes(1);
        expect(timeout).toHaveBeenCalledWith(30_000);
        expect(warn).toHaveBeenCalledTimes(2);
        timeout.mockRestore();
        warn.mockRestore();
    });
});
