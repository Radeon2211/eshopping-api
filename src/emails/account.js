const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sender = 'eshopping-app@wp.pl';

const sendAccountVerificationEmail = async (email, username, verificationLink) => {
  await sgMail.send({
    to: email,
    from: sender,
    templateId: 'd-4ca9c74361564fa49829c72c5d157ee2',
    dynamicTemplateData: {
      username,
      verificationLink,
      websiteURL: process.env.FRONTEND_URL,
    },
  });
};

const sendResetPasswordVerificationEmail = async (email, verificationLink) => {
  await sgMail.send({
    to: email,
    from: sender,
    templateId: 'd-11a9e7ce91cc4589a47a6f79025cf448',
    dynamicTemplateData: {
      verificationLink,
    },
  });
};

const sendNewPasswordEmail = async (email, newPassword) => {
  await sgMail.send({
    to: email,
    from: sender,
    templateId: 'd-d00db33ea528414998b826cb5dc77d56',
    dynamicTemplateData: {
      newPassword,
    },
  });
};

const sendChangeEmailVerificationEmail = async (email, verificationLink) => {
  await sgMail.send({
    to: email,
    from: sender,
    templateId: 'd-7d32c6c485364807933c14cf78fba02d',
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
