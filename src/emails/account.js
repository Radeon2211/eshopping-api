const sgMail = require('@sendgrid/mail');
const { isTestingMode } = require('../shared/utility');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sender = 'eshopping-app@wp.pl';

const emailTemplates = {
  ACCOUNT_VERIFICATION: 'd-4ca9c74361564fa49829c72c5d157ee2',
  RESET_PASSWORD_VERIFICATION: 'd-11a9e7ce91cc4589a47a6f79025cf448',
  NEW_PASSWORD: 'd-d00db33ea528414998b826cb5dc77d56',
  CHANGE_EMAIL_VERIFICATION: 'd-7d32c6c485364807933c14cf78fba02d',
};

const sendAccountVerificationEmail = async (email, username, verificationLink) => {
  if (isTestingMode()) return;
  await sgMail.send({
    to: email,
    from: sender,
    templateId: emailTemplates.ACCOUNT_VERIFICATION,
    dynamicTemplateData: {
      username,
      verificationLink,
      websiteURL: process.env.FRONTEND_URL,
    },
  });
};

const sendResetPasswordVerificationEmail = async (email, verificationLink) => {
  if (isTestingMode()) return;
  await sgMail.send({
    to: email,
    from: sender,
    templateId: emailTemplates.RESET_PASSWORD_VERIFICATION,
    dynamicTemplateData: {
      verificationLink,
    },
  });
};

const sendNewPasswordEmail = async (email, newPassword) => {
  if (isTestingMode()) return;
  await sgMail.send({
    to: email,
    from: sender,
    templateId: emailTemplates.NEW_PASSWORD,
    dynamicTemplateData: {
      newPassword,
    },
  });
};

const sendChangeEmailVerificationEmail = async (email, verificationLink) => {
  if (isTestingMode()) return;
  await sgMail.send({
    to: email,
    from: sender,
    templateId: emailTemplates.CHANGE_EMAIL_VERIFICATION,
    dynamicTemplateData: {
      verificationLink,
    },
  });
};

module.exports = {
  sendAccountVerificationEmail,
  sendResetPasswordVerificationEmail,
  sendNewPasswordEmail,
  sendChangeEmailVerificationEmail,
};
