const transporter = require("../nodemailer");
const router = require("express").Router();
require("dotenv").config();

router.post("/sendmail", (req, res) => {
  const { to, subject, message } = req.body;

  const mailOptions = {
    from: process.env.AUTH_EMAIL,
    to: to,
    subject: subject,
    text: message,
  };

  transporter
    .sendMail(mailOptions)
    .then(() => {
      //succesful message
      res.json({
        status: "SUCCESS",
        message: "Message sent successfully.",
      });
    })
    .catch((error) => {
      //An error occured
      console.log(error);
      res.json({ status: "FAILED", message: "An error occured!" });
    });
});

module.exports = router;