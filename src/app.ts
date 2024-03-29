import express from 'express';
import { VictoriaMetricsService } from './VictoriaMetricsService';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const port = 3000;
// Use the service name as the base URL
const vmService = new VictoriaMetricsService(process.env.VICTORIA_METRICS_ADDRESS as string);

const CLUSTER = process.env.CLUSTER ?? 'local';
const ENV = process.env.ENV ?? 'main';
const INSTANCE = process.env.INSTANCE ?? '10.1.244.1:9190';
const JOB = process.env.JOB ?? 'consulagentonionoo';

const FROM = process.env.FROM ?? '-5d';
const TO = process.env.TO ?? 'now';
const INTERVAL = process.env.INTERVAL ?? '4h';

app.get('/query/:query', async (req, res) => {
    await handleQuery(req.params.query, res);
});

app.get('/query-range/:query', async (req, res) => {
    try {
        const from = String(req.query.from ?? FROM);
        const to = String(req.query.to ?? TO);
        const interval = String(req.query.interval ?? INTERVAL);

        const data = await vmService.query_range(req.params.query, from, to, interval);
        console.log(data);

        // Transform the response
        const transformedResponse = data.data.result.reduce((acc: any, item: any) => {
            acc[item.metric.status] = item.values;
            return acc;
        }, {});
        console.log(transformedResponse);

        res.json(transformedResponse);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error querying VictoriaMetrics');
    }
});

app.get('/total-relays', async (req, res) => {
    await handleQuery(buildQuery("total_relays"), res);
});

app.get('/total-observed-bandwidth', async (req, res) => {
    await handleQuery(buildQuery("total_observed_bandwidth"), res);
});

app.get('/average-bandwidth-rate', async (req, res) => {
    await handleQuery(buildQuery("average_bandwidth_rate"), res);
});

function buildQuery(metric: string): string {
    return `${metric}{cluster="${CLUSTER}", env="${ENV}", instance="${INSTANCE}", job="${JOB}"}`;
}

async function handleQuery(queryString: string, res: any) {
    try {
        const data = await vmService.query(queryString);
        console.log(data);

        // Transform the response
        const transformedResponse = data.data.result.reduce((acc: any, item: any) => {
            acc[item.metric.status] = item.value[1];
            return acc;
        }, {});
        console.log(transformedResponse);

        res.json(transformedResponse);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error querying VictoriaMetrics');
    }
}

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
