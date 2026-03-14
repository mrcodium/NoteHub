import mongoose from "mongoose";
import ora from 'ora';
import { ENV } from "../config/env.js";
import dns from "dns";

dns.setServers(['8.8.8.8', '8.8.4.4']);

const connectToDb = async()=>{
    const spinner = ora('Connecting to MongoDB...').start();

    try {
        const conn = await mongoose.connect(ENV.MONGODB_URI);
        spinner.succeed(`Connected to MongoDB ${conn.connection.host}`);
        global.mongoose = mongoose;
    } catch (error) {
        spinner.fail('Failed to connect to MongoDB');
        console.error('Error in connectToDb: ', error);
    }
}

export default connectToDb;