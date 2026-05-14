import User from "../model/user.model.js";
import { ENV } from "../config/env.js";

export const connectGithub = async (req, res) => {
    try {
        const params = new URLSearchParams({
            client_id: ENV.GITHUB_CLIENT_ID,
            redirect_uri: ENV.GITHUB_REDIRECT_URI,
            scope: 'read:user',
        });
        const url = `https://github.com/login/oauth/authorize?${params.toString()}`;
        res.status(200).json({ url });
    } catch (error) {
        console.error("Error in connectGithub:", error);
        res.status(500).json({ message: "Failed to connect GitHub" });
    }
};

export const githubCallback = async (req, res) => {
    const { code } = req.query;

    if (!code) {
        return res.status(400).json({ message: "Code is required" });
    }

    try {
        // Exchange code for token
        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({
                client_id: ENV.GITHUB_CLIENT_ID,
                client_secret: ENV.GITHUB_CLIENT_SECRET,
                code,
                redirect_uri: ENV.GITHUB_REDIRECT_URI,
            }),
        });

        const tokenData = await tokenResponse.json();

        if (tokenData.error) {
            return res.status(400).json({ message: tokenData.error_description || "OAuth failed" });
        }

        const accessToken = tokenData.access_token;

        // Fetch user info
        const userResponse = await fetch('https://api.github.com/user', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        const githubUser = await userResponse.json();

        // Update user in DB
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        user.github = {
            username: githubUser.login,
            accessToken,
            connectedAt: new Date(),
        };

        await user.save();

        res.redirect(`${ENV.FRONTEND_URL}/${user.userName}?github=success`);
    } catch (error) {
        console.error("Error in githubCallback:", error);
        res.redirect(`${ENV.FRONTEND_URL}/settings/profile?github=error`);
    }
};

export const disconnectGithub = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        user.github = undefined;
        await user.save();

        res.status(200).json({ success: true, message: "GitHub disconnected successfully" });
    } catch (error) {
        console.error("Error in disconnectGithub:", error);
        res.status(500).json({ message: "Failed to disconnect GitHub" });
    }
};

export const getGithubContributions = async (req, res) => {
    const { username } = req.params;
    
    try {
        const response = await fetch(`https://github-contributions-api.deno.dev/v1/${username}`);
        const data = await response.json();
        
        if (!data || !data.contributions) {
            return res.status(404).json({ message: "No contributions found" });
        }

        // Transform into weeks structure
        const weeks = [];
        for (let i = 0; i < data.contributions.length; i += 7) {
            weeks.push({
                contributionDays: data.contributions.slice(i, i + 7).map(day => ({
                    date: day.date,
                    contributionCount: day.count
                }))
            });
        }
        
        res.status(200).json({
            weeks,
            totalContributions: data.total.lastYear
        });
    } catch (error) {
        console.error("Error fetching GitHub contributions:", error);
        res.status(500).json({ message: "Failed to fetch GitHub contributions" });
    }
};
