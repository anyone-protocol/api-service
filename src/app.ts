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
        res.json(data);
    } catch (error) {
        res.status(500).send('Error querying VictoriaMetrics');
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
