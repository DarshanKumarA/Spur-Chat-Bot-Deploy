import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
// import Redis from 'ioredis'; // <--- COMMENTED OUT

import chatRoutes from './routes/chat.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

export const prisma = new PrismaClient();
// export const redis = new Redis(); // <--- COMMENTED OUT

app.get('/', (req, res) => {
    res.send('Spur Chatbot Backend is running');
});

app.use('/chat', chatRoutes);

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});