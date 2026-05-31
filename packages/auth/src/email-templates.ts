/**
 * Email Templates – TailwindCSS-inspired professional layout
 * Consistent structure and styles across all templates.
 */

const baseStyles = `
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif;
    background-color: #f9fafb;
    color: #111827;
    margin: 0;
    padding: 40px 20px;
  }
  .container {
    max-width: 600px;
    margin: 0 auto;
    background: #ffffff;
    border-radius: 0.75rem;
    padding: 40px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.05);
    border: 1px solid #e5e7eb;
  }
  .header {
    border-bottom: 1px solid #e5e7eb;
    padding-bottom: 20px;
    margin-bottom: 30px;
    text-align: center;
  }
  .title {
    font-size: 22px;
    font-weight: 600;
    color: #111827;
    margin: 0;
  }
  .text {
    font-size: 16px;
    color: #374151;
    line-height: 1.6;
    margin-bottom: 20px;
  }
  .button {
    display: inline-block;
    background-color: #2563eb;
    color: #ffffff;
    text-decoration: none;
    font-weight: 600;
    padding: 12px 24px;
    border-radius: 0.5rem;
    text-align: center;
    transition: background-color 0.2s;
  }
  .button:hover {
    background-color: #1d4ed8;
  }
  .footer {
    font-size: 14px;
    color: #6b7280;
    text-align: center;
    margin-top: 40px;
    border-top: 1px solid #e5e7eb;
    padding-top: 20px;
  }
`;

// ✅ Email Verification
export const createVerificationEmailHTML = (user: { name: string | null; email: string }, verificationUrl: string) => {
  const userName = user?.name || "there";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Verify your email address</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="title">Verify Your Email Address</h1>
    </div>
    <p class="text">Hello ${userName},</p>
    <p class="text">
      Thank you for signing up! Please verify your email address to complete your registration.
    </p>
    <p style="text-align: center; margin: 30px 0;">
      <a href="${verificationUrl}" class="button">Verify Email</a>
    </p>
    <p class="text">
      If you didn’t create an account with us, you can safely ignore this message.
    </p>
    <div class="footer">
      This verification link expires in 24 hours.<br>
      © ${new Date().getFullYear()} Your Company. All rights reserved.
    </div>
  </div>
</body>
</html>
`;
};

// ✅ Welcome Email
export const createWelcomeEmailHTML = (user: { name: string | null; email: string }) => {
  const userName = user?.name || "there";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Welcome to Our Platform</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="title">Welcome to Our Platform</h1>
    </div>
    <p class="text">Hello ${userName},</p>
    <p class="text">
      Welcome aboard! We’re thrilled to have you as part of our community. Your account has been successfully created, and you’re all set to start using our platform.
    </p>
    <p class="text">
      Explore the features we’ve built to help you get the most out of your experience. If you have any questions, feel free to contact our support team.
    </p>
    <div class="footer">
      We’re glad to have you with us.<br>
      © ${new Date().getFullYear()} Your Company. All rights reserved.
    </div>
  </div>
</body>
</html>
`;
};

// ✅ Password Reset
export const createPasswordResetEmailHTML = (user: { name: string | null; email: string }, resetUrl: string) => {
  const userName = user?.name || "there";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Reset Your Password</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="title">Reset Your Password</h1>
    </div>
    <p class="text">Hello ${userName},</p>
    <p class="text">
      We received a request to reset your password. Click the button below to choose a new one.
    </p>
    <p style="text-align: center; margin: 30px 0;">
      <a href="${resetUrl}" class="button" style="background-color:#dc2626;">Reset Password</a>
    </p>
    <p class="text">
      If you didn’t request this password reset, you can safely ignore this email.
    </p>
    <div class="footer">
      This link will expire in 1 hour.<br>
      © ${new Date().getFullYear()} Your Company. All rights reserved.
    </div>
  </div>
</body>
</html>
`;
};

// ✅ Organization Invitation
export const createOrganizationInvitationEmailHTML = (params: { invitedEmail: string; invitedByUsername: string; invitedByEmail: string; teamName: string; inviteLink: string }) => {
  const { invitedEmail, invitedByUsername, invitedByEmail, teamName, inviteLink } = params;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invitation to Join ${teamName}</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="title">Invitation to Join ${teamName}</h1>
    </div>
    <p class="text">Hello,</p>
    <p class="text">
      <strong>${invitedByUsername}</strong> (<a href="mailto:${invitedByEmail}" style="color:#2563eb; text-decoration:none;">${invitedByEmail}</a>)
      has invited you to join the organization <strong>${teamName}</strong>.
    </p>
    <p class="text">
      Click the button below to accept the invitation and become part of the team:
    </p>
    <p style="text-align: center; margin: 30px 0;">
      <a href="${inviteLink}" class="button">Accept Invitation</a>
    </p>
    <p class="text">
      If you don’t want to join or believe this email was sent in error, you can safely ignore it.
    </p>
    <div class="footer">
      This invitation will expire in 7 days.<br>
      © ${new Date().getFullYear()} ${teamName}. All rights reserved.
    </div>
  </div>
</body>
</html>
`;
};
