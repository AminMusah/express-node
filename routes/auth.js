const router = require("express").Router();
const bcrypt = require("bcryptjs");
const User = require("../model/User");
const PasswordReset = require("../model/PasswordReset");
const { registerValidation, loginValidation } = require("../validation");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const transporter = require("../nodemailer");

//route to register
router.post("/register", async (req, res) => {
  try {
    //validate data
    const { error } = registerValidation(req.body);
    if (error) {
      return res.status(400).send({ message: error.details[0].message });
    }

    //checking if user already exists in the database
    const emailExist = await User.findOne({ email: req.body.email });
    if (emailExist) {
      return res.status(400).send({ message: "User Already exist" });
    }

    //hash password
    let salt = await bcrypt.genSalt(10);
    let hashedPassword = await bcrypt.hash(req.body.password, salt);

    //Create new user
    const user = new User({
      name: req.body.name,
      email: req.body.email,
      password: hashedPassword,
    });

    const saveUser = await user.save();
    res.send(saveUser);
  } catch (error) {
    res.status(400).send(error);
  }
});

//route to login
router.post("/login", async (req, res) => {
  try {
    //validate data
    const { error } = loginValidation(req.body);
    if (error) {
      return res.status(400).send({ message: error.details[0].message });
    }

    //checking if user already exists in the database
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(400).send({ message: "Invalid Email or Password" });
    }

    const validPassword = await bcrypt.compare(
      req.body.password,
      user.password
    );
    if (!validPassword) {
      return res.status(400).send({ message: "Invalid Email or Password" });
    }

    const token = jwt.sign({ _id: user._id }, process.env.TOKEN_SECRET);
    res.header("auth-token", token);
    console.log(user);
    res.send({ user, token });
  } catch (error) {
    res.status(400).send(error);
  }
});

//Password Reset
router.post("/requestPasswordReset", (req, res) => {
  const { email, redirectUrl } = req.body;

  //check if email exist
  User.find({ email })
    .then((data) => {
      if (data.length) {
        //user exists
        if (!data[0]) {
          res.json({
            status: "Failed",
            message: "No account with email provided exists",
          });
        } else {
          sendResetEmail(data[0], redirectUrl, res);
        }
      } else {
        res.json({
          status: "Failed",
          message: "No account with email provided exists",
        });
      }
    })
    .catch((error) => {
      console.log(error);
      res.json({
        status: "Failed",
        message: "An error occured while checking for existing user",
      });
    });
});

//send password reset Email
const sendResetEmail = ({ _id, email }, redirectUrl, res) => {
  const resetString = uuidv4() + _id;

  //Clear All existing reset records
  PasswordReset.deleteMany({ userId: _id })
    .then((result) => {
      //Reset records deleted succesfully
      //Now we send the email

      //mail options
      const mailOptions = {
        from: process.env.AUTH_EMAIL,
        to: email,
        subject: "Password Reset",
        html: `<p>We heard that you lost the password.</p> <p>Don't worry, use the link below to reset it.</p><p>This link <b>expires in 60 munites</b>.<p>Press <a href=${
          redirectUrl + "/" + _id + "/" + resetString
        }>here<a/> to proceed</p>`,
      };

      //hash the reset string
      const saltRounds = 10;
      bcrypt
        .hash(resetString, saltRounds)
        .then((hashedResetString) => {
          //set values in password reset collection
          const newPasswordReset = new PasswordReset({
            userId: _id,
            resetString: hashedResetString,
            createdAt: Date.now(),
            expiresAt: Date.now() + 3600000,
          });

          newPasswordReset
            .save()
            .then(() => {
              transporter
                .sendMail(mailOptions)
                .then(() => {
                  //reset email sent and password reset record saved
                  res.json({
                    status: "PENDING",
                    message: "Password reset email sent",
                  });
                })
                .catch((error) => {
                  console.log(error);

                  res.json({
                    status: "Failed",
                    message: "Password reset email failed",
                  });
                });
            })
            .catch((error) => {
              console.log(error);

              res.json({
                status: "Failed",
                message: "Couldn't save password reset data",
              });
            });
        })
        .catch((error) => {
          console.log(error);

          res.json({
            status: "Failed",
            message: "An Error occured while hashing the password reset data",
          });
        });
    })
    .catch((error) => {
      console.log(error);

      res.json({
        status: "Failed",
        message: "Clearing existing password reset failed",
      });
    });
};

//Actually reset the password
router.post("/resetPassword", (req, res) => {
  let { userId, resetString, newPassword } = req.body;

  PasswordReset.find({ userId })
    .then((result) => {
      if (result.length > 0) {
        //Password reset record exist so we proceed
        const { expiresAt } = result[0];
        const hashedResetString = result[0].resetString;

        //checking for expired reset string
        if (expiresAt < Date.now()) {
          PasswordReset.deleteOne({ userId })
            .then(() => {
              //Reset record deleted succesfully
              res.json({
                status: "Failed",
                message: "Password reset link has expired.",
              });
            })
            .catch((error) => {
              //deletion failed
              console.log(error);
              res.json({
                status: "FAILED",
                message: "Clearing password reset record failed.",
              });
            });
        } else {
          //valid reset record exists so we validate the reset string
          //First compare the hashed reset string

          bcrypt
            .compare(resetString, hashedResetString)
            .then((result) => {
              if (result) {
                //strings matched
                //hash password again

                const saltRounds = 10;
                bcrypt
                  .hash(newPassword, saltRounds)
                  .then((hashedNewpassword) => {
                    //update user password
                    User.updateOne(
                      { _id: userId },
                      { password: hashedNewpassword }
                    )
                      .then(()=> {
                        //update complete. Now delete reset record
                        PasswordReset.deleteOne({userId})
                          .then(()=>{
                            //both user record and reset record updated
                            res.json({
                              status: "SUCCESS",
                              message:
                                "Password has been reset successfully.",
                            });
                          }).catch(error => {
                            console.log(error);
                            res.json({
                              status: "FAILED",
                              message:
                                "An error occured while finalizing password reset.",
                            });
                          })
                      })
                      .catch((error) => {
                        console.log(error);
                        res.json({
                          status: "FAILED",
                          message:
                            "Updating user password failed.",
                        });
                      });
                  })
                  .catch((error) => {
                    console.log(error);
                    res.json({
                      status: "FAILED",
                      message: "An error occured while hashing new password.",
                    });
                  });
              } else {
                //Existing record but incorrect reset string passed
                res.json({
                  status: "FAILED",
                  message: "Invalid password reset details passed.",
                });
              }
            })
            .catch((error) => {
              console.log(error);
              res.json({
                status: "FAILED",
                message: "Comparing password reset string failed.",
              });
            });
        }
      } else {
        //Password reset request doesn't exist
        res.json({
          status: "Failed",
          message: "Password reset request not found.",
        });
      }
    })
    .catch((error) => {
      console.log(error);

      res.json({
        status: "Failed",
        message: "Checking for existing password reset record failed.",
      });
    });
});

module.exports = router;
