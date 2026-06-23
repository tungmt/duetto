// Email service for sending verification emails
// This is a placeholder that can be replaced with actual email service (SendGrid, AWS SES, etc.)

export async function sendVerificationEmail(
  email: string,
  verificationCode: string,
  verificationLink?: string
): Promise<void> {
  // TODO: Implement actual email sending with service like SendGrid, AWS SES, or Resend
  // For now, just log the code
  console.log(`[EMAIL] Verification code for ${email}: ${verificationCode}`);
  if (verificationLink) {
    console.log(`[EMAIL] Verification link: ${verificationLink}`);
  }
}

export async function sendPasswordResetEmail(
  email: string,
  resetCode: string,
  resetLink?: string
): Promise<void> {
  // TODO: Implement actual email sending
  console.log(`[EMAIL] Password reset code for ${email}: ${resetCode}`);
  if (resetLink) {
    console.log(`[EMAIL] Reset link: ${resetLink}`);
  }
}

export async function sendWelcomeEmail(email: string, name: string): Promise<void> {
  // TODO: Implement actual email sending
  console.log(`[EMAIL] Welcome email sent to ${email} (${name})`);
}
