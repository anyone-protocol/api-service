import express from 'express';
import { VictoriaMetricsService } from './VictoriaMetricsService';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const port = 3000;
// Use the service name as the base URL
const vmService = new VictoriaMetricsService(process.env.VICTORIA_METRICS_ADDRESS as string);

app.get('/metrics/:query', async (req, res) => {
    await handleQuery(req.params.query, res);
});

app.get('/total-relays', async (req, res) => {
    await handleQuery("total_relays{cluster=\"local\", env=\"main\", instance=\"10.1.244.1:9190\", job=\"consulagentonionoo\"}", res);
});

app.get('/total-observed-bandwidth', async (req, res) => {
    await handleQuery("total_observed_bandwidth{cluster=\"local\", env=\"main\", instance=\"10.1.244.1:9190\", job=\"consulagentonionoo\"}", res);
});

app.get('/average-bandwidth-rate', async (req, res) => {
    await handleQuery("average_bandwidth_rate{cluster=\"local\", env=\"main\", instance=\"10.1.244.1:9190\", job=\"consulagentonionoo\"}", res);
});

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
