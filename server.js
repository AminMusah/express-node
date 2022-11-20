const express = require("express");
const app = express();
const authRoute = require("./routes/auth");
const usersRoute = require("./routes/users");
const sendMailRoute = require("./routes/sendMail");
require("dotenv").config();
require("./db/connect");

//For accepting post from data
app.use(express.json());


//routes
app.use("/", authRoute);
app.use("/", usersRoute);
app.use("/", sendMailRoute);

const PORT = 7000;

app.listen(PORT, () => {
  console.log(`Serving on port ${PORT}`);
});
