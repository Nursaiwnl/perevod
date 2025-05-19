const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const {
    GITHUB_TOKEN, GITHUB_USER, REPO, LEADERBOARD_FILE
} = process.env;

const githubApi = axios.create({
    baseURL: `https://api.github.com/repos/${GITHUB_USER}/${REPO}/contents/`,
    headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json'
    }
});

// Сохранить счёт
app.post('/save-score', async (req, res) => {
    const { name, score } = req.body;

    if (!name || typeof score !== 'number') {
        return res.status(400).json({ message: 'Invalid data' });
    }

    try {
        const getRes = await githubApi.get(LEADERBOARD_FILE);
        const sha = getRes.data.sha;
        const currentData = JSON.parse(Buffer.from(getRes.data.content, 'base64').toString('utf-8'));

        currentData.push({ name, score, date: new Date().toISOString() });
        currentData.sort((a, b) => b.score - a.score);
        const top10 = currentData.slice(0, 10);

        await githubApi.put(LEADERBOARD_FILE, {
            message: 'Update leaderboard',
            content: Buffer.from(JSON.stringify(top10, null, 2)).toString('base64'),
            sha
        });

        res.status(200).json({ message: 'Saved' });
    } catch (err) {
        console.error(err.response?.data || err.message);
        res.status(500).json({ message: 'Error saving leaderboard' });
    }
});

// Получить топ-10
app.get('/leaderboard', async (req, res) => {
    try {
        const getRes = await githubApi.get(LEADERBOARD_FILE);
        const content = Buffer.from(getRes.data.content, 'base64').toString('utf-8');
        const leaderboard = JSON.parse(content);
        res.json(leaderboard);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to load leaderboard' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
