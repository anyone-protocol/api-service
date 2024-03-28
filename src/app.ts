import express from 'express';
import { VictoriaMetricsService } from './VictoriaMetricsService';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const port = 3000;
// Use the service name as the base URL
const vmService = new VictoriaMetricsService(process.env.VICTORIA_METRICS_ADDRESS as string);

app.get('/metrics/:query', async (req, res) => {
    try {
        const data = await vmService.query(req.params.query);
        console.log(data);

        // Transform the response
        // @ts-ignore
        const transformedResponse = data.data.result.reduce((acc, item) => {
            acc[item.metric.status] = item.value[1];
            return acc;
        }, {});
        console.log(transformedResponse);

        res.json(transformedResponse);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error querying VictoriaMetrics');
    }
});

//total_relays
app.get('/total-relays', async (req, res) => {
    try {
        const data = await vmService.query("total_relays{cluster=\"local\", env=\"main\", instance=\"10.1.244.1:9190\", job=\"consulagentonionoo\"}");
        console.log(data);

        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error querying VictoriaMetrics');
    }
});

app.get('/total-observed-bandwidth', async (req, res) => {
    try {
        const data = await vmService.query("total_observed_bandwidth{cluster=\"local\", env=\"main\", instance=\"10.1.244.1:9190\", job=\"consulagentonionoo\"}");
        console.log(data);
        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error querying VictoriaMetrics');
    }
});

app.get('/average-bandwidth-rate', async (req, res) => {
    try {
        const data = await vmService.query("average_bandwidth_rate{cluster=\"local\", env=\"main\", instance=\"10.1.244.1:9190\", job=\"consulagentonionoo\"}");
        console.log(data);
        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error querying VictoriaMetrics');
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
