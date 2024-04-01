import express from 'express';
import { VictoriaMetricsService } from './VictoriaMetricsService';
import dotenv from 'dotenv';
import QueryString from 'qs';
dotenv.config();

const app = express();
const port = 3000;
const vmService = new VictoriaMetricsService(process.env.VICTORIA_METRICS_ADDRESS as string);

const CLUSTER = process.env.CLUSTER ?? 'local';
const ENV = process.env.ENV ?? 'main';
const ONIONOO_INSTANCE = process.env.ONIONOO_INSTANCE ?? '10.1.244.1:9190';
const JOB = process.env.JOB ?? 'consulagentonionoo';

const FROM = process.env.FROM ?? '-7d';
const TO = process.env.TO ?? 'now';
const INTERVAL = process.env.INTERVAL ?? '6h';

app.get('/query-range/:query', async (req, res) => {
    await handleQuery(req.params.query, req.query, res);
});

app.get('/total-relays', async (req, res) => {
    await handleQuery(buildQuery("total_relays"), req.query, res);
});

app.get('/total-observed-bandwidth', async (req, res) => {
    await handleQuery(buildQuery("total_observed_bandwidth"), req.query, res);
});

app.get('/average-bandwidth-rate', async (req, res) => {
    await handleQuery(buildQuery("average_bandwidth_rate"), req.query, res);
});

function buildQuery(metric: string): string {
    return `${metric}{cluster="${CLUSTER}", env="${ENV}", instance="${ONIONOO_INSTANCE}", job="${JOB}"}`;
}

async function handleQuery(query: string, params: QueryString.ParsedQs, res: any) {
    try {
        const from = String(params.from ?? FROM);
        const to = String(params.to ?? TO);
        const interval = String(params.interval ?? INTERVAL);

        const vmRawData = await vmService.query_range(query, from, to, interval);
        console.log(vmRawData);

        const mappedData = vmRawData.data.result.reduce((acc: any, item: any) => {
            acc[item.metric.status] = item.values;
            return acc;
        }, {});
        console.log(mappedData);

        res.json(mappedData);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error querying VictoriaMetrics');
    }
}

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
