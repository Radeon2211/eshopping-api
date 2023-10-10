const brevo = require('@getbrevo/brevo');
const { isTestingMode } = require('../shared/utility');

const defaultClient = brevo.ApiClient.instance;
defaultClient.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;

const apiInstance = new brevo.TransactionalEmailsApi();

const sender = {
  email: 'eshopping-app@wp.pl',
};

const blockSendingEmail = isTestingMode();

const sendAccountVerificationEmail = async (email, username, verificationLink) => {
  if (blockSendingEmail) return;
  const sendSmtpEmail = new brevo.SendSmtpEmail();
  sendSmtpEmail.to = [
    {
      email,
    },
  ];
  sendSmtpEmail.sender = sender;
  sendSmtpEmail.params = {
    username,
    verificationLink,
    websiteURL: process.env.FRONTEND_URL,
  };
  sendSmtpEmail.templateId = 3;
  await apiInstance.sendTransacEmail(sendSmtpEmail);
};

const sendResetPasswordVerificationEmail = async (email, verificationLink) => {
  if (blockSendingEmail) return;
  const sendSmtpEmail = new brevo.SendSmtpEmail();
  sendSmtpEmail.to = [
    {
      email,
    },
  ];
  sendSmtpEmail.sender = sender;
  sendSmtpEmail.params = {
    verificationLink,
  };
  sendSmtpEmail.templateId = 4;
  await apiInstance.sendTransacEmail(sendSmtpEmail);
};

const sendNewPasswordEmail = async (email, newPassword) => {
  if (blockSendingEmail) return;
  const sendSmtpEmail = new brevo.SendSmtpEmail();
  sendSmtpEmail.to = [
    {
      email,
    },
  ];
  sendSmtpEmail.sender = sender;
  sendSmtpEmail.params = {
    newPassword,
  };
  sendSmtpEmail.templateId = 5;
  await apiInstance.sendTransacEmail(sendSmtpEmail);
};

const sendChangeEmailVerificationEmail = async (email, verificationLink) => {
  if (blockSendingEmail) return;
  const sendSmtpEmail = new brevo.SendSmtpEmail();
  sendSmtpEmail.to = [
    {
      email,
    },
  ];
  sendSmtpEmail.sender = sender;
  sendSmtpEmail.params = {
    verificationLink,
  };
  sendSmtpEmail.templateId = 1;
  await apiInstance.sendTransacEmail(sendSmtpEmail);
};

module.exports = {
  sendAccountVerificationEmail,
  sendResetPasswordVerificationEmail,
  sendNewPasswordEmail,
  sendChangeEmailVerificationEmail,
};
