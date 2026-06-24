import { SendEmailCommand, SESv2Client } from "@aws-sdk/client-sesv2";

const AWS_REGION = process.env.AWS_REGION || "ap-southeast-1";
const FROM_EMAIL = process.env.AWS_SES_FROM_EMAIL || "";
const FROM_NAME = process.env.AWS_SES_FROM_NAME || "Duetto";
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || "";
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || "";
const AWS_SESSION_TOKEN = process.env.AWS_SESSION_TOKEN || "";

const hasAwsEnvCredentials = Boolean(AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY);

const sesClient = new SESv2Client({
  region: AWS_REGION,
  ...(hasAwsEnvCredentials
    ? {
        credentials: {
          accessKeyId: AWS_ACCESS_KEY_ID,
          secretAccessKey: AWS_SECRET_ACCESS_KEY,
          ...(AWS_SESSION_TOKEN ? { sessionToken: AWS_SESSION_TOKEN } : {})
        }
      }
    : {})
});

function senderAddress() {
  return `${FROM_NAME} <${FROM_EMAIL}>`;
}

function shouldUseEmailFallback() {
  return !FROM_EMAIL || process.env.EMAIL_PROVIDER === "console";
}

function logFallbackEmail(params: { to: string; subject: string; text: string }) {
  console.log(`[EMAIL:FALLBACK] To=${params.to} Subject=${params.subject}`);
  console.log(params.text);
}

function shouldFallbackOnSesError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.name === "CredentialsProviderError" ||
    error.name === "InvalidClientTokenId" ||
    error.name === "SignatureDoesNotMatch"
  );
}

async function sendEmail(params: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  if (shouldUseEmailFallback()) {
    logFallbackEmail(params);
    return;
  }

  if (!hasAwsEnvCredentials) {
    if (process.env.EMAIL_PROVIDER_FALLBACK === "console") {
      console.warn("[EMAIL] Missing AWS env credentials. Falling back to console output.");
      logFallbackEmail(params);
      return;
    }

    throw new Error(
      "Missing AWS credentials in env. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY (and AWS_SESSION_TOKEN if needed)."
    );
  }

  try {
    await sesClient.send(
      new SendEmailCommand({
        FromEmailAddress: senderAddress(),
        Destination: { ToAddresses: [params.to] },
        Content: {
          Simple: {
            Subject: { Data: params.subject, Charset: "UTF-8" },
            Body: {
              Text: { Data: params.text, Charset: "UTF-8" },
              Html: { Data: params.html, Charset: "UTF-8" }
            }
          }
        }
      })
    );
  } catch (error) {
    if (shouldFallbackOnSesError(error) || process.env.EMAIL_PROVIDER_FALLBACK === "console") {
      console.warn("[EMAIL] SES unavailable. Falling back to console output.", error);
      logFallbackEmail(params);
      return;
    }

    throw error;
  }
}

export async function sendVerificationEmail(
  email: string,
  verificationCode: string,
  verificationLink?: string
): Promise<void> {
  const subject = "Verify Your Duetto Account";
  const text = [
    "Welcome to Duetto!",
    `Your verification code is: ${verificationCode}`,
    verificationLink ? `Verification link: ${verificationLink}` : ""
  ]
    .filter(Boolean)
    .join("\n");
  const html = `
    <h2>Welcome to Duetto</h2>
    <p>Your verification code is:</p>
    <p style="font-size:24px;font-weight:700;letter-spacing:2px;">${verificationCode}</p>
    ${verificationLink ? `<p><a href="${verificationLink}">Verify your email</a></p>` : ""}
  `;

  await sendEmail({ to: email, subject, text, html });
}

export async function sendPasswordResetEmail(
  email: string,
  resetCode: string,
  resetLink?: string
): Promise<void> {
  const subject = "Reset Your Duetto Password";
  const text = [
    "We received a password reset request.",
    `Your reset code is: ${resetCode}`,
    resetLink ? `Reset link: ${resetLink}` : ""
  ]
    .filter(Boolean)
    .join("\n");
  const html = `
    <h2>Password Reset Request</h2>
    <p>Your reset code is:</p>
    <p style="font-size:24px;font-weight:700;letter-spacing:2px;">${resetCode}</p>
    ${resetLink ? `<p><a href="${resetLink}">Reset password</a></p>` : ""}
  `;

  await sendEmail({ to: email, subject, text, html });
}

export async function sendWelcomeEmail(email: string, name: string): Promise<void> {
  const subject = "Welcome to Duetto";
  const text = `Hi ${name}, welcome to Duetto. Your account is now active.`;
  const html = `
    <h2>Welcome, ${name}!</h2>
    <p>Your Duetto account is now active. Start exploring challenges and progress today.</p>
  `;

  await sendEmail({ to: email, subject, text, html });
}

export async function sendWeeklyProgressEmail(params: {
  email: string;
  name: string;
  summary: string;
}): Promise<void> {
  const subject = "Your Weekly Duetto Progress";
  const text = `Hi ${params.name},\n\n${params.summary}`;
  const html = `
    <h2>Weekly Progress</h2>
    <p>Hi ${params.name},</p>
    <p>${params.summary}</p>
  `;

  await sendEmail({ to: params.email, subject, text, html });
}
