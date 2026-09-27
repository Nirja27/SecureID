const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const pool = require("../db");

const router = express.Router();

router.post("/register", async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;

        // 1. Validate required fields
        if (!name || !email || !phone || !password) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }

        // 2. Validate email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            return res.status(400).json({
                message: "Invalid email address"
            });
        }

        // 3. Validate password
        if (password.length < 8) {
            return res.status(400).json({
                message: "Password must be at least 8 characters"
            });
        }

        // 4. Check whether email already exists
        const [existingUsers] = await pool.execute(
            "SELECT id FROM users WHERE email = ?",
            [email]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({
                message: "Email is already registered"
            });
        }

        // 5. Hash the password
        const passwordHash = await bcrypt.hash(password, 10);

        // 6. Create the user
        const [userResult] = await pool.execute(
            `INSERT INTO users
            (name, email, phone, password_hash)
            VALUES (?, ?, ?, ?)`,
            [name, email, phone, passwordHash]
        );

        const userId = userResult.insertId;

        // 7. Generate a 6-digit OTP
        const otp = crypto.randomInt(100000, 1000000).toString();

        // 8. Hash the OTP
        const otpHash = await bcrypt.hash(otp, 10);

        // 9. Create challenge ID
        const challengeId = crypto.randomUUID();

        // 10. Set OTP expiry
        const expiresAt = new Date(Date.now() + 2 * 60 * 1000);

        // 11. Store OTP challenge
        await pool.execute(
            `INSERT INTO otp_challenges
            (challenge_id, user_id, channel, otp_hash, expires_at, attempts, used)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                challengeId,
                userId,
                "email",
                otpHash,
                expiresAt,
                0,
                false
            ]
        );

        // 12. Simulated email
        console.log("");
        console.log("[SIMULATED EMAIL]");
        console.log(`To: ${email}`);
        console.log(`OTP: ${otp}`);
        console.log(`Challenge ID: ${challengeId}`);
        console.log("");

        // 13. Return only challengeId
        res.status(201).json({
            message: "Registration successful. OTP sent to email.",
            challengeId: challengeId,
            expiresAt: expiresAt.toISOString()
        });

    } catch (error) {
        console.error("Registration error:", error);

        res.status(500).json({
            message: "Server error during registration"
        });
    }
});

router.post("/verify-email-otp", async (req, res) => {
    try {
        const { challengeId, otp } = req.body;

        // 1. Check required fields
        if (!challengeId || !otp) {
            return res.status(400).json({
                message: "Challenge ID and OTP are required"
            });
        }

        // 2. Find the OTP challenge
        const [challenges] = await pool.execute(
            `SELECT *
             FROM otp_challenges
             WHERE challenge_id = ?
             AND channel = 'email'`,
            [challengeId]
        );

        if (challenges.length === 0) {
            return res.status(404).json({
                message: "OTP challenge not found"
            });
        }

        const challenge = challenges[0];

        // 3. Check if OTP was already used
        if (challenge.used) {
            return res.status(400).json({
                message: "This OTP has already been used"
            });
        }

        // 4. Check maximum attempts
        if (challenge.attempts >= 3) {
            return res.status(429).json({
                message: "Maximum attempts exceeded. Please request a new OTP."
            });
        }

        // 5. Check expiry
        const currentTime = new Date();
        const expiryTime = new Date(challenge.expires_at);

        if (currentTime > expiryTime) {
            return res.status(410).json({
                message: "This OTP has expired"
            });
        }

        // 6. Compare entered OTP with stored hash
        const isOtpCorrect = await bcrypt.compare(
            otp,
            challenge.otp_hash
        );

        // 7. Wrong OTP
        if (!isOtpCorrect) {

    const newAttempts =
        challenge.attempts + 1;


    /* =========================
       MAXIMUM ATTEMPTS
    ========================= */

    if (newAttempts >= 3) {

        await pool.execute(
            `UPDATE otp_challenges
             SET attempts = ?,
                 used = TRUE,
                 expires_at = NOW()
             WHERE challenge_id = ?`,
            [newAttempts, challengeId]
        );

        return res.status(401).json({
            message:
                "Maximum attempts reached. Please request a new OTP.",
            remainingAttempts: 0
        });
    }


    /* =========================
       NORMAL WRONG OTP
    ========================= */

    await pool.execute(
        `UPDATE otp_challenges
         SET attempts = ?
         WHERE challenge_id = ?`,
        [newAttempts, challengeId]
    );

    const remainingAttempts =
        3 - newAttempts;

    return res.status(401).json({
        message: "Incorrect OTP",
        remainingAttempts: remainingAttempts
    });
}

        // 8. Correct OTP
        await pool.execute(
            `UPDATE otp_challenges
             SET used = TRUE
             WHERE challenge_id = ?`,
            [challengeId]
        );

        // 9. Mark user's email as verified
        await pool.execute(
            `UPDATE users
             SET email_verified = TRUE
             WHERE id = ?`,
            [challenge.user_id]
        );

        // 10. Success response
        res.status(200).json({
            message: "Email verified successfully"
        });

    } catch (error) {

        console.error("Email OTP verification error:", error);

        res.status(500).json({
            message: "Server error during email verification"
        });
    }
});

router.post("/resend-email-otp", async (req, res) => {
    try {
        const { challengeId } = req.body;

        if (!challengeId) {
            return res.status(400).json({
                message: "Challenge ID is required"
            });
        }

        const [challenges] = await pool.execute(
            `SELECT *
             FROM otp_challenges
             WHERE challenge_id = ?
             AND channel = 'email'`,
            [challengeId]
        );

        if (challenges.length === 0) {
            return res.status(404).json({
                message: "OTP challenge not found"
            });
        }

        const challenge = challenges[0];

        const otp = crypto.randomInt(100000, 1000000).toString();
        const otpHash = await bcrypt.hash(otp, 10);
        const newChallengeId = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 2 * 60 * 1000);

        await pool.execute(
            `INSERT INTO otp_challenges
            (challenge_id, user_id, channel, otp_hash, expires_at, attempts, used)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                newChallengeId,
                challenge.user_id,
                "email",
                otpHash,
                expiresAt,
                0,
                false
            ]
        );

        console.log("");
        console.log("[SIMULATED EMAIL - RESEND]");
        console.log(`To: user email`);
        console.log(`OTP: ${otp}`);
        console.log(`Challenge ID: ${newChallengeId}`);
        console.log("");

        res.status(200).json({
            message: "A new OTP has been sent.",
            challengeId: newChallengeId,
            expiresAt: expiresAt.toISOString()
        });

    } catch (error) {
        console.error("Resend OTP error:", error);

        res.status(500).json({
            message: "Server error while resending OTP"
        });
    }
});

router.post("/send-sms-otp", async (req, res) => {
    try {
        const { challengeId } = req.body;

        if (!challengeId) {
            return res.status(400).json({
                message: "Challenge ID is required"
            });
        }

        const [challenges] = await pool.execute(
            `SELECT *
             FROM otp_challenges
             WHERE challenge_id = ?
             AND channel = 'email'`,
            [challengeId]
        );

        if (challenges.length === 0) {
            return res.status(404).json({
                message: "Email verification challenge not found"
            });
        }

        const challenge = challenges[0];

        const [users] = await pool.execute(
            `SELECT id, phone
             FROM users
             WHERE id = ?`,
            [challenge.user_id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        const user = users[0];

        const otp = crypto.randomInt(100000, 1000000).toString();
        const otpHash = await bcrypt.hash(otp, 10);
        const smsChallengeId = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 2 * 60 * 1000);

        await pool.execute(
            `INSERT INTO otp_challenges
            (challenge_id, user_id, channel, otp_hash, expires_at, attempts, used)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                smsChallengeId,
                user.id,
                "sms",
                otpHash,
                expiresAt,
                0,
                false
            ]
        );

        console.log("");
        console.log("[SIMULATED SMS]");
        console.log(`To: ${user.phone}`);
        console.log(`OTP: ${otp}`);
        console.log(`Challenge ID: ${smsChallengeId}`);
        console.log("");

        res.status(200).json({
            message: "SMS OTP sent successfully.",
            challengeId: smsChallengeId,
            expiresAt: expiresAt.toISOString()
        });

    } catch (error) {
        console.error("Send SMS OTP error:", error);

        res.status(500).json({
            message: "Server error while sending SMS OTP"
        });
    }
});

router.post("/verify-sms-otp", async (req, res) => {
    try {
        const { challengeId, otp } = req.body;

        if (!challengeId || !otp) {
            return res.status(400).json({
                message: "Challenge ID and OTP are required"
            });
        }

        const [challenges] = await pool.execute(
            `SELECT *
             FROM otp_challenges
             WHERE challenge_id = ?
             AND channel = 'sms'`,
            [challengeId]
        );

        if (challenges.length === 0) {
            return res.status(404).json({
                message: "SMS OTP challenge not found"
            });
        }

        const challenge = challenges[0];

        if (challenge.used) {
            return res.status(400).json({
                message: "This OTP has already been used"
            });
        }

        if (challenge.attempts >= 3) {
            return res.status(429).json({
                message: "Maximum attempts exceeded. Please request a new OTP."
            });
        }

        const currentTime = new Date();
        const expiryTime = new Date(challenge.expires_at);

        if (currentTime > expiryTime) {
            return res.status(410).json({
                message: "This OTP has expired"
            });
        }

        const isOtpCorrect = await bcrypt.compare(
            otp,
            challenge.otp_hash
        );

        if (!isOtpCorrect) {

    const newAttempts =
        challenge.attempts + 1;


    /* =========================
       MAXIMUM ATTEMPTS
    ========================= */

    if (newAttempts >= 3) {

        await pool.execute(
            `UPDATE otp_challenges
             SET attempts = ?,
                 used = TRUE,
                 expires_at = NOW()
             WHERE challenge_id = ?`,
            [newAttempts, challengeId]
        );

        return res.status(401).json({
            message: "Maximum attempts reached. Please request a new OTP.",
            remainingAttempts: 0
        });
    }


    /* =========================
       NORMAL WRONG OTP
    ========================= */

    await pool.execute(
        `UPDATE otp_challenges
         SET attempts = ?
         WHERE challenge_id = ?`,
        [newAttempts, challengeId]
    );

    const remainingAttempts =
        3 - newAttempts;

    return res.status(401).json({
        message: "Incorrect OTP",
        remainingAttempts: remainingAttempts
    });
}

        await pool.execute(
            `UPDATE otp_challenges
             SET used = TRUE
             WHERE challenge_id = ?`,
            [challengeId]
        );

        await pool.execute(
            `UPDATE users
             SET mfa_enabled = TRUE
             WHERE id = ?`,
            [challenge.user_id]
        );

        res.status(200).json({
            message: "SMS verified successfully. MFA enabled."
        });

    } catch (error) {
        console.error("SMS OTP verification error:", error);

        res.status(500).json({
            message: "Server error during SMS verification"
        });
    }
});

module.exports = router;