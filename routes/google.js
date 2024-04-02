const express = require("express");
const googlerouter = express.Router();
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { google } = require("googleapis");
const { Queue, Worker } = require('bullmq'); // Import Queue and Worker from bullmq
const { Redis } = require("ioredis");

const connection = new Redis({
  port: 11485,
  host: "redis-11485.c100.us-east-1-4.ec2.cloud.redislabs.com",
  username: "default",
  password: 'xMXr2q2aK4hqP6sljDomWCUhEob8XpeK',
  maxRetriesPerRequest: null
});

const genAI = new GoogleGenerativeAI(process.env.API_KEY);

const queue = new Queue('gmail-auto-reply-queue', {
  connection: connection
});

googlerouter.get("/google", passport.authenticate("google", { scope: ["profile", "email", 'https://www.googleapis.com/auth/gmail.readonly', "https://www.googleapis.com/auth/gmail.send"], accessType: 'offline', prompt: 'consent' }));

googlerouter.get("/google/callback", passport.authenticate("google"), (req, res) => {
  res.redirect("/auth/gmail");
});

googlerouter.get("/gmail", async (req, res) => {
  const { accessToken, refreshToken } = req.user.tokens;

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    "https://localhost:3000/auth/google/callback",
  );

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken
  });

  const gmail = google.gmail({
    version: 'v1',
    auth: oauth2Client
  });

  try {
    const sendAutoReply = async () => {
      const response = await gmail.users.messages.list({
        userId: 'me',
        q: 'is:unread'
      });
      const messages = response.data.messages;
      if (messages.length === 0) {
        console.log('No unread emails found.');
        return;
      }
      for (const message of messages) {
        const messageId = message.id;
        const messageDetails = await gmail.users.messages.get({
          userId: 'me',
          id: messageId,
          format: 'full'
        });
        const email = {
          id: messageId,
          subject: messageDetails.data.payload.headers.find(header => header.name === 'Subject').value,
          body: messageDetails.data.snippet
        };
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const prompt = `You received an email with the subject: "${email.subject}" and the following content: "${email.body}". Please draft a reply:`
        const result = await model.generateContent(prompt);
        const res = await result.response;
        const replyText = res.text();
        const replyMessage = {
          to: messageDetails.data.payload.headers.find(header => header.name === 'From').value,
          subject: 'Re: ' + email.subject,
          text: replyText
        };
        const rawMessage = Buffer.from(
          'To: ' + replyMessage.to + '\r\n' +
          'Subject: ' + replyMessage.subject + '\r\n\r\n' +
          replyMessage.text
        ).toString('base64');
        await gmail.users.messages.send({
          userId: 'me',
          requestBody: {
            raw: rawMessage
          }
        });
        console.log("Reply sent successfully to email with id:", messageId);
      }
    };

    await queue.add('auto-reply-task', {});

    const worker = new Worker('gmail-auto-reply-queue', async job => {
      await sendAutoReply();
    }, {
      connection: connection 
    });

    res.status(200).send("Auto reply enabled successfully!");
  } catch (error) {
    console.error("Error generating or sending reply message:", error);
    res.status(500).send("Error generating or sending reply message: " + error.message);
  }
});

module.exports = { googlerouter };