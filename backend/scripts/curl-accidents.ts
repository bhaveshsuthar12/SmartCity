import 'dotenv/config';
import { AccidentService } from '../src/services/accident/AccidentService';
import mongoose from 'mongoose';
import { env } from '../src/config/env';

async function run() {
    await mongoose.connect(env.MONGODB_URI);
    // Mimic the query from the frontend
    const result = await AccidentService.listIncidents({ page: 1, pageSize: 20 });
    console.log("Raw Service Output:", { total: result.total, incidents_length: result.incidents.length });

    const analytics = await AccidentService.getAnalytics('');
    console.log("Analytics Total:", analytics.summary.total);

    const withCity = await AccidentService.listIncidents({ page: 1, pageSize: 20, city: 'demo-city' });
    console.log("With City Output:", { total: withCity.total, incidents_length: withCity.incidents.length });
    await mongoose.connection.close();
}
run();
