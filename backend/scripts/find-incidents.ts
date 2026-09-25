import 'dotenv/config';
import mongoose from 'mongoose';
import { AccidentIncident } from '../src/models/AccidentIncident';
import { env } from '../src/config/env';

async function run() {
    await mongoose.connect(env.MONGODB_URI);
    const incidents = await AccidentIncident.find({});
    console.log(`Found ${incidents.length} incidents.`);
    if (incidents.length > 0) {
        console.log(incidents[0]);
    }
    await mongoose.connection.close();
}
run();
