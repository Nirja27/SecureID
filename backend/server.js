const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pool = require("./db");
const authRoutes = require("./routes/auth");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", authRoutes);

app.get("/", (req, res) => {
    res.json({
        message: "TrulyIAS backend is running"
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
    console.log(`Server running on http://localhost:${PORT}`);

    try {
        const connection = await pool.getConnection();
        console.log("MySQL database connected successfully!");
        connection.release();
    } catch (error) {
        console.error("MySQL connection failed:", error.message);
    }
});