# E-Shopping (API)

### Backend part of MERN E-Shopping app (frontend is [here](https://github.com/Radeon2211/eshopping-client))

I used JWT authentication with cookie stored in HttpOnly Cookie. App is prevented from parameter pollution, dirty user input and uses many rate limiters. Also I used libraries like [helmet](https://www.npmjs.com/package/helmet) and [csurf](https://www.npmjs.com/package/csurf).

After registration user must activate account by link sent via email. Emails are sent also to reset password and change email. For this I used Sendgrid.

#### Models:

- **orderModel**
- **productModel**
- **userModel**
- **verificationCodeModel**

#### Routers:

- **orderRouter**
- **productRouter**
- **userRouter**

App is fully tested.
