const passwordInput = document.getElementById("password");

const lengthRequirement = document.getElementById("lengthRequirement");
const uppercaseRequirement = document.getElementById("uppercaseRequirement");
const numberRequirement = document.getElementById("numberRequirement");
const specialRequirement = document.getElementById("specialRequirement");


passwordInput.addEventListener("input", () => {

    const password = passwordInput.value;

    const hasLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);

    updateRequirement(lengthRequirement, hasLength);
    updateRequirement(uppercaseRequirement, hasUppercase);
    updateRequirement(numberRequirement, hasNumber);
    updateRequirement(specialRequirement, hasSpecial);
});


function updateRequirement(element, isValid) {

    const icon = element.querySelector("i");

    if (isValid) {
        icon.style.color = "#35b87b";
    } else {
        icon.style.color = "#d1d5db";
    }
}

updateRequirement(lengthRequirement, false);
updateRequirement(uppercaseRequirement, false);
updateRequirement(numberRequirement, false);
updateRequirement(specialRequirement, false);

const togglePassword = document.getElementById("togglePassword");

togglePassword.addEventListener("click", () => {

    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        togglePassword.innerHTML = '<i class="fa-regular fa-eye-slash"></i>';
    } else {
        passwordInput.type = "password";
        togglePassword.innerHTML = '<i class="fa-regular fa-eye"></i>';
    }

});

const registrationForm = document.getElementById("registrationForm");

const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const phoneInput = document.getElementById("phone");
const termsCheckbox = document.getElementById("terms");
const message = document.getElementById("message");

const registrationCard = document.querySelector(".registration-card");
const emailOtpScreen = document.getElementById("emailOtpScreen");
const otpEmail = document.getElementById("otpEmail");

registrationForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const phone = phoneInput.value.trim();
    const password = passwordInput.value;

    // Clear previous message
    message.textContent = "";
    message.style.color = "";

    // 1. Check name
    if (name.length < 2) {
        message.textContent = "Please enter your full name.";
        message.style.color = "red";
        return;
    }

    // 2. Check email
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
        message.textContent = "Please enter a valid email address.";
        message.style.color = "red";
        return;
    }

    // 3. Check phone
    const phonePattern = /^[0-9]{10}$/;

    if (!phonePattern.test(phone)) {
        message.textContent = "Please enter a valid 10-digit phone number.";
        message.style.color = "red";
        return;
    }

    // 4. Check password requirements
    const hasLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);

    if (!hasLength || !hasUppercase || !hasNumber || !hasSpecial) {
        message.textContent = "Password does not meet all requirements.";
        message.style.color = "red";
        return;
    }

    // 5. Check terms
    if (!termsCheckbox.checked) {
        message.textContent = "Please agree to the Terms & Conditions.";
        message.style.color = "red";
        return;
    }

    // All validation passed
message.textContent = "Creating your account...";
message.style.color = "#2440dc";

try {

    const response = await fetch("http://localhost:5000/api/register", {
        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({
            name: name,
            email: email,
            phone: phone,
            password: password
        })
    });

    const data = await response.json();

    if (!response.ok) {
        message.textContent = data.message || "Registration failed.";
        message.style.color = "red";
        return;
    }

   console.log("Registration response:", data);

   console.log("Challenge ID:", data.challengeId);
   console.log("OTP expires at:", data.expiresAt);

// Save challenge ID for OTP verification
sessionStorage.setItem("challengeId", data.challengeId);
sessionStorage.setItem("otpExpiresAt", data.expiresAt);

    // Show the email used for registration
    otpEmail.textContent = email;

    registrationForm.style.display = "none";
document.querySelector(".login-text").style.display = "none";
document.querySelector("footer").style.display = "none";

document.querySelector(".header").style.display = "none";
document.querySelector(".registration-card > .progress-container").style.display = "none";
document.querySelector(".title-section").style.display = "none";

    // Show Email OTP screen
    emailOtpScreen.style.display = "block";

    // Activate OTP card layout
    registrationCard.classList.add("otp-active");

    // Start OTP countdown timers
    startOtpTimers();

} catch (error) {

    console.error("Registration error:", error);

    message.textContent =
        "Unable to connect to the server. Please try again.";

    message.style.color = "red";
}

});

// =========================
// EMAIL OTP INPUT
// =========================

const otpInputs = document.querySelectorAll(".otp-input");

otpInputs.forEach((input, index) => {

    // Allow only numbers
    input.addEventListener("input", () => {

        input.value = input.value.replace(/[^0-9]/g, "");

        // Move to next box
        if (input.value && index < otpInputs.length - 1) {
            otpInputs[index + 1].focus();
        }

        // Check when all 6 digits are entered
        const otp = Array.from(otpInputs)
            .map(input => input.value)
            .join("");

        if (otp.length === 6) {
            verifyEmailOTP(otp);
        }
    });


    // Backspace → previous box
    input.addEventListener("keydown", (event) => {

        if (
            event.key === "Backspace" &&
            !input.value &&
            index > 0
        ) {
            otpInputs[index - 1].focus();
        }
    });

});

async function verifyEmailOTP(otp) {

    const otpMessage =
        document.getElementById("otpMessage");

    const resendTimer =
        document.getElementById("resendTimer");

    const otpInputs =
        document.querySelectorAll(".otp-input");

    const otpExpiry =
        document.querySelector(
            "#emailOtpScreen .otp-expiry"
        );

    const otpIcon =
        document.querySelector(".otp-icon");


    otpMessage.textContent = "Verifying...";
    otpMessage.style.color = "#e53935";


    const challengeId =
        sessionStorage.getItem("challengeId");


    try {

        const response = await fetch(
            "http://localhost:5000/api/verify-email-otp",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    challengeId: challengeId,
                    otp: otp
                })
            }
        );


        const data =
            await response.json();


        console.log(
            "OTP verification response:",
            data
        );


        /* =========================
           WRONG / EXPIRED OTP
        ========================= */

        if (!response.ok) {


            /* =========================
               MAXIMUM ATTEMPTS
            ========================= */

            if (
                response.status === 401 &&
                data.remainingAttempts === 0
            ) {

                /* Stop email OTP timer */

                clearInterval(otpCountdown);


                /* Hide expiry timer */

                otpExpiry.style.display =
                    "none";


                /* Maximum attempts message */

                otpMessage.innerHTML =
                    "Maximum attempts reached.<br>" +
                    "<span>Please request a new code.</span>";


                otpMessage.classList.remove(
                    "otp-error-message"
                );

                otpMessage.classList.remove(
                    "otp-expired-message"
                );

                otpMessage.classList.add(
                    "otp-max-attempt-message"
                );


                /* Red email icon */

                otpIcon.classList.add(
                    "otp-error-icon"
                );


                /* Disable OTP inputs */

                otpInputs.forEach(input => {

                    input.disabled = true;

                    input.classList.remove(
                        "otp-error"
                    );

                    input.classList.add(
                        "otp-expired"
                    );

                });


                /* Show Resend New Code */

                resendTimer.textContent =
                    "Resend New Code";

                resendTimer.style.cursor =
                    "pointer";

                resendTimer.classList.add(
                    "resend-button"
                );


                return;
            }


            /* =========================
               1ST / 2ND WRONG ATTEMPT
            ========================= */

            if (response.status === 401) {

                otpMessage.innerHTML =
                    "Incorrect code. Please try again.<br>" +
                    "<span>You have " +
                    data.remainingAttempts +
                    " attempts left.</span>";


                otpMessage.classList.remove(
                    "otp-max-attempt-message"
                );

                otpMessage.classList.remove(
                    "otp-expired-message"
                );

                otpMessage.classList.add(
                    "otp-error-message"
                );


                /* Red email icon */

                otpIcon.classList.add(
                    "otp-error-icon"
                );


                /* Last OTP box red */

                const lastOtpInput =
                    otpInputs[
                        otpInputs.length - 1
                    ];

                lastOtpInput.classList.add(
                    "otp-error"
                );


                return;
            }


            console.error(
                "OTP verification failed:",
                data.message
            );

            return;
        }


        /* =========================
           CORRECT OTP
        ========================= */

        otpMessage.textContent =
            "Email verified successfully!";

        otpMessage.style.color =
            "#35b87b";


        otpMessage.classList.remove(
            "otp-error-message"
        );

        otpMessage.classList.remove(
            "otp-max-attempt-message"
        );

        otpMessage.classList.remove(
            "otp-expired-message"
        );


        otpIcon.classList.remove(
            "otp-error-icon"
        );

        otpIcon.classList.remove(
            "otp-expired-icon"
        );


        otpInputs.forEach(input => {

            input.classList.remove(
                "otp-error"
            );

            input.classList.remove(
                "otp-expired"
            );

        });


        console.log(
            "Email verification successful!"
        );


        setTimeout(() => {

            sendSmsOTP();

        }, 1000);


    } catch (error) {

        console.error(
            "OTP verification error:",
            error
        );


        otpMessage.textContent =
            "Unable to connect to the server.";

        otpMessage.style.color =
            "red";
    }
}

// =========================
// OTP COUNTDOWN TIMERS
// =========================


let otpCountdown;
let resendCountdown;

function startOtpTimers() {

    const otpTimer =
        document.getElementById("otpTimer");

    const resendTimer =
        document.getElementById("resendTimer");

    const otpExpiry =
        document.querySelector(
            "#emailOtpScreen .otp-expiry"
        );

    const expiresAt =
        new Date(
            sessionStorage.getItem("otpExpiresAt")
        ).getTime();

    let resendTime = 25;

    clearInterval(otpCountdown);
    clearInterval(resendCountdown);


    /* =========================
       SHOW TIMER AGAIN
       FOR NEW OTP
    ========================= */

    otpExpiry.style.display = "block";


    function updateOtpTimer() {

        const remaining =
            Math.max(
                0,
                expiresAt - Date.now()
            );

        const totalSeconds =
            Math.floor(remaining / 1000);

        const minutes =
            Math.floor(totalSeconds / 60);

        const seconds =
            totalSeconds % 60;


        otpTimer.textContent =
            `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;


        /* =========================
           EMAIL OTP EXPIRED
        ========================= */

        if (remaining <= 0) {

            clearInterval(otpCountdown);

            otpTimer.textContent = "00:00";


            /* Hide expiry timer */

            otpExpiry.style.display = "none";


            /* Show expired message */

            const otpMessage =
                document.getElementById("otpMessage");

            otpMessage.textContent =
                "This code has expired.";

            otpMessage.style.color = "#e53935";

            otpMessage.style.display = "block";

            otpMessage.classList.add(
                "otp-expired-message"
            );


            /* Red email icon */

            document
                .querySelector(".otp-icon")
                .classList.add(
                    "otp-expired-icon"
                );


            /* Disable OTP boxes */

            const otpInputs =
                document.querySelectorAll(
                    ".otp-input"
                );

            otpInputs.forEach(input => {

                input.disabled = true;

                input.classList.add(
                    "otp-expired"
                );

            });


            /* Show Resend New Code */

            resendTimer.textContent =
                "Resend New Code";

            resendTimer.style.cursor =
                "pointer";

            resendTimer.classList.add(
                "resend-button"
            );
        }
    }


    updateOtpTimer();

    otpCountdown =
        setInterval(
            updateOtpTimer,
            1000
        );


    /* =========================
       RESEND COUNTDOWN
    ========================= */

    resendCountdown =
        setInterval(() => {

            const minutes =
                Math.floor(
                    resendTime / 60
                );

            const seconds =
                resendTime % 60;


            resendTimer.textContent =
                `Resend code (${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")})`;


            if (resendTime <= 0) {

                clearInterval(
                    resendCountdown
                );

                resendTimer.textContent =
                    "Resend New Code";

                resendTimer.style.cursor =
                    "pointer";

                resendTimer.classList.add(
                    "resend-button"
                );
            }


            resendTime--;

        }, 1000);
}

const resendTimer = document.getElementById("resendTimer");

resendTimer.addEventListener("click", async () => {
    const currentText = resendTimer.textContent;

    // Don't allow resend while countdown is running
    if (!resendTimer.classList.contains("resend-button")) {
        return;
    }

    const challengeId = sessionStorage.getItem("challengeId");

    try {
        resendTimer.textContent = "Sending...";

        const response = await fetch(
            "http://localhost:5000/api/resend-email-otp",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    challengeId: challengeId
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            resendTimer.textContent = "(00:00)";
            return;
        }

        console.log("New OTP:", data);
        console.log("New Challenge ID:", data.challengeId);

        // Save the new challenge
        sessionStorage.setItem(
            "challengeId",
            data.challengeId
        );

        sessionStorage.setItem(
            "otpExpiresAt",
            data.expiresAt
        );

        // Clear old OTP
        otpInputs.forEach(input => {
            input.value = "";
            input.disabled = false;
            input.classList.remove("otp-error");
        });

        // Remove old error styling
        document
            .querySelector(".otp-icon")
            .classList.remove("otp-error-icon");

        const otpMessage =
            document.getElementById("otpMessage");

        otpMessage.textContent =
            "A new code has been sent.";

            otpMessage.classList.remove("otp-error-message");
            otpMessage.classList.remove("otp-expired-message");
            otpMessage.classList.remove("otp-max-attempt-message"); 

            otpMessage.style.color = "#35b87b";
    
        document
            .querySelector(".otp-icon")
            .classList.remove("otp-expired-icon");

        document
    .querySelector(".otp-icon")
    .classList.remove("otp-error-icon");

            otpInputs.forEach(input => {
                input.disabled = false;
                input.classList.remove("otp-expired");
});

        resendTimer.classList.remove("resend-button");
        resendTimer.style.cursor = "default";      


        // Restart both timers
        startOtpTimers();

        otpInputs[0].focus();

    } catch (error) {
        console.error("Resend OTP error:", error);

        resendTimer.textContent = "(00:00)";
    }
});

function startSmsTimer(expiresAt) {

    const timerElement =
        document.getElementById("smsOtpTimer");

        document
            .querySelector("#smsOtpScreen .otp-expiry")
            .style.display = "block";

    const smsOtpMessage =
        document.getElementById("smsOtpMessage");

    const smsOtpIcon =
        document.querySelector(".sms-otp-icon");

    const smsOtpInputs =
        document.querySelectorAll(".sms-otp-input");


    function updateTimer() {

        const remaining =
            new Date(expiresAt).getTime() - Date.now();


        /* =========================
           OTP EXPIRED
        ========================= */

        if (remaining <= 0) {

            timerElement.textContent = "00:00";

            document
                .querySelector("#smsOtpScreen .otp-expiry")
                .style.display = "none";

            clearInterval(startSmsTimer.interval);

            const smsOtpMessage =
                document.getElementById("smsOtpMessage");


            /* Show expired message */

            smsOtpMessage.textContent =
                "This code has expired.";

            smsOtpMessage.style.display = "block";

            smsOtpMessage.style.color =
                "#e53935";


            /* Make phone icon red */

            smsOtpIcon.classList.add(
                "sms-otp-error"
            );


            /* Disable OTP inputs */

            smsOtpInputs.forEach(input => {

                input.disabled = true;

            });

            return;
        }


        /* =========================
           COUNTDOWN
        ========================= */

        const totalSeconds =
            Math.floor(remaining / 1000);

        const minutes =
            Math.floor(totalSeconds / 60);

        const seconds =
            totalSeconds % 60;

        timerElement.textContent =
            `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }


    updateTimer();


    clearInterval(startSmsTimer.interval);

    startSmsTimer.interval =
        setInterval(updateTimer, 1000);
}

async function sendSmsOTP() {

    const emailChallengeId =
        sessionStorage.getItem("challengeId");

    try {

        console.log("Sending SMS OTP...");

        const response = await fetch(
            "http://localhost:5000/api/send-sms-otp",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    challengeId: emailChallengeId
                })
            }
        );

        const data = await response.json();

        console.log("SMS OTP response:", data);

        if (!response.ok) {
            console.error(
                "SMS OTP failed:",
                data.message
            );
            return;
        }

        // Save SMS challenge
        sessionStorage.setItem(
            "smsChallengeId",
            data.challengeId
        );

        sessionStorage.setItem(
            "smsOtpExpiresAt",
            data.expiresAt
        );
        startSmsTimer(data.expiresAt);

        startSmsResendTimer();

        // Find SMS screen
        const smsOtpScreen =
            document.getElementById("smsOtpScreen");

        const smsPhone =
            document.getElementById("smsPhone");

        // Check that HTML elements exist
        if (!smsOtpScreen) {
            console.error(
                "ERROR: smsOtpScreen not found in HTML"
            );
            return;
        }

        if (!smsPhone) {
            console.error(
                "ERROR: smsPhone not found in HTML"
            );
            return;
        }

        // Show phone number
        const phone =
    phoneInput.value.trim();

const countryCode =
    document.getElementById("countryCode").value;

const formattedPhone =
    phone.length === 10
        ? `${countryCode} ${phone.slice(0, 5)} ${phone.slice(5)}`
        : `${countryCode} ${phone}`;

smsPhone.textContent = formattedPhone;

        // Hide Email OTP
        emailOtpScreen.style.display = "none";

        // Show SMS OTP
        smsOtpScreen.style.display = "block";

        // Keep OTP card layout
        registrationCard.classList.add("otp-active");

        console.log("SMS OTP screen displayed!");

    } catch (error) {

        console.error(
            "SMS OTP error:",
            error
        );
    }
}

const smsOtpInputs =
    document.querySelectorAll(".sms-otp-input");

smsOtpInputs.forEach((input, index) => {

    input.addEventListener("input", () => {

        if (input.value.length === 1 && index < smsOtpInputs.length - 1) {

            smsOtpInputs[index + 1].focus();

        }

        if (index === smsOtpInputs.length - 1) {

            const otp =
                Array.from(smsOtpInputs)
                    .map(input => input.value)
                    .join("");

            if (otp.length === 6) {
                verifySmsOTP();
            }
        }

    });

});


async function verifySmsOTP() {

    const smsChallengeId =
        sessionStorage.getItem("smsChallengeId");

    const smsOtpInputs =
        document.querySelectorAll(".sms-otp-input");

    const otp =
        Array.from(smsOtpInputs)
            .map(input => input.value)
            .join("");

    try {

        const response = await fetch(
            "http://localhost:5000/api/verify-sms-otp",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    challengeId: smsChallengeId,
                    otp: otp
                })
            }
        );

        const data = await response.json();

        console.log("SMS verification response:", data);


        /* =========================
           WRONG / MAXIMUM ATTEMPTS
        ========================= */

        if (!response.ok) {

            const smsOtpMessage =
                document.getElementById("smsOtpMessage");

            const smsOtpMaxAttempt =
                document.getElementById("smsOtpMaxAttempt");

            const smsOtpIcon =
                document.querySelector(".sms-otp-icon");

            const lastOtpInput =
                smsOtpInputs[smsOtpInputs.length - 1];


            /* Clear previous messages */

            smsOtpMessage.style.display = "none";
            smsOtpMaxAttempt.style.display = "none";


            /* Make phone icon red */

            smsOtpIcon.classList.add("sms-otp-error");


            /* Make last OTP box red */

            lastOtpInput.classList.add("sms-otp-error");


            /* =========================
               3RD WRONG ATTEMPT
            ========================= */

            if (
                response.status === 401 &&
                data.remainingAttempts === 0
            ) {

                smsOtpMaxAttempt.innerHTML =
                    "Maximum attempts reached.<br>" +
                    "Please request a new code.";

                smsOtpMaxAttempt.style.display = "block";

                clearInterval(startSmsTimer.interval);

                document
                    .querySelector("#smsOtpScreen .otp-expiry")
                    .style.display = "none";

                return;
            }


            /* =========================
               1ST / 2ND WRONG ATTEMPT
            ========================= */

            if (response.status === 401) {

                smsOtpMessage.innerHTML =
                    "Incorrect code. Please try again.<br>" +
                    "You have " +
                    data.remainingAttempts +
                    " attempts left.";

                smsOtpMessage.style.display = "block";

                return;
            }


            console.error(
                "SMS verification failed:",
                data.message
            );

            return;
        }


        /* =========================
           CORRECT OTP
        ========================= */

        console.log("SMS verification successful!");

        document
            .querySelector(".registration-card")
            .style.display = "none";

        document
            .getElementById("smsOtpScreen")
            .style.display = "none";

        document
            .getElementById("mfaCompleteScreen")
            .style.display = "block";

        window.scrollTo(0, 0);


    } catch (error) {

        console.error(
            "SMS verification error:",
            error
        );

    }
}

function startSmsResendTimer() {

    const timerElement =
        document.getElementById("smsResendTimer");

    let remainingSeconds = 25;

    /* Reset normal resend appearance */

    timerElement.parentElement.childNodes[0].textContent = "Resend code ";

    timerElement.textContent = "(00:25)";
    timerElement.classList.remove("resend-button");
    timerElement.style.cursor = "default";


    function updateTimer() {

        const seconds =
            String(remainingSeconds).padStart(2, "0");

        timerElement.textContent =
            `(00:${seconds})`;


        /* =========================
           RESEND BUTTON AVAILABLE
        ========================= */

        if (remainingSeconds <= 0) {

    clearInterval(timer);

    /* Hide the original "Resend code" text */

    timerElement.parentElement.childNodes[0].textContent = "";

    timerElement.textContent =
        "Resend New Code";

    timerElement.classList.add(
        "resend-button"
    );

    timerElement.style.cursor =
        "pointer";

    return;
}

        remainingSeconds--;
    }


    updateTimer();


    const timer =
        setInterval(updateTimer, 1000);


    /* =========================
       RESEND NEW CODE CLICK
    ========================= */

    timerElement.onclick = async function () {

        if (
            !timerElement.classList.contains(
                "resend-button"
            )
        ) {
            return;
        }


        /* Clear old OTP */

        const smsOtpInputs =
            document.querySelectorAll(
                ".sms-otp-input"
            );

        smsOtpInputs.forEach(input => {

            input.value = "";
            input.disabled = false;
            input.classList.remove(
                "sms-otp-error"
            );

        });


        /* Remove old error states */

        document
            .querySelector(".sms-otp-icon")
            .classList.remove(
                "sms-otp-error"
            );


        document
            .getElementById("smsOtpMessage")
            .style.display = "none";


        document
            .getElementById("smsOtpMaxAttempt")
            .style.display = "none";


        /* Send a completely new OTP */

        await sendSmsOTP();
    };
}

document
    .getElementById("continueToSuccess")
    .addEventListener("click", function () {

        document
            .getElementById("mfaCompleteScreen")
            .style.display = "none";

        document
            .getElementById("registrationSuccessScreen")
            .style.display = "block";

        window.scrollTo(0, 0);
    });