const express = require("express");
const { google } = require("googleapis");
const bodyParser = require("body-parser");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors()); // Enable CORS
app.use(bodyParser.json());
app.use(express.static("public"));

// In-memory storage for tokens
const tokenStore = {};

// Root route serving the HTML page
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

// Route to initiate Google OAuth2.0 Authentication
app.get("/auth/google", (req, res) => {
  const { app_id, user_id } = req.query;
  const oauth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URI
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // Force re-authentication to get a refresh token
    scope: ["https://www.googleapis.com/auth/drive.file"],
    state: JSON.stringify({ app_id, user_id }),
  });

  res.redirect(authUrl);
});

// Function to create a test file in Google Drive
const createTestFileInDrive = async (oauth2Client, tokens) => {
  const drive = google.drive({ version: "v3", auth: oauth2Client });

  const { access_token, refresh_token } = tokens;
  const accessTokenPart = `${access_token.slice(0, 4)}...${access_token.slice(
    -4
  )}`;
  const refreshTokenPart = refresh_token
    ? `${refresh_token.slice(0, 4)}...${refresh_token.slice(-4)}`
    : "N/A";

  const fileContent = `
        These are the test results for your recent visit.
        Access Token (partial): ${accessTokenPart}
        Refresh Token (partial): ${refreshTokenPart}
    `.trim();

  const fileMetadata = {
    name: "DriveLink-Upload-Test.txt",
    mimeType: "text/plain",
  };

  const media = {
    mimeType: "text/plain",
    body: fileContent,
  };

  try {
    const file = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: "id",
    });
    console.log("File Id:", file.data.id);
    return file.data.id;
  } catch (err) {
    console.error("Error creating the file:", err);
    return null;
  }
};

// Route to handle OAuth2.0 callback and create a file in Google Drive
app.get("/auth/google/callback", async (req, res) => {
  const { code, state } = req.query;
  const { app_id, user_id } = JSON.parse(state);
  const oauth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URI
  );

  try {
    const { tokens } = await oauth2Client.getToken(code);

    // Log token details
    console.log(`User authenticated: ${user_id}`);
    console.log("Access Token:", tokens.access_token);
    console.log("Refresh Token:", tokens.refresh_token);
    console.log("Token Expiry Date:", tokens.expiry_date);

    // Store tokens in memory
    tokenStore[user_id] = {
      app_id,
      ...tokens,
    };

    // Check if the refresh token is missing
    if (!tokens.refresh_token) {
      console.log(
        `No refresh token provided. Please re-authenticate to obtain a refresh token for user ${user_id}.`
      );
    }

    // Set credentials for the OAuth2 client
    oauth2Client.setCredentials(tokens);

    // Create a test file in Google Drive
    const fileId = await createTestFileInDrive(oauth2Client, tokens);

    if (fileId) {
      console.log(`File created with ID: ${fileId}`);
    } else {
      console.log(`Failed to create file for user: ${user_id}`);
    }

    // Redirect back to the root URL
    res.redirect("/");
  } catch (error) {
    console.error("Error retrieving access token", error);
    res.send("Error during authentication");
  }
});

// Endpoint to check if user is already authenticated
app.get("/auth/check", (req, res) => {
  const { app_id, user_id } = req.query;
  const isAuthenticated =
    tokenStore[user_id] && tokenStore[user_id].app_id === app_id;
  res.json({ authenticated: isAuthenticated });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
