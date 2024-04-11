// @ts-ignore
import request from 'supertest';
import { app } from '../src/app';
import { VictoriaMetricsService } from '../src/VictoriaMetricsService';
import axios from 'axios';

jest.mock('../src/VictoriaMetricsService');
const mockVictoriaMetricsService = VictoriaMetricsService as jest.MockedClass<typeof VictoriaMetricsService>;

describe('GET /total-relays-latest', () => {
    it('responds with json', async () => {
        const mockData = {"data":{"resultType":"vector","result":[{"metric":{"__name__":"total_relays","cluster":"local","env":"main","instance":"10.1.244.1:9090","job":"consulagentonionoo","status":"all"},"value":[1712316485,"43"]},{"metric":{"__name__":"total_relays","cluster":"local","env":"main","instance":"10.1.244.1:9090","job":"consulagentonionoo","status":"offline"},"value":[1712316485,"26"]},{"metric":{"__name__":"total_relays","cluster":"local","env":"main","instance":"10.1.244.1:9090","job":"consulagentonionoo","status":"online"},"value":[1712316485,"17"]}]}};
        mockVictoriaMetricsService.prototype.query.mockResolvedValue(mockData);
        const response = await request(app).get('/total-relays-latest');
        expect(response.statusCode).toBe(200);
        expect(response.type).toBe('application/json');
        expect(response.body).toEqual({"all": "43", "offline": "26", "online": "17"});
    });
});

describe('GET /total-observed-bandwidth-latest', () => {
    it('responds with json', async () => {
        const mockData = {"data":{"resultType":"vector","result":[{"metric":{"__name__":"total_observed_bandwidth","cluster":"local","env":"main","instance":"10.1.244.1:9090","job":"consulagentonionoo","status":"all"},"value":[1712497632,"43138495"]},{"metric":{"__name__":"total_observed_bandwidth","cluster":"local","env":"main","instance":"10.1.244.1:9090","job":"consulagentonionoo","status":"offline"},"value":[1712497632,"3738891"]},{"metric":{"__name__":"total_observed_bandwidth","cluster":"local","env":"main","instance":"10.1.244.1:9090","job":"consulagentonionoo","status":"online"},"value":[1712497632,"39399604"]}]}};
        mockVictoriaMetricsService.prototype.query.mockResolvedValue(mockData);
        const response = await request(app).get('/total-observed-bandwidth-latest');
        expect(response.statusCode).toBe(200);
        expect(response.type).toBe('application/json');
        expect(response.body).toEqual({"all": "43138495", "offline": "3738891", "online": "39399604"});
    });
});

describe('GET /average-bandwidth-rate-latest', () => {
    it('responds with json', async () => {
        const mockData = {"data":{"resultType":"vector","result":[{"metric":{"__name__":"average_bandwidth_rate","cluster":"local","env":"main","instance":"10.1.244.1:9090","job":"consulagentonionoo","status":"all"},"value":[1712497728,"508379136"]},{"metric":{"__name__":"average_bandwidth_rate","cluster":"local","env":"main","instance":"10.1.244.1:9090","job":"consulagentonionoo","status":"offline"},"value":[1712497728,"9402231.466666667"]},{"metric":{"__name__":"average_bandwidth_rate","cluster":"local","env":"main","instance":"10.1.244.1:9090","job":"consulagentonionoo","status":"online"},"value":[1712497728,"948652875.2941176"]}]}};
        mockVictoriaMetricsService.prototype.query.mockResolvedValue(mockData);
        const response = await request(app).get('/average-bandwidth-rate-latest');
        expect(response.statusCode).toBe(200);
        expect(response.type).toBe('application/json');
        expect(response.body).toEqual({"all": "508379136", "offline": "9402231.466666667", "online": "948652875.2941176"});
    });
});

describe('GET /total-relays', () => {
    it('responds with json', async () => {
        const mockData = {"data":{"resultType":"matrix","result":[{"metric":{"__name__":"total_relays","cluster":"local","env":"main","instance":"10.1.244.1:9090","job":"consulagentonionoo","status":"all"},"values":[[1712316678,"43"],[1712316978,"44"]]},{"metric":{"__name__":"total_relays","cluster":"local","env":"main","instance":"10.1.244.1:9090","job":"consulagentonionoo","status":"offline"},"values":[[1712316678,"26"],[1712316978,"27"]]},{"metric":{"__name__":"total_relays","cluster":"local","env":"main","instance":"10.1.244.1:9090","job":"consulagentonionoo","status":"online"},"values":[[1712316678,"17"],[1712316978,"18"]]}]}};
        mockVictoriaMetricsService.prototype.query_range.mockResolvedValue(mockData);
        const response = await request(app).get('/total-relays');
        expect(response.statusCode).toBe(200);
        expect(response.type).toBe('application/json');
        expect(response.body).toEqual({"all": [[1712316678,"43"],[1712316978,"44"]], "offline": [[1712316678,"26"],[1712316978,"27"]], "online": [[1712316678,"17"],[1712316978,"18"]]});
    });
});

describe('GET /total-observed-bandwidth', () => {
    it('responds with json', async () => {
        const mockData = {"data":{"resultType":"matrix","result":[{"metric":{"__name__":"total_observed_bandwidth","cluster":"local","env":"main","instance":"10.1.244.1:9090","job":"consulagentonionoo","status":"all"},"values":[[1712497652,"43138495"],[1712497952,"43138495"]]},{"metric":{"__name__":"total_observed_bandwidth","cluster":"local","env":"main","instance":"10.1.244.1:9090","job":"consulagentonionoo","status":"offline"},"values":[[1712497652,"3738891"],[1712497952,"3738891"]]},{"metric":{"__name__":"total_observed_bandwidth","cluster":"local","env":"main","instance":"10.1.244.1:9090","job":"consulagentonionoo","status":"online"},"values":[[1712497652,"39399604"],[1712497952,"39399604"]]}]}};
        mockVictoriaMetricsService.prototype.query_range.mockResolvedValue(mockData);
        const response = await request(app).get('/total-observed-bandwidth');
        expect(response.statusCode).toBe(200);
        expect(response.type).toBe('application/json');
        expect(response.body).toEqual({"all": [[1712497652,"43138495"],[1712497952,"43138495"]], "offline": [[1712497652,"3738891"],[1712497952,"3738891"]], "online": [[1712497652,"39399604"],[1712497952,"39399604"]]});
    });
});

describe('GET /average-bandwidth-rate', () => {
    it('responds with json', async () => {
        const mockData = {"data":{"resultType":"matrix","result":[{"metric":{"__name__":"average_bandwidth_rate","cluster":"local","env":"main","instance":"10.1.244.1:9090","job":"consulagentonionoo","status":"all"},"values":[[1712497700,"508379136"],[1712498000,"508379136"]]},{"metric":{"__name__":"average_bandwidth_rate","cluster":"local","env":"main","instance":"10.1.244.1:9090","job":"consulagentonionoo","status":"offline"},"values":[[1712497700,"9402231.466666667"],[1712498000,"9402231.466666667"]]},{"metric":{"__name__":"average_bandwidth_rate","cluster":"local","env":"main","instance":"10.1.244.1:9090","job":"consulagentonionoo","status":"online"},"values":[[1712497700,"948652875.2941176"],[1712498000,"948652875.2941176"]]}]}};
        mockVictoriaMetricsService.prototype.query_range.mockResolvedValue(mockData);
        const response = await request(app).get('/average-bandwidth-rate');
        expect(response.statusCode).toBe(200);
        expect(response.type).toBe('application/json');
        expect(response.body).toEqual({"all": [[1712497700,"508379136"],[1712498000,"508379136"]], "offline": [[1712497700,"9402231.466666667"],[1712498000,"9402231.466666667"]], "online": [[1712497700,"948652875.2941176"],[1712498000,"948652875.2941176"]]});
    });
})
