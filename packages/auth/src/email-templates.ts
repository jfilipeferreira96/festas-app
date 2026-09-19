/**
 * Email Templates - layout profissional consistente para todos os templates.
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

// Verificação de email
export const createVerificationEmailHTML = (user: { name: string | null; email: string }, verificationUrl: string) => {
  const userName = user?.name || "utilizador";

  return `
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <title>Verifique o seu endereço de email</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="title">Verifique o seu endereço de email</h1>
    </div>
    <p class="text">Olá ${userName},</p>
    <p class="text">
      Obrigado pelo seu registo! Para concluir o registo, confirme o seu endereço de email clicando no botão abaixo.
    </p>
    <p style="text-align: center; margin: 30px 0;">
      <a href="${verificationUrl}" class="button">Verificar email</a>
    </p>
    <p class="text">
      Se não criou uma conta connosco, pode ignorar esta mensagem.
    </p>
    <div class="footer">
      Este link de verificação expira em 24 horas.<br>
      © ${new Date().getFullYear()} Baselandia. Todos os direitos reservados.
    </div>
  </div>
</body>
</html>
`;
};

// Boas-vindas
export const createWelcomeEmailHTML = (user: { name: string | null; email: string }) => {
  const userName = user?.name || "utilizador";

  return `
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <title>Bem-vindo à nossa plataforma</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="title">Bem-vindo!</h1>
    </div>
    <p class="text">Olá ${userName},</p>
    <p class="text">
      A sua conta foi criada com sucesso e já pode começar a utilizar a plataforma.
    </p>
    <p class="text">
      Se tiver alguma questão, não hesite em contactar a equipa de apoio.
    </p>
    <div class="footer">
      Bem-vindo à equipa.<br>
      © ${new Date().getFullYear()} Baselandia. Todos os direitos reservados.
    </div>
  </div>
</body>
</html>
`;
};

// Recuperação de palavra-passe
export const createPasswordResetEmailHTML = (user: { name: string | null; email: string }, resetUrl: string) => {
  const userName = user?.name || "utilizador";

  return `
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <title>Recuperar palavra-passe</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="title">Recuperar palavra-passe</h1>
    </div>
    <p class="text">Olá ${userName},</p>
    <p class="text">
      Recebemos um pedido para recuperar a sua palavra-passe. Clique no botão abaixo para definir uma nova.
    </p>
    <p style="text-align: center; margin: 30px 0;">
      <a href="${resetUrl}" class="button" style="background-color:#dc2626;">Definir nova palavra-passe</a>
    </p>
    <p class="text">
      Se não fez este pedido, pode ignorar este email.
    </p>
    <div class="footer">
      Este link expira em 1 hora.<br>
      © ${new Date().getFullYear()} Baselandia. Todos os direitos reservados.
    </div>
  </div>
</body>
</html>
`;
};

// Convite de organização
export const createOrganizationInvitationEmailHTML = (params: { invitedEmail: string; invitedByUsername: string; invitedByEmail: string; teamName: string; inviteLink: string }) => {
  const { invitedEmail, invitedByUsername, invitedByEmail, teamName, inviteLink } = params;

  return `
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <title>Convite para ${teamName}</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="title">Convite para ${teamName}</h1>
    </div>
    <p class="text">Olá,</p>
    <p class="text">
      <strong>${invitedByUsername}</strong> (<a href="mailto:${invitedByEmail}" style="color:#2563eb; text-decoration:none;">${invitedByEmail}</a>)
      convidou-o(a) para fazer parte da organização <strong>${teamName}</strong>.
    </p>
    <p class="text">
      Clique no botão abaixo para aceitar o convite:
    </p>
    <p style="text-align: center; margin: 30px 0;">
      <a href="${inviteLink}" class="button">Aceitar convite</a>
    </p>
    <p class="text">
      Se não pretende aceitar ou considera que este email foi enviado por engano, pode ignorá-lo.
    </p>
    <div class="footer">
      Este convite expira em 7 dias.<br>
      © ${new Date().getFullYear()} ${teamName}. Todos os direitos reservados.
    </div>
  </div>
</body>
</html>
`;
};
