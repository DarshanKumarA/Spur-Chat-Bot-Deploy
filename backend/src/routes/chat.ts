import { Router } from 'express';
import { prisma } from '../index.js';
import { generateReply } from '../services/llm.js';
import redis from '../services/redis.js'; // <--- The new service

const router = Router();
const CACHE_TTL = 3600; // Cache keeps memory for 1 hour

// Fetch conversation history
router.get('/history/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const cacheKey = `conversation:${sessionId}`;

        // 1. FAST PATH: Check Memurai (Redis) first
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
            console.log("⚡ Cache HIT (Memurai) for session:", sessionId);
            res.json(JSON.parse(cachedData));
            return;
        }

        // 2. SLOW PATH: Fetch from SQLite (DB)
        console.log("🐢 Cache MISS. Fetching from DB...");
        const messages = await prisma.message.findMany({
            where: { conversationId: sessionId },
            orderBy: { createdAt: 'asc' }
        });

        const responseData = { messages };

        // 3. SAVE TO CACHE: Store it so next time it's fast
        if (messages.length > 0) {
            await redis.set(cacheKey, JSON.stringify(responseData), 'EX', CACHE_TTL);
        }

        res.json(responseData);
    } catch (error) {
        console.error("History Error:", error);
        res.status(500).json({ error: "Could not fetch history" });
    }
});

// Handle incoming chat messages
router.post('/message', async (req, res) => {
    try {
        const { message, sessionId } = req.body;

        if (!message) {
            res.status(400).json({ error: "Message is required" });
            return;
        }

        // Security Check
        if (message.length > 1000) {
            res.status(400).json({ error: "Message is too long (max 1000 chars)" });
            return;
        }

        // 1. Manage Session ID
        let conversationId = sessionId;
        if (!conversationId) {
            const newConversation = await prisma.conversation.create({ data: {} });
            conversationId = newConversation.id;
            console.log("🆕 Starting New Session:", conversationId);
        } else {
            const exists = await prisma.conversation.findUnique({ where: { id: conversationId } });
            if (!exists) {
                const newConversation = await prisma.conversation.create({ data: { id: conversationId } });
                console.log("♻️ Re-created Missing Session:", conversationId);
            } else {
                console.log("🆔 Continuing Session:", conversationId);
            }
        }

        console.log("📩 Received:", message);

        // 2. Save User Message to DB
        await prisma.message.create({
            data: { conversationId, sender: 'user', text: message }
        });

        // 3. CACHE INVALIDATION
        // We added a new message, so the old cache is outdated. Delete it!
        const cacheKey = `conversation:${conversationId}`;
        await redis.del(cacheKey);

        // 4. Fetch Context (From DB for accuracy)
        const history = await prisma.message.findMany({
            where: { conversationId },
            orderBy: { createdAt: 'asc' },
            take: 10
        });

        const formattedHistory = history.map(msg => ({
            role: msg.sender,
            text: msg.text
        }));

        // 5. Call AI
        let aiResponseText = "";
        try {
            aiResponseText = await generateReply(formattedHistory, message);
        } catch (llmError) {
            console.error("❌ LLM Service Error:", llmError);
            aiResponseText = "I apologize, but I'm currently experiencing a momentary system delay. Please try your question again in a few seconds.";
        }

        console.log("🤖 AI Reply:", aiResponseText);
        console.log("------------------------------------------------");

        // 6. Save AI Reply to DB
        await prisma.message.create({
            data: { conversationId, sender: 'ai', text: aiResponseText }
        });

        // 7. INVALIDATE AGAIN (To include the AI's reply in the fresh fetch)
        await redis.del(cacheKey);

        res.json({ reply: aiResponseText, sessionId: conversationId });

    } catch (error) {
        console.error("Critical Server Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;